import { ADMIN_ROLES, ROLES } from "../schema.js";
import { addDays } from "../store.js";
import { fail, id as idValue, int, oneOf, slug as slugValue, text } from "../validate.js";

export default function registerAssign({ route, store, foundation }) {
  const db = foundation.db;
  const admin = { roles: ADMIN_ROLES };
  const departments = () => db.prepare("SELECT DISTINCT department FROM users WHERE active = 1 ORDER BY department").all().map((row) => row.department);

  function resolveTarget(targetType, rawValue) {
    oneOf(targetType, "Target type", ["department", "role", "user"]);
    const value = text(rawValue, "Target", { max: 80 });
    if (targetType === "department") {
      if (!departments().includes(value)) fail("Choose an existing department");
      return { stored: value, label: value, users: store.q.activeUsers.all().filter((user) => user.department === value) };
    }
    if (targetType === "role") {
      oneOf(value, "Role", ROLES);
      return { stored: value, label: value, users: store.q.activeUsers.all().filter((user) => user.role === value) };
    }
    const user = db.prepare("SELECT id, username, display_name, role, department FROM users WHERE active = 1 AND username = ?").get(value);
    if (!user) fail("No active user has that username");
    return { stored: String(user.id), label: user.display_name, users: [user] };
  }

  // Assignments point at the policy; people always acknowledge its current published version.
  // A policy with no published version cannot be assigned (checked here, not just in the form).
  function assignablePolicy(value) {
    const policy = store.q.policyBySlug.get(slugValue(value, "Policy"));
    if (!policy) fail("Policy not found");
    if (!store.currentVersion(policy)) fail("Only policies with a published version can be assigned");
    return policy;
  }

  const recipientView = (user) => ({ displayName: user.display_name, role: user.role, department: user.department });

  route("GET", "/admin/assignments", (ctx) => {
    const rows = db.prepare(`SELECT a.*, p.slug, p.title, u.display_name AS assigned_by_name, tu.display_name AS target_user_name
      FROM policy_assignments a JOIN policies p ON p.id = a.policy_id
      LEFT JOIN users u ON u.id = a.assigned_by
      LEFT JOIN users tu ON a.target_type = 'user' AND tu.id = CAST(a.target_value AS INTEGER)
      ORDER BY a.created_at DESC LIMIT 500`).all();
    return ctx.send(200, {
      assignments: rows.map((row) => ({
        id: row.id,
        policy: { slug: row.slug, title: row.title },
        targetType: row.target_type,
        target: row.target_type === "user" ? row.target_user_name || "Former user" : row.target_value,
        dueInDays: row.due_in_days,
        dueDate: row.due_date,
        assignedBy: row.assigned_by_name || "—",
        createdAt: row.created_at
      })),
      policies: store.q.liveCurrent.all().map((policy) => ({ slug: policy.slug, title: policy.title })),
      departments: departments(),
      roles: ROLES
    });
  }, admin);

  route("POST", "/admin/assignments/preview", async (ctx) => {
    const body = await ctx.body();
    const policy = assignablePolicy(body.policySlug);
    const target = resolveTarget(body.targetType, body.targetValue);
    const already = new Set(store.recipientsOf(policy).map((user) => user.id));
    return ctx.send(200, {
      policy: { slug: policy.slug, title: policy.title },
      target: target.label,
      recipients: target.users.map((user) => ({ ...recipientView(user), alreadyAssigned: already.has(user.id) }))
    });
  }, admin);

  route("POST", "/admin/assignments", async (ctx) => {
    const body = await ctx.body();
    const policy = assignablePolicy(body.policySlug);
    const target = resolveTarget(body.targetType, body.targetValue);
    const dueInDays = int(body.dueInDays ?? 14, "Due in days", 1, 365);
    const dueDate = addDays(dueInDays);
    db.prepare(`INSERT INTO policy_assignments (policy_id,target_type,target_value,due_in_days,due_date,assigned_by,created_at) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(policy_id,target_type,target_value) DO UPDATE SET due_in_days = excluded.due_in_days, due_date = excluded.due_date, assigned_by = excluded.assigned_by`)
      .run(policy.id, body.targetType, target.stored, dueInDays, dueDate, ctx.user.id, new Date().toISOString());
    for (const user of target.users) {
      foundation.notify(user.id, "policy", `Policy to acknowledge: ${policy.title}`, `Please read and acknowledge this policy by ${dueDate}.`, `#/policies/${policy.slug}`);
    }
    ctx.audit("POLICY_ASSIGNED", `${policy.slug} -> ${body.targetType}:${target.label} (${target.users.length} recipients, due ${dueDate})`);
    return ctx.send(201, { recipients: target.users.length, dueDate });
  }, admin);

  route("DELETE", "/admin/assignments/:id", (ctx) => {
    const assignment = db.prepare("SELECT a.*, p.slug FROM policy_assignments a JOIN policies p ON p.id = a.policy_id WHERE a.id = ?").get(idValue(ctx.params.id, "assignment id"));
    if (!assignment) return ctx.send(404, { message: "Assignment not found" });
    db.prepare("DELETE FROM policy_assignments WHERE id = ?").run(assignment.id);
    ctx.audit("POLICY_ASSIGNMENT_REMOVED", `${assignment.slug} -> ${assignment.target_type}:${assignment.target_value}`);
    return ctx.send(200, { ok: true });
  }, admin);
}
