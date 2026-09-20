const users = [
  { id: 1, username: "policy.admin", name: "Policy Administrator", role: "Security/HR Administrator", department: "Information Security" },
  { id: 2, username: "employee.demo", name: "Employee Demo", role: "Employee", department: "Finance" },
  { id: 3, username: "manager.demo", name: "Manager Demo", role: "Department Manager", department: "Finance" }
];

let nextPolicyId = 4;
let nextAssignmentId = 4;
let nextAcknowledgementId = 3;

const policies = [
  {
    id: 1,
    title: "Acceptable Use Policy",
    category: "Information Security",
    version: "1.0",
    owner: "Information Security",
    status: "published",
    effectiveDate: "2026-09-01",
    summary: "Defines approved use of Biztat Solutions systems, internet, email and information assets.",
    content: "Employees must use company systems for approved business purposes, protect credentials and report suspected misuse."
  },
  {
    id: 2,
    title: "Password and MFA Policy",
    category: "Access Control",
    version: "1.1",
    owner: "Information Security",
    status: "published",
    effectiveDate: "2026-09-05",
    summary: "Sets password, passphrase and multi-factor authentication requirements.",
    content: "Passwords must be unique, protected and not shared. MFA must be enabled for approved business systems."
  },
  {
    id: 3,
    title: "Remote Work Security Policy",
    category: "Remote Work",
    version: "0.9",
    owner: "Human Resources",
    status: "draft",
    effectiveDate: "",
    summary: "Draft policy for secure remote work and device handling.",
    content: "Remote access must use approved devices, secure networks and company authorization."
  }
];

const assignments = [
  { id: 1, policyId: 1, targetType: "role", targetValue: "Employee", dueDate: "2026-10-01", status: "assigned" },
  { id: 2, policyId: 2, targetType: "department", targetValue: "Finance", dueDate: "2026-10-10", status: "assigned" },
  { id: 3, policyId: 1, targetType: "user", targetValue: "employee.demo", dueDate: "2026-09-30", status: "assigned" }
];

const acknowledgements = [
  { id: 1, policyId: 1, policyVersion: "1.0", userId: 2, acknowledgedAt: "2026-09-18T08:20:00.000Z", statement: "I have read and understood this policy." },
  { id: 2, policyId: 2, policyVersion: "1.1", userId: 2, acknowledgedAt: "2026-09-19T10:45:00.000Z", statement: "I agree to follow this policy." }
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/styles.css") return text(styles(), "text/css; charset=utf-8");
    if (url.pathname === "/app.js") return text(appJs(), "text/javascript; charset=utf-8");
    if (url.pathname === "/api/health") return json({ ok: true });
    if (url.pathname.startsWith("/api/")) return handleApi(request, url);
    return text(html(), "text/html; charset=utf-8");
  }
};

async function handleApi(request, url) {
  if (request.method === "GET" && url.pathname === "/api/dashboard") return json(dashboard());
  if (request.method === "GET" && url.pathname === "/api/users") return json({ users });
  if (request.method === "GET" && url.pathname === "/api/policies") {
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    let rows = policies;
    if (status) rows = rows.filter((policy) => policy.status === status);
    if (category) rows = rows.filter((policy) => policy.category === category);
    return json({ policies: rows.map(withPolicyStats) });
  }
  if (request.method === "POST" && url.pathname === "/api/policies") {
    const body = await readJson(request);
    if (!body.title || !body.content) return json({ message: "Title and content are required." }, 400);
    const policy = {
      id: nextPolicyId++,
      title: String(body.title).trim(),
      category: String(body.category || "Information Security").trim(),
      version: String(body.version || "1.0").trim(),
      owner: String(body.owner || "Information Security").trim(),
      status: body.status === "published" ? "published" : "draft",
      effectiveDate: String(body.effectiveDate || ""),
      summary: String(body.summary || "").trim(),
      content: String(body.content).trim()
    };
    policies.push(policy);
    return json({ policy: withPolicyStats(policy) }, 201);
  }
  const policyMatch = url.pathname.match(/^\/api\/policies\/(\d+)$/);
  if (request.method === "PATCH" && policyMatch) {
    const policy = policies.find((item) => item.id === Number(policyMatch[1]));
    if (!policy) return json({ message: "Policy not found." }, 404);
    Object.assign(policy, pick(await readJson(request), ["title", "category", "version", "owner", "effectiveDate", "summary", "content"]));
    return json({ policy: withPolicyStats(policy) });
  }
  const actionMatch = url.pathname.match(/^\/api\/policies\/(\d+)\/(publish|archive)$/);
  if (request.method === "POST" && actionMatch) {
    const policy = policies.find((item) => item.id === Number(actionMatch[1]));
    if (!policy) return json({ message: "Policy not found." }, 404);
    policy.status = actionMatch[2] === "publish" ? "published" : "archived";
    if (policy.status === "published" && !policy.effectiveDate) policy.effectiveDate = new Date().toISOString().slice(0, 10);
    return json({ policy: withPolicyStats(policy) });
  }
  if (request.method === "GET" && url.pathname === "/api/assignments") return json({ assignments: assignments.map(withPolicy) });
  if (request.method === "POST" && url.pathname === "/api/assignments") {
    const body = await readJson(request);
    if (!policies.some((policy) => policy.id === Number(body.policyId))) return json({ message: "Invalid policy." }, 400);
    const assignment = {
      id: nextAssignmentId++,
      policyId: Number(body.policyId),
      targetType: ["role", "department", "user"].includes(body.targetType) ? body.targetType : "role",
      targetValue: String(body.targetValue || "Employee").trim(),
      dueDate: String(body.dueDate || ""),
      status: "assigned"
    };
    assignments.push(assignment);
    return json({ assignment: withPolicy(assignment) }, 201);
  }
  if (request.method === "GET" && url.pathname === "/api/acknowledgements") return json({ acknowledgements: acknowledgements.map(withAcknowledgementDetails) });
  const ackMatch = url.pathname.match(/^\/api\/policies\/(\d+)\/acknowledge$/);
  if (request.method === "POST" && ackMatch) {
    const policy = policies.find((item) => item.id === Number(ackMatch[1]));
    if (!policy || policy.status !== "published") return json({ message: "Only published policies can be acknowledged." }, 400);
    const body = await readJson(request);
    const user = users.find((item) => item.username === body.username) || users[1];
    if (!isAssignedTo(user, policy.id)) return json({ message: "Policy is not assigned to this user." }, 403);
    const existing = acknowledgements.find((item) => item.userId === user.id && item.policyId === policy.id && item.policyVersion === policy.version);
    if (existing) return json({ acknowledgement: withAcknowledgementDetails(existing) });
    const acknowledgement = {
      id: nextAcknowledgementId++,
      policyId: policy.id,
      policyVersion: policy.version,
      userId: user.id,
      acknowledgedAt: new Date().toISOString(),
      statement: String(body.statement || "I have read and understood this policy.")
    };
    acknowledgements.push(acknowledgement);
    return json({ acknowledgement: withAcknowledgementDetails(acknowledgement) }, 201);
  }
  if (request.method === "GET" && url.pathname === "/api/employee/policies") {
    const username = url.searchParams.get("username") || "employee.demo";
    const user = users.find((item) => item.username === username) || users[1];
    return json({ user, assignedPolicies: assignedPoliciesFor(user) });
  }
  return json({ message: "Not found" }, 404);
}

function dashboard() {
  const assigned = assignedPoliciesFor(users[1]);
  return {
    policies: policies.length,
    publishedPolicies: policies.filter((policy) => policy.status === "published").length,
    assignments: assignments.length,
    acknowledgements: acknowledgements.length,
    employeePending: assigned.filter((item) => !item.acknowledgement).length,
    overdueAssignments: assignments.filter((assignment) => assignment.dueDate && new Date(assignment.dueDate) < new Date()).length
  };
}

function assignedPoliciesFor(user) {
  return assignments
    .filter((assignment) => {
      if (assignment.targetType === "role") return assignment.targetValue === user.role;
      if (assignment.targetType === "department") return assignment.targetValue === user.department;
      return assignment.targetValue === user.username;
    })
    .map((assignment) => {
      const policy = policies.find((item) => item.id === assignment.policyId);
      const acknowledgement = acknowledgements.find((item) => item.userId === user.id && item.policyId === policy.id && item.policyVersion === policy.version);
      return { ...assignment, policy: withPolicyStats(policy), acknowledgement: acknowledgement ? withAcknowledgementDetails(acknowledgement) : null };
    });
}

function isAssignedTo(user, policyId) {
  return assignments.some((assignment) => {
    if (assignment.policyId !== policyId) return false;
    if (assignment.targetType === "role") return assignment.targetValue === user.role;
    if (assignment.targetType === "department") return assignment.targetValue === user.department;
    return assignment.targetValue === user.username;
  });
}

function withPolicyStats(policy) {
  const policyAssignments = assignments.filter((assignment) => assignment.policyId === policy.id);
  const policyAcknowledgements = acknowledgements.filter((acknowledgement) => acknowledgement.policyId === policy.id && acknowledgement.policyVersion === policy.version);
  return { ...policy, assignmentCount: policyAssignments.length, acknowledgementCount: policyAcknowledgements.length };
}

function withPolicy(assignment) {
  return { ...assignment, policy: policies.find((policy) => policy.id === assignment.policyId) || null };
}

function withAcknowledgementDetails(acknowledgement) {
  const policy = policies.find((item) => item.id === acknowledgement.policyId);
  const user = users.find((item) => item.id === acknowledgement.userId);
  return { ...acknowledgement, policy, user };
}

function pick(body, keys) {
  return Object.fromEntries(keys.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

async function readJson(request) {
  return request.json().catch(() => ({}));
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer"
    }
  });
}

function text(body, contentType) {
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer"
    }
  });
}

function html() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SecureAware</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div id="app">Loading SecureAware...</div>
    <script src="/app.js"></script>
  </body>
</html>`;
}

function styles() {
  return `
:root { color: #172033; background: #f5f7fb; font-family: Inter, "Segoe UI", Arial, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; }
button, input, select, textarea { font: inherit; }
button, .button { border: 1px solid #9aa6b7; border-radius: 6px; background: #fff; color: #172033; min-height: 38px; padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; text-decoration: none; }
button.primary, .button.primary { background: #172033; border-color: #172033; color: #fff; font-weight: 700; }
input, select, textarea { width: 100%; border: 1px solid #aab3c1; border-radius: 6px; min-height: 40px; padding: 9px 12px; background: #fff; }
textarea { min-height: 110px; resize: vertical; }
label { display: grid; gap: 7px; font-weight: 700; }
.app-shell { min-height: 100vh; display: grid; grid-template-columns: 230px 1fr; }
.sidebar { background: #0f172a; color: #fff; padding: 22px 16px; }
.brand { display: flex; align-items: center; gap: 12px; font-size: 21px; font-weight: 800; margin-bottom: 26px; }
.brand-mark { width: 42px; height: 42px; border: 1px solid #dbe4ff; display: grid; place-items: center; }
.sidebar button { width: 100%; justify-content: flex-start; margin-bottom: 8px; background: transparent; color: #e5e7eb; border-color: transparent; }
.sidebar button.active { background: #1e293b; border-color: #334155; }
.main { min-width: 0; }
.topbar { min-height: 72px; background: #fff; border-bottom: 1px solid #d8dee9; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 28px; flex-wrap: wrap; }
.workspace { padding: 28px; }
.grid { display: grid; gap: 18px; }
.metrics { grid-template-columns: repeat(4, minmax(150px, 1fr)); }
.panel, .metric, .card { background: #fff; border: 1px solid #d8dee9; border-radius: 8px; padding: 18px; }
.panel { margin-bottom: 18px; overflow-x: auto; }
.panel h2, .card h3 { margin: 0 0 14px; }
.metric strong { display: block; font-size: 29px; }
.muted { color: #667085; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.form-grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(180px, 1fr)); }
.form-grid .wide { grid-column: 1 / -1; }
table { width: 100%; border-collapse: collapse; min-width: 720px; }
th, td { border-top: 1px solid #e4e8f0; padding: 12px; text-align: left; vertical-align: top; }
th { color: #667085; font-size: 14px; }
.status { display: inline-flex; border-radius: 999px; border: 1px solid #ccd5e1; padding: 4px 10px; font-size: 13px; font-weight: 700; text-transform: capitalize; }
.status.active, .status.published, .status.completed, .status.passed { color: #116132; background: #e9f7ee; }
.status.draft, .status.assigned, .status.pending { color: #8a5a00; background: #fff5d8; }
.status.archived, .status.failed, .status.overdue { color: #8a1f11; background: #ffe9e6; }
.notice { border-radius: 8px; padding: 12px 14px; background: #eef6ff; color: #15466f; font-weight: 700; }
@media (max-width: 820px) { .app-shell { grid-template-columns: 1fr; } .sidebar { position: sticky; top: 0; z-index: 3; } .metrics, .form-grid { grid-template-columns: 1fr; } }
`;
}

function appJs() {
  return `
let route = "dashboard";
const nav = [["dashboard", "Dashboard"], ["policies", "Policies"], ["assignments", "Assignments"], ["employee", "Employee View"], ["acknowledgements", "Acknowledgements"]];

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { "content-type": "application/json" }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function shell(content) {
  document.getElementById("app").innerHTML =
    '<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">SA</div><span>SecureAware</span></div>' +
    nav.map(([key, label]) => '<button data-route="' + key + '" class="' + (route === key ? "active" : "") + '">' + label + '</button>').join("") +
    '</aside><main class="main"><header class="topbar"><strong>Member 2 - Policy Management + Assignment + Acknowledgement</strong><span class="muted">Signed in as policy.admin</span></header><section class="workspace">' +
    content + '</section></main></div>';
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      route = button.dataset.route;
      render();
    });
  });
}

function panel(title, body) {
  return '<section class="panel"><h2>' + title + '</h2>' + body + '</section>';
}

function status(value) {
  return '<span class="status ' + value + '">' + value + '</span>';
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

async function dashboard() {
  const data = await api("/api/dashboard");
  shell(
    '<div class="grid metrics"><div class="metric"><strong>' + data.policies + '</strong><span>Total policies</span></div><div class="metric"><strong>' + data.publishedPolicies + '</strong><span>Published</span></div><div class="metric"><strong>' + data.assignments + '</strong><span>Assignments</span></div><div class="metric"><strong>' + data.employeePending + '</strong><span>Employee pending</span></div></div>' +
    panel("Demo Flow", '<p>Create or publish a policy, assign it to a role/department/user, then acknowledge it from the employee workspace.</p>')
  );
}

async function policiesPage() {
  const { policies } = await api("/api/policies");
  shell(
    panel("Create Policy", '<form id="policyForm" class="form-grid"><label>Title<input name="title" required></label><label>Category<input name="category" value="Information Security"></label><label>Version<input name="version" value="1.0"></label><label>Owner<input name="owner" value="Information Security"></label><label>Effective Date<input name="effectiveDate" type="date"></label><label>Status<select name="status"><option value="draft">Draft</option><option value="published">Published</option></select></label><label class="wide">Summary<textarea name="summary"></textarea></label><label class="wide">Policy Content<textarea name="content" required></textarea></label><div class="wide"><button class="primary">Create Policy</button></div></form>') +
    panel("Policies", '<table><thead><tr><th>Policy</th><th>Category</th><th>Version</th><th>Status</th><th>Assignments</th><th>Acknowledgements</th><th>Actions</th></tr></thead><tbody>' + policies.map((policy) => '<tr><td><strong>' + escapeHtml(policy.title) + '</strong><br><span class="muted">' + escapeHtml(policy.summary) + '</span></td><td>' + escapeHtml(policy.category) + '</td><td>' + escapeHtml(policy.version) + '</td><td>' + status(policy.status) + '</td><td>' + policy.assignmentCount + '</td><td>' + policy.acknowledgementCount + '</td><td class="row">' + (policy.status !== "published" ? '<button data-publish="' + policy.id + '">Publish</button>' : "") + '<button data-archive="' + policy.id + '">Archive</button></td></tr>').join("") + '</tbody></table>')
  );
  document.getElementById("policyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("/api/policies", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
    policiesPage();
  });
  document.querySelectorAll("[data-publish]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/policies/" + button.dataset.publish + "/publish", { method: "POST" });
    policiesPage();
  }));
  document.querySelectorAll("[data-archive]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/policies/" + button.dataset.archive + "/archive", { method: "POST" });
    policiesPage();
  }));
}

async function assignmentsPage() {
  const [{ policies }, { assignments }] = await Promise.all([api("/api/policies?status=published"), api("/api/assignments")]);
  shell(
    panel("Assign Policy", '<form id="assignmentForm" class="form-grid"><label>Policy<select name="policyId">' + policies.map((policy) => '<option value="' + policy.id + '">' + escapeHtml(policy.title) + ' v' + escapeHtml(policy.version) + '</option>').join("") + '</select></label><label>Target Type<select name="targetType"><option value="role">Role</option><option value="department">Department</option><option value="user">User</option></select></label><label>Target Value<input name="targetValue" value="Employee"></label><label>Due Date<input name="dueDate" type="date"></label><div class="wide"><button class="primary">Assign Policy</button></div></form>') +
    panel("Assignments", '<table><thead><tr><th>Policy</th><th>Target</th><th>Due Date</th><th>Status</th></tr></thead><tbody>' + assignments.map((assignment) => '<tr><td>' + escapeHtml(assignment.policy?.title) + '</td><td>' + assignment.targetType + ': ' + escapeHtml(assignment.targetValue) + '</td><td>' + (assignment.dueDate || "-") + '</td><td>' + status(assignment.status) + '</td></tr>').join("") + '</tbody></table>')
  );
  document.getElementById("assignmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    body.policyId = Number(body.policyId);
    await api("/api/assignments", { method: "POST", body: JSON.stringify(body) });
    assignmentsPage();
  });
}

async function employeePage() {
  const { user, assignedPolicies } = await api("/api/employee/policies?username=employee.demo");
  shell(
    panel("Employee Policy Workspace", '<p>' + escapeHtml(user.name) + ' can view assigned published policies and acknowledge the current policy version.</p>') +
    '<div class="grid">' + assignedPolicies.map((item) => '<div class="card"><h3>' + escapeHtml(item.policy.title) + ' <span class="muted">v' + escapeHtml(item.policy.version) + '</span></h3><p>' + escapeHtml(item.policy.content) + '</p><p><strong>Due:</strong> ' + (item.dueDate || "-") + ' ' + (item.acknowledgement ? status("completed") : status("pending")) + '</p>' + (item.acknowledgement ? '<p class="notice">Acknowledged at ' + new Date(item.acknowledgement.acknowledgedAt).toLocaleString() + '</p>' : '<button class="primary" data-ack="' + item.policy.id + '">Acknowledge Policy</button>') + '</div>').join("") + '</div>'
  );
  document.querySelectorAll("[data-ack]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/policies/" + button.dataset.ack + "/acknowledge", { method: "POST", body: JSON.stringify({ username: "employee.demo", statement: "I have read and understood this policy." }) });
    employeePage();
  }));
}

async function acknowledgementsPage() {
  const { acknowledgements } = await api("/api/acknowledgements");
  shell(panel("Acknowledgement Evidence", '<table><thead><tr><th>User</th><th>Policy</th><th>Version</th><th>Statement</th><th>Acknowledged At</th></tr></thead><tbody>' + acknowledgements.map((ack) => '<tr><td>' + escapeHtml(ack.user?.name) + '</td><td>' + escapeHtml(ack.policy?.title) + '</td><td>' + escapeHtml(ack.policyVersion) + '</td><td>' + escapeHtml(ack.statement) + '</td><td>' + new Date(ack.acknowledgedAt).toLocaleString() + '</td></tr>').join("") + '</tbody></table>'));
}

function render() {
  if (route === "policies") return policiesPage();
  if (route === "assignments") return assignmentsPage();
  if (route === "employee") return employeePage();
  if (route === "acknowledgements") return acknowledgementsPage();
  return dashboard();
}

render();
`;
}
