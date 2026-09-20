let route = "dashboard";

const nav = [
  ["dashboard", "Dashboard"],
  ["policies", "Policies"],
  ["assignments", "Assignments"],
  ["employee", "Employee View"],
  ["acknowledgements", "Acknowledgements"],
  ["audit", "Audit"]
];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function shell(content) {
  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">SA</div><span>SecureAware</span></div>
        ${nav.map(([key, label]) => `<button data-route="${key}" class="${route === key ? "active" : ""}">${label}</button>`).join("")}
      </aside>
      <main class="main">
        <header class="topbar">
          <strong>Member 2 - Policy Management + Assignment + Acknowledgement</strong>
          <span class="muted">Signed in as policy.admin</span>
        </header>
        <section class="workspace">${content}</section>
      </main>
    </div>
  `;
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      route = button.dataset.route;
      render();
    });
  });
}

function panel(title, body) {
  return `<section class="panel"><h2>${title}</h2>${body}</section>`;
}

function status(value) {
  return `<span class="status ${value}">${value}</span>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function dashboard() {
  const [data, { researchBasis }] = await Promise.all([
    api("/api/dashboard"),
    api("/api/research-basis")
  ]);
  shell(`
    <div class="grid metrics">
      <div class="metric"><strong>${data.policies}</strong><span>Total policies</span></div>
      <div class="metric"><strong>${data.publishedPolicies}</strong><span>Published</span></div>
      <div class="metric"><strong>${data.assignments}</strong><span>Assignments</span></div>
      <div class="metric"><strong>${data.complianceRate}%</strong><span>Completion rate</span></div>
    </div>
    ${panel("Real-World Policy Basis", `
      <p>This module is aligned to the proposal requirement for versioned policy control, exact-version acknowledgement, compliance visibility, auditability and privacy-safe academic testing.</p>
      <table><thead><tr><th>Reference</th><th>How it is used</th></tr></thead>
      <tbody>${researchBasis.map((item) => `<tr><td>${escapeHtml(item.source)}</td><td>${escapeHtml(item.use)}</td></tr>`).join("")}</tbody></table>
    `)}
  `);
}

async function policiesPage() {
  const { policies } = await api("/api/policies");
  shell(`
    ${panel("Create Policy", `
      <form id="policyForm" class="form-grid">
        <label>Title<input name="title" required></label>
        <label>Category<input name="category" value="Information Security"></label>
        <label>Version<input name="version" value="1.0"></label>
        <label>Owner<input name="owner" value="Information Security"></label>
        <label>Effective Date<input name="effectiveDate" type="date"></label>
        <label>Status<select name="status"><option value="draft">Draft</option><option value="published">Published</option></select></label>
        <label class="wide">Summary<textarea name="summary"></textarea></label>
        <label class="wide">Policy Content<textarea name="content" required></textarea></label>
        <div class="wide"><button class="primary">Create Policy</button></div>
      </form>
    `)}
    ${panel("Policies", `
      <table><thead><tr><th>Policy</th><th>Category</th><th>Version</th><th>Status</th><th>Assignments</th><th>Acknowledgements</th><th>Actions</th></tr></thead>
      <tbody>${policies.map((policy) => `<tr><td><strong>${escapeHtml(policy.title)}</strong><br><span class="muted">${escapeHtml(policy.summary)}</span></td><td>${escapeHtml(policy.category)}</td><td>${escapeHtml(policy.version)}</td><td>${status(policy.status)}</td><td>${policy.assignmentCount}</td><td>${policy.acknowledgementCount}</td><td class="row">${policy.status !== "published" ? `<button data-publish="${policy.id}">Publish</button>` : ""}<button data-archive="${policy.id}">Archive</button></td></tr>`).join("")}</tbody></table>
    `)}
  `);
  document.getElementById("policyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("/api/policies", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
    policiesPage();
  });
  document.querySelectorAll("[data-publish]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/policies/${button.dataset.publish}/publish`, { method: "POST" });
      policiesPage();
    });
  });
  document.querySelectorAll("[data-archive]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/policies/${button.dataset.archive}/archive`, { method: "POST" });
      policiesPage();
    });
  });
}

async function assignmentsPage() {
  const [{ policies }, { assignments }] = await Promise.all([
    api("/api/policies?status=published"),
    api("/api/assignments")
  ]);
  shell(`
    ${panel("Assign Policy", `
      <form id="assignmentForm" class="form-grid">
        <label>Policy<select name="policyId">${policies.map((policy) => `<option value="${policy.id}">${escapeHtml(policy.title)} v${escapeHtml(policy.version)}</option>`).join("")}</select></label>
        <label>Target Type<select name="targetType"><option value="role">Role</option><option value="department">Department</option><option value="user">User</option></select></label>
        <label>Target Value<input name="targetValue" value="Employee"></label>
        <label>Due Date<input name="dueDate" type="date"></label>
        <div class="wide"><button class="primary">Assign Policy</button></div>
      </form>
    `)}
    ${panel("Assignments", `
      <table><thead><tr><th>Policy</th><th>Target</th><th>Due Date</th><th>Status</th></tr></thead>
      <tbody>${assignments.map((assignment) => `<tr><td>${escapeHtml(assignment.policy?.title)}</td><td>${assignment.targetType}: ${escapeHtml(assignment.targetValue)}</td><td>${assignment.dueDate || "-"}</td><td>${status(assignment.status)}</td></tr>`).join("")}</tbody></table>
    `)}
  `);
  document.getElementById("assignmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    body.policyId = Number(body.policyId);
    await api("/api/assignments", { method: "POST", body: JSON.stringify(body) });
    assignmentsPage();
  });
}

async function employeePage() {
  const { user, assignedPolicies } = await api("/api/employee/policies?username=finance.analyst01");
  shell(`
    ${panel("Employee Policy Workspace", `<p>${escapeHtml(user.name)} can view assigned published policies and acknowledge the current policy version.</p>`)}
    <div class="grid">
      ${assignedPolicies.map((item) => `
        <div class="card">
          <h3>${escapeHtml(item.policy.title)} <span class="muted">v${escapeHtml(item.policy.version)}</span></h3>
          <p>${escapeHtml(item.policy.content)}</p>
          <p><strong>Due:</strong> ${item.dueDate || "-"} ${item.acknowledgement ? status("completed") : status("pending")}</p>
          ${item.acknowledgement ? `<p class="notice">Acknowledged at ${new Date(item.acknowledgement.acknowledgedAt).toLocaleString()}</p>` : `<button class="primary" data-ack="${item.policy.id}">Acknowledge Policy</button>`}
        </div>
      `).join("")}
    </div>
  `);
  document.querySelectorAll("[data-ack]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/policies/${button.dataset.ack}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ username: "finance.analyst01", statement: "I have read and understood the displayed policy version." })
      });
      employeePage();
    });
  });
}

async function acknowledgementsPage() {
  const [{ acknowledgements }, { rows }] = await Promise.all([
    api("/api/acknowledgements"),
    api("/api/compliance/policies")
  ]);
  shell(`
    ${panel("Policy Compliance", `
      <table><thead><tr><th>Employee</th><th>Department</th><th>Policy</th><th>Version</th><th>Due Date</th><th>Status</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.user.name)}</td><td>${escapeHtml(row.user.department)}</td><td>${escapeHtml(row.policy.title)}</td><td>${escapeHtml(row.policy.version)}</td><td>${row.dueDate || "-"}</td><td>${status(row.status)}</td></tr>`).join("")}</tbody></table>
    `)}
    ${panel("Acknowledgement Evidence", `
    <table><thead><tr><th>User</th><th>Policy</th><th>Version</th><th>Statement</th><th>Acknowledged At</th></tr></thead>
    <tbody>${acknowledgements.length ? acknowledgements.map((ack) => `<tr><td>${escapeHtml(ack.user?.name)}</td><td>${escapeHtml(ack.policy?.title)}</td><td>${escapeHtml(ack.policyVersion)}</td><td>${escapeHtml(ack.statement)}</td><td>${new Date(ack.acknowledgedAt).toLocaleString()}</td></tr>`).join("") : `<tr><td colspan="5" class="muted">No acknowledgements recorded yet.</td></tr>`}</tbody></table>
    `)}
  `);
}

async function auditPage() {
  const { auditEvents } = await api("/api/audit-events");
  shell(panel("Audit Evidence", `
    <table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead>
    <tbody>${auditEvents.map((event) => `<tr><td>${new Date(event.createdAt).toLocaleString()}</td><td>${escapeHtml(event.actor)}</td><td>${escapeHtml(event.action)}</td><td>${escapeHtml(event.target)}</td></tr>`).join("")}</tbody></table>
  `));
}

function render() {
  if (route === "policies") return policiesPage();
  if (route === "assignments") return assignmentsPage();
  if (route === "employee") return employeePage();
  if (route === "acknowledgements") return acknowledgementsPage();
  if (route === "audit") return auditPage();
  return dashboard();
}

render();
