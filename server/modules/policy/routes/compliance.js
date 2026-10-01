import { ADMIN_ROLES, MANAGER_ROLES } from "../schema.js";
import { addDays, today } from "../store.js";
import { fail, id as idValue, queryText, slug as slugValue } from "../validate.js";
import { RECEIPT_SELECT } from "./employee.js";

const STATUS_KEYS = ["complete", "pending", "overdue", "needs_reack", "exempt"];

export function emptyCounts() {
  return Object.fromEntries(STATUS_KEYS.map((key) => [key, 0]));
}

export function rate(counts) {
  const total = STATUS_KEYS.reduce((sum, key) => sum + counts[key], 0);
  return total ? Math.round(((counts.complete + counts.exempt) / total) * 100) : null;
}

export default function registerCompliance({ route, store, foundation }) {
  const db = foundation.db;
  const admin = { roles: ADMIN_ROLES };
  const isAdmin = (user) => foundation.hasRole(user, ADMIN_ROLES);
  // One reminder per sender, employee and policy every ten minutes.
  const lastReminder = new Map();

  // A manager is pinned to their own department; admins may see all or filter.
  function scopeDepartment(user, requested) {
    if (user.role === "Department Manager") return user.department;
    return requested || null;
  }

  function canSee(actor, member) {
    if (!member) return false;
    if (isAdmin(actor)) return true;
    return actor.role === "Department Manager" && actor.department === member.department;
  }

  // Every assigned (user, policy) pair with its status.
  function complianceRows(department = null) {
    return store.q.activeUsers.all()
      .filter((user) => !department || user.department === department)
      .flatMap((user) => store.assignedStates(user).map(({ policy, state }) => ({ user, policy, state })));
  }

  route("GET", "/admin/compliance", (ctx) => {
    const department = queryText(ctx.query, "department");
    const rows = complianceRows(department);
    const byPolicy = new Map();
    const byDepartment = new Map();
    for (const row of rows) {
      const policyEntry = byPolicy.get(row.policy.id) || { slug: row.policy.slug, title: row.policy.title, versionLabel: row.state.versionLabel, counts: emptyCounts() };
      policyEntry.counts[row.state.status] += 1;
      byPolicy.set(row.policy.id, policyEntry);
      const departmentEntry = byDepartment.get(row.user.department) || { department: row.user.department, counts: emptyCounts() };
      departmentEntry.counts[row.state.status] += 1;
      byDepartment.set(row.user.department, departmentEntry);
    }
    const totals = emptyCounts();
    rows.forEach((row) => { totals[row.state.status] += 1; });
    return ctx.send(200, {
      department: department || "All departments",
      departments: [...new Set(store.q.activeUsers.all().map((user) => user.department))].sort(),
      totals: { ...totals, rate: rate(totals) },
      policies: [...byPolicy.values()].map((entry) => ({ ...entry, rate: rate(entry.counts) })),
      byDepartment: [...byDepartment.values()].map((entry) => ({ ...entry, rate: rate(entry.counts) })).sort((a, b) => a.department.localeCompare(b.department)),
      rows: rows.map((row) => ({
        user: { id: row.user.id, displayName: row.user.display_name, department: row.user.department, role: row.user.role },
        policy: { slug: row.policy.slug, title: row.policy.title },
        versionLabel: row.state.versionLabel,
        status: row.state.status,
        dueDate: row.state.dueDate,
        acknowledgedAt: row.state.acknowledgement?.acknowledgedAt ?? null
      }))
    });
  }, admin);

  function evidenceRows(query) {
    const policy = queryText(query, "policy");
    const department = queryText(query, "department");
    return db.prepare(`${RECEIPT_SELECT} WHERE (? IS NULL OR p.slug = ?) AND (? IS NULL OR u.department = ?) ORDER BY a.acknowledged_at DESC LIMIT 2000`)
      .all(policy, policy, department, department);
  }

  route("GET", "/admin/evidence", (ctx) => ctx.send(200, {
    evidence: evidenceRows(ctx.query).map((row) => ({
      receiptCode: row.receipt_code, employee: row.display_name, department: row.department, policy: { slug: row.slug, title: row.title },
      versionLabel: row.version_label, acknowledgedAt: row.acknowledged_at, contentSha256: row.content_sha256, browser: row.user_agent_family
    }))
  }), admin);

  route("GET", "/admin/evidence.csv", (ctx) => {
    const rows = evidenceRows(ctx.query).map((row) => ({
      receipt_code: row.receipt_code, employee: row.display_name, department: row.department, policy: row.title, version: row.version_label,
      acknowledged_at: row.acknowledged_at, statement: row.statement_text, typed_full_name: row.typed_full_name, content_sha256: row.content_sha256, browser: row.user_agent_family
    }));
    ctx.audit("POLICY_EVIDENCE_EXPORTED", `${rows.length} rows`);
    return foundation.sendCsv(ctx.response, rows, ["receipt_code", "employee", "department", "policy", "version", "acknowledged_at", "statement", "typed_full_name", "content_sha256", "browser"], "policy-acknowledgement-evidence.csv");
  }, admin);

  // Review calendar (ISO/IEC 27001 A 5.1: reviewed at planned intervals).
  route("GET", "/admin/calendar", (ctx) => {
    const horizon = addDays(30);
    const rows = store.q.liveCurrent.all().map((policy) => {
      const version = store.q.versionById.get(policy.current_version_id);
      return {
        slug: policy.slug, title: policy.title, versionLabel: version.version_label, nextReviewDate: version.next_review_date,
        owner: store.q.userById.get(policy.owner_user_id)?.display_name || "—",
        state: !version.next_review_date ? "unscheduled" : version.next_review_date < today() ? "overdue" : version.next_review_date <= horizon ? "due_soon" : "scheduled"
      };
    }).sort((a, b) => String(a.nextReviewDate).localeCompare(String(b.nextReviewDate)));
    return ctx.send(200, { today: today(), horizon, policies: rows });
  }, admin);

  // Manager view: own department only (admins can choose).
  route("GET", "/team", (ctx) => {
    const department = scopeDepartment(ctx.user, queryText(ctx.query, "department"));
    const members = store.q.activeUsers.all().filter((member) => (!department || member.department === department) && canSee(ctx.user, member));
    const memberRows = members.map((member) => {
      const policies = store.assignedStates(member).map(({ policy, state }) => ({ slug: policy.slug, title: policy.title, versionLabel: state.versionLabel, status: state.status, dueDate: state.dueDate }));
      const counts = emptyCounts();
      policies.forEach((item) => { counts[item.status] += 1; });
      return { user: { id: member.id, displayName: member.display_name, role: member.role, department: member.department }, policies, counts };
    });
    const totals = emptyCounts();
    memberRows.forEach((row) => STATUS_KEYS.forEach((key) => { totals[key] += row.counts[key]; }));
    return ctx.send(200, {
      department: department || "All departments",
      canChooseDepartment: isAdmin(ctx.user),
      departments: [...new Set(store.q.activeUsers.all().map((member) => member.department))].sort(),
      totals: { ...totals, rate: rate(totals) },
      members: memberRows
    });
  }, { roles: MANAGER_ROLES });

  // Another department's member looks exactly like a missing one (404).
  route("GET", "/team/users/:id", (ctx) => {
    const member = store.q.userById.get(idValue(ctx.params.id, "user id"));
    if (!canSee(ctx.user, member)) return ctx.send(404, { message: "Team member not found" });
    return ctx.send(200, {
      user: { id: member.id, displayName: member.display_name, department: member.department, role: member.role },
      policies: store.assignedStates(member).map(({ policy, state }) => ({ slug: policy.slug, title: policy.title, ...state }))
    });
  }, { roles: MANAGER_ROLES });

  route("POST", "/team/reminders", async (ctx) => {
    const body = await ctx.body();
    const member = store.q.userById.get(idValue(body.targetUserId, "targetUserId"));
    if (!canSee(ctx.user, member) || member.id === ctx.user.id) return ctx.send(404, { message: "Team member not found" });
    const policy = store.q.policyBySlug.get(slugValue(body.policySlug, "policySlug"));
    const entry = policy ? store.assignedStates(member).find((item) => item.policy.id === policy.id) : null;
    if (!entry) fail("This policy is not assigned to that person");
    if (["complete", "exempt"].includes(entry.state.status)) fail("This person has already acknowledged the current version");
    const key = `${ctx.user.id}:${member.id}:${policy.id}`;
    if (Date.now() - (lastReminder.get(key) || 0) < 10 * 60_000) return ctx.send(429, { message: "A reminder was sent recently. Please wait before sending another." });
    lastReminder.set(key, Date.now());
    foundation.notify(member.id, "reminder", `Reminder: acknowledge ${policy.title} v${entry.state.versionLabel}`,
      `${ctx.user.display_name} has reminded you to read and acknowledge this policy${entry.state.dueDate ? ` (due ${entry.state.dueDate})` : ""}.`, `#/policies/${policy.slug}`);
    ctx.audit("POLICY_REMINDER_SENT", `${policy.slug} -> user:${member.id}`);
    return ctx.send(201, { ok: true });
  }, { roles: MANAGER_ROLES });
}
