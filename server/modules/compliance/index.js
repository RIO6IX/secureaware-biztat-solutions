// Compliance dashboard, reporting and reminders (Member 4, shaeed028), ported onto the shared
// foundation. The original branch used fixed in-memory figures; this version calculates every
// number from the policy and training modules' live data, behind the session, CSRF and role checks.
import { createStore as createPolicyStore } from "../policy/store.js";
import { createStore as createTrainingStore } from "../training/store.js";

export const prefix = "/api/compliance/";

const ADMIN_ROLES = ["Security/HR Admin", "System Admin"];
const VIEW_ROLES = ["Department Manager", ...ADMIN_ROLES];
const PERIODS = [30, 60, 90];
const REPORT_TYPES = {
  executive: "Executive Compliance Summary",
  policy: "Policy Acknowledgement Report",
  training: "Training and Quiz Report",
  risk: "Employee Risk Review"
};
const DAY = 86_400_000;

let foundation;
let stores = null;
const lastReminder = new Map();

export function init(shared) {
  foundation = shared;
}

// The policy and training tables are created by their own modules, which load after this
// one, so the stores are created on first use.
function getStores() {
  stores ||= { policy: createPolicyStore(foundation.db), training: createTrainingStore(foundation.db) };
  return stores;
}

export function percent(done, total) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

// Same thresholds as the original dashboard.
export function riskFor({ policyRate, trainingRate, quizScore }) {
  const quiz = quizScore ?? 100;
  if (policyRate < 80 || trainingRate < 70 || quiz < 70) return "high";
  if (policyRate < 100 || trainingRate < 100 || quiz < 80) return "medium";
  return "low";
}

function severity(daysOverdue) {
  return daysOverdue > 7 ? "high" : daysOverdue > 3 ? "medium" : "low";
}

function daysSince(date) {
  return Math.max(1, Math.ceil((Date.now() - new Date(`${date}T23:59:59Z`).getTime()) / DAY));
}

// One row per active user with their policy and training position.
function userRows(department) {
  const { policy, training } = getStores();
  training.expireStaleAttempts();
  return policy.q.activeUsers.all()
    .filter((user) => !department || user.department === department)
    .map((user) => {
      const policies = policy.assignedStates(user).map(({ policy: item, state }) => ({ kind: "policy", slug: item.slug, title: `${item.title} v${state.versionLabel}`, status: state.status, dueDate: state.dueDate }));
      const courses = training.assignedCourseStates(user).map(({ course, state }) => ({ kind: "training", slug: course.slug, title: course.title, status: state.status, dueDate: state.dueDate, bestScore: state.bestScore, attempts: state.attemptsUsed }));
      const policiesDone = policies.filter((item) => ["complete", "exempt"].includes(item.status)).length;
      const coursesPassed = courses.filter((item) => item.status === "passed").length;
      const scored = courses.filter((item) => item.bestScore !== null);
      const quizScore = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.bestScore, 0) / scored.length) : null;
      const row = {
        user: { id: user.id, displayName: user.display_name, role: user.role, department: user.department },
        policies,
        courses,
        policiesAssigned: policies.length,
        policiesAcknowledged: policiesDone,
        trainingAssigned: courses.length,
        trainingCompleted: coursesPassed,
        policyRate: policies.length ? percent(policiesDone, policies.length) : 100,
        trainingRate: courses.length ? percent(coursesPassed, courses.length) : 100,
        quizScore
      };
      row.risk = riskFor(row);
      return row;
    });
}

function quizPassRate(userIds) {
  if (!userIds.length) return 0;
  const marks = userIds.map(() => "?").join(",");
  const row = foundation.db.prepare(`SELECT COUNT(*) AS total, SUM(passed) AS passed FROM quiz_attempts WHERE status = 'submitted' AND user_id IN (${marks})`).get(...userIds);
  return percent(row.passed || 0, row.total || 0);
}

function rates(rows) {
  const policiesAssigned = rows.reduce((sum, row) => sum + row.policiesAssigned, 0);
  const policiesAcknowledged = rows.reduce((sum, row) => sum + row.policiesAcknowledged, 0);
  const trainingAssigned = rows.reduce((sum, row) => sum + row.trainingAssigned, 0);
  const trainingCompleted = rows.reduce((sum, row) => sum + row.trainingCompleted, 0);
  const policyRate = percent(policiesAcknowledged, policiesAssigned);
  const trainingRate = percent(trainingCompleted, trainingAssigned);
  const quizRate = quizPassRate(rows.map((row) => row.user.id));
  return { policyRate, trainingRate, quizPassRate: quizRate, overallRate: Math.round((policyRate + trainingRate + quizRate) / 3) };
}

// Weekly trend: the share of currently assigned items that had been completed by each date.
function trend(rows, period) {
  const db = foundation.db;
  const items = rows.flatMap((row) => [
    ...row.policies.map((item) => ({ ...item, userId: row.user.id })),
    ...row.courses.map((item) => ({ ...item, userId: row.user.id }))
  ]);
  const points = 7;
  return Array.from({ length: points }, (_, index) => {
    const at = new Date(Date.now() - ((points - 1 - index) * period * DAY) / (points - 1)).toISOString();
    let done = 0;
    for (const item of items) {
      if (item.kind === "policy") {
        const ack = db.prepare(`SELECT 1 FROM policy_acknowledgements a JOIN policy_versions v ON v.id = a.version_id JOIN policies p ON p.id = v.policy_id
          WHERE a.user_id = ? AND p.slug = ? AND a.acknowledged_at <= ? LIMIT 1`).get(item.userId, item.slug, at);
        if (ack && ["complete", "exempt"].includes(item.status)) done += 1;
      } else {
        const pass = db.prepare(`SELECT 1 FROM quiz_attempts a JOIN training_courses c ON c.id = a.course_id
          WHERE a.user_id = ? AND c.slug = ? AND a.passed = 1 AND a.submitted_at <= ? LIMIT 1`).get(item.userId, item.slug, at);
        if (pass) done += 1;
      }
    }
    return { label: new Date(at).toISOString().slice(5, 10), value: percent(done, items.length) };
  });
}

function scopeDepartment(user, requested) {
  if (user.role === "Department Manager") return user.department;
  return requested && requested !== "All" ? requested : null;
}

function departments() {
  return foundation.db.prepare("SELECT DISTINCT department FROM users WHERE active = 1 ORDER BY department").all().map((row) => row.department);
}

function dashboard(user, requestedDepartment, period) {
  const department = scopeDepartment(user, requestedDepartment);
  const rows = userRows(department);
  const summary = rates(rows);
  const overdue = rows.flatMap((row) => [...row.policies, ...row.courses]
    .filter((item) => item.status === "overdue")
    .map((item) => ({ ...item, category: item.kind === "policy" ? "Policy" : "Training", user: row.user, daysOverdue: daysSince(item.dueDate), severity: severity(daysSince(item.dueDate)) })))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
  const risks = { low: 0, medium: 0, high: 0 };
  rows.forEach((row) => { risks[row.risk] += 1; });
  const byDepartment = [...new Set(rows.map((row) => row.user.department))].sort().map((name) => {
    const members = rows.filter((row) => row.user.department === name);
    return { name, employees: members.length, ...rates(members) };
  });
  const isAdmin = foundation.hasRole(user, ADMIN_ROLES);
  return {
    filters: { department: department || "All", period, departments: isAdmin ? ["All", ...departments()] : [user.department], canChooseDepartment: isAdmin },
    summary: { ...summary, overdueCount: overdue.length, highRiskCount: risks.high, employees: rows.length },
    trend: trend(rows, period),
    departments: byDepartment,
    risks,
    overdue: overdue.slice(0, 50),
    activity: isAdmin ? foundation.db.prepare(`SELECT ae.action, ae.target, ae.created_at, u.display_name FROM audit_events ae LEFT JOIN users u ON u.id = ae.actor_user_id
      WHERE ae.action LIKE 'POLICY_%' OR ae.action LIKE 'TRAINING_%' ORDER BY ae.id DESC LIMIT 8`).all()
      .map((row) => ({ action: row.action, target: row.target, actor: row.display_name || "system", createdAt: row.created_at })) : [],
    lastUpdated: new Date().toISOString()
  };
}

function reportRows(type, rows) {
  if (type === "executive") {
    return [...new Set(rows.map((row) => row.user.department))].sort().map((name) => {
      const members = rows.filter((row) => row.user.department === name);
      const r = rates(members);
      return { department: name, employees: members.length, policyCompliance: `${r.policyRate}%`, trainingCompletion: `${r.trainingRate}%`, quizPassRate: `${r.quizPassRate}%`, overallCompliance: `${r.overallRate}%` };
    });
  }
  if (type === "policy") {
    return rows.map((row) => ({ employee: row.user.displayName, department: row.user.department, assigned: row.policiesAssigned, acknowledged: row.policiesAcknowledged,
      compliance: `${row.policyRate}%`, status: row.policiesAcknowledged === row.policiesAssigned ? "Compliant" : "Action required" }));
  }
  if (type === "training") {
    return rows.map((row) => ({ employee: row.user.displayName, department: row.user.department, assigned: row.trainingAssigned, completed: row.trainingCompleted,
      quizScore: row.quizScore === null ? "—" : `${row.quizScore}%`, status: row.trainingCompleted === row.trainingAssigned ? "Completed" : "Action required" }));
  }
  return rows.map((row) => ({ employee: row.user.displayName, department: row.user.department, role: row.user.role, policyRate: `${row.policyRate}%`,
    trainingRate: `${row.trainingRate}%`, quizScore: row.quizScore === null ? "—" : `${row.quizScore}%`, risk: row.risk }));
}

function report(user, query) {
  const type = REPORT_TYPES[query.get("type")] ? query.get("type") : "executive";
  const department = scopeDepartment(user, query.get("department"));
  const rows = reportRows(type, userRows(department));
  return { title: REPORT_TYPES[type], type, department: department || "All", generatedAt: new Date().toISOString(), rows };
}

export async function handle(request, response, url, context) {
  const user = context.user;
  const path = url.pathname.slice(prefix.length - 1);
  const send = (status, body) => foundation.sendJson(response, status, body);
  const audit = (action, target) => foundation.audit(user.id, action, target, request);

  // Any signed-in user can mark their own notifications as read.
  if (path === "/notifications/read-all") {
    if (request.method !== "POST") return send(405, { message: "Method not allowed" });
    const changed = foundation.db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(new Date().toISOString(), user.id).changes;
    return send(200, { ok: true, changed });
  }
  if (!["/dashboard", "/reports", "/reports.csv", "/reminders"].includes(path)) return send(404, { message: "Not found" });
  if (!foundation.hasRole(user, VIEW_ROLES)) {
    audit("COMPLIANCE_ACCESS_DENIED", `${request.method} ${url.pathname}`);
    return send(403, { message: "You do not have permission for this action" });
  }
  const department = url.searchParams.get("department");
  if (department && department.length > 60) return send(400, { message: "department is too long" });

  if (path === "/dashboard" && request.method === "GET") {
    const period = PERIODS.includes(Number(url.searchParams.get("period"))) ? Number(url.searchParams.get("period")) : 30;
    return send(200, dashboard(user, department, period));
  }
  if (path === "/reports" && request.method === "GET") {
    const result = report(user, url.searchParams);
    audit("REPORT_VIEWED", `${result.title} (${result.department})`);
    return send(200, result);
  }
  if (path === "/reports.csv" && request.method === "GET") {
    const result = report(user, url.searchParams);
    audit("REPORT_EXPORTED", `${result.title} (${result.department}, ${result.rows.length} rows)`);
    const fields = result.rows.length ? Object.keys(result.rows[0]) : ["message"];
    return foundation.sendCsv(response, result.rows.length ? result.rows : [{ message: "No data" }], fields, `secureaware-${result.type}-report.csv`);
  }
  if (path === "/reminders" && request.method === "POST") {
    const body = await foundation.readJson(request, 4096);
    const userId = Number(body.userId);
    const kind = body.kind;
    const slug = typeof body.slug === "string" ? body.slug : "";
    if (!Number.isInteger(userId) || userId < 1 || !["policy", "training"].includes(kind) || !/^[a-z0-9-]{1,80}$/.test(slug)) return send(400, { message: "userId, kind and slug are required" });
    const department = scopeDepartment(user, null);
    const row = userRows(department).find((entry) => entry.user.id === userId);
    if (!row || userId === user.id) return send(404, { message: "Team member not found" });
    const item = (kind === "policy" ? row.policies : row.courses).find((entry) => entry.slug === slug);
    if (!item) return send(400, { message: "That item is not assigned to this person" });
    if (["complete", "exempt", "passed"].includes(item.status)) return send(400, { message: "This item is already complete" });
    const key = `${user.id}:${userId}:${kind}:${slug}`;
    if (Date.now() - (lastReminder.get(key) || 0) < 10 * 60_000) return send(429, { message: "A reminder was sent recently. Please wait before sending another." });
    lastReminder.set(key, Date.now());
    foundation.notify(userId, "reminder", `Reminder: ${item.title}`, `${user.display_name} has reminded you to complete this ${kind === "policy" ? "policy acknowledgement" : "training"}${item.dueDate ? ` (due ${item.dueDate})` : ""}.`,
      kind === "policy" ? `#/policies/${slug}` : `#/training/${slug}`);
    audit("REMINDER_SENT", `${kind}:${slug} -> user:${userId}`);
    return send(201, { ok: true });
  }
  return send(405, { message: "Method not allowed" });
}
