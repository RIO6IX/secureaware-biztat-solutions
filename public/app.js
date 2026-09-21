let route = "dashboard";

const nav = [
  ["dashboard", "Dashboard"],
  ["modules", "Training Modules"],
  ["assignments", "Assignments"],
  ["quizzes", "Quiz Builder"],
  ["employee", "Employee View"],
  ["results", "Results"],
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
          <strong>Member 3 - Security Training + Quiz & Assessment</strong>
          <span class="muted">Signed in as training.admin</span>
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
      <div class="metric"><strong>${data.modules}</strong><span>Training modules</span></div>
      <div class="metric"><strong>${data.activeModules}</strong><span>Active modules</span></div>
      <div class="metric"><strong>${data.assignments}</strong><span>Assignments</span></div>
      <div class="metric"><strong>${data.complianceRate}%</strong><span>Completion rate</span></div>
    </div>
    ${panel("Real-World Training Basis", `
      <p>This module is aligned to the project proposal requirements for assigned training, server-side quiz scoring, compliance visibility, auditability and privacy-safe academic testing.</p>
      <table><thead><tr><th>Reference</th><th>How it is used</th></tr></thead>
      <tbody>${researchBasis.map((item) => `<tr><td>${escapeHtml(item.source)}</td><td>${escapeHtml(item.use)}</td></tr>`).join("")}</tbody></table>
    `)}
  `);
}

async function modulesPage() {
  const { modules } = await api("/api/training/modules");
  shell(`
    ${panel("Create Training Module", `
      <form id="moduleForm" class="form-grid">
        <label>Title<input name="title" required></label>
        <label>Category<input name="category" value="Security Awareness"></label>
        <label>Duration minutes<input name="durationMinutes" type="number" value="15"></label>
        <label>Status<select name="status"><option value="active">Active</option><option value="draft">Draft</option></select></label>
        <label class="wide">Training Content<textarea name="content" required></textarea></label>
        <div class="wide"><button class="primary">Create Module</button></div>
      </form>
    `)}
    ${panel("Training Modules", `
      <table><thead><tr><th>Title</th><th>Category</th><th>Duration</th><th>Status</th><th>Quiz</th></tr></thead>
      <tbody>${modules.map((module) => `<tr><td>${escapeHtml(module.title)}</td><td>${escapeHtml(module.category)}</td><td>${module.durationMinutes} min</td><td>${status(module.status)}</td><td>${module.quiz ? escapeHtml(module.quiz.title) : "Not attached"}</td></tr>`).join("")}</tbody></table>
    `)}
  `);
  document.getElementById("moduleForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("/api/training/modules", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
    modulesPage();
  });
}

async function assignmentsPage() {
  const [{ modules }, { assignments }] = await Promise.all([
    api("/api/training/modules"),
    api("/api/training/assignments")
  ]);
  shell(`
    ${panel("Assign Training", `
      <form id="assignmentForm" class="form-grid">
        <label>Module<select name="moduleId">${modules.map((module) => `<option value="${module.id}">${escapeHtml(module.title)}</option>`).join("")}</select></label>
        <label>Target Type<select name="targetType"><option value="role">Role</option><option value="department">Department</option><option value="user">User</option></select></label>
        <label>Target Value<input name="targetValue" value="Employee"></label>
        <label>Due Date<input name="dueDate" type="date"></label>
        <div class="wide"><button class="primary">Assign Training</button></div>
      </form>
    `)}
    ${panel("Current Assignments", `
      <table><thead><tr><th>Module</th><th>Target</th><th>Due Date</th><th>Status</th></tr></thead>
      <tbody>${assignments.map((assignment) => `<tr><td>${escapeHtml(assignment.module?.title)}</td><td>${assignment.targetType}: ${escapeHtml(assignment.targetValue)}</td><td>${assignment.dueDate || "-"}</td><td>${status(assignment.status)}</td></tr>`).join("")}</tbody></table>
    `)}
  `);
  document.getElementById("assignmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    body.moduleId = Number(body.moduleId);
    await api("/api/training/assignments", { method: "POST", body: JSON.stringify(body) });
    assignmentsPage();
  });
}

async function quizzesPage() {
  const [{ modules }, { quizzes }] = await Promise.all([
    api("/api/training/modules"),
    api("/api/quizzes")
  ]);
  shell(`
    ${panel("Create Quiz", `
      <form id="quizForm" class="form-grid">
        <label>Module<select name="moduleId">${modules.map((module) => `<option value="${module.id}">${escapeHtml(module.title)}</option>`).join("")}</select></label>
        <label>Quiz Title<input name="title" required></label>
        <label>Pass Mark<input name="passMark" type="number" value="70"></label>
        <label class="wide">Question 1<input name="q1" value="What is the best action for suspicious emails?"></label>
        <label>Option A<input name="q1a" value="Click the link"></label>
        <label>Option B<input name="q1b" value="Report through approved process"></label>
        <label class="wide">Question 2<input name="q2" value="Why is MFA important?"></label>
        <label>Option A<input name="q2a" value="It adds a second verification layer"></label>
        <label>Option B<input name="q2b" value="It makes passwords public"></label>
        <div class="wide"><button class="primary">Create Quiz</button></div>
      </form>
    `)}
    ${panel("Quizzes", `
      <table><thead><tr><th>Quiz</th><th>Module</th><th>Questions</th><th>Pass Mark</th></tr></thead>
      <tbody>${quizzes.map((quiz) => `<tr><td>${escapeHtml(quiz.title)}</td><td>${escapeHtml(quiz.module?.title)}</td><td>${quiz.questions.length}</td><td>${quiz.passMark}%</td></tr>`).join("")}</tbody></table>
    `)}
  `);
  document.getElementById("quizForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.target));
    await api("/api/quizzes", {
      method: "POST",
      body: JSON.stringify({
        moduleId: Number(form.moduleId),
        title: form.title,
        passMark: Number(form.passMark),
        questions: [
          { prompt: form.q1, options: [form.q1a, form.q1b], answerIndex: 1 },
          { prompt: form.q2, options: [form.q2a, form.q2b], answerIndex: 0 }
        ]
      })
    });
    quizzesPage();
  });
}

async function employeePage() {
  const { user, assignedTraining } = await api("/api/employee/assigned-training?username=finance.analyst01");
  shell(`
    ${panel("Employee Training Workspace", `<p>${escapeHtml(user.name)} can view assigned training, complete modules and submit quizzes.</p>`)}
    <div class="grid">
      ${assignedTraining.map((item) => `
        <div class="card">
          <h3>${escapeHtml(item.module.title)}</h3>
          <p>${escapeHtml(item.module.content)}</p>
          <p><strong>Due:</strong> ${item.dueDate || "-"} ${item.result ? status(item.result.status) : status("pending")}</p>
          ${item.module.quiz ? quizForm(item.module.quiz) : "<span class='muted'>No quiz attached</span>"}
        </div>
      `).join("")}
    </div>
  `);
  document.querySelectorAll("[data-quiz-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const answers = Array.from(new FormData(form).entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => Number(value));
      await api(`/api/quizzes/${form.dataset.quizForm}/submit`, {
        method: "POST",
        body: JSON.stringify({ username: "finance.analyst01", answers })
      });
      employeePage();
    });
  });
}

function quizForm(quiz) {
  return `
    <form data-quiz-form="${quiz.id}" class="quiz-form">
      <strong>${escapeHtml(quiz.title)} - pass mark ${quiz.passMark}% - max attempts ${quiz.maxAttempts}</strong>
      ${quiz.questions.map((question, questionIndex) => `
        <fieldset>
          <legend>${escapeHtml(question.prompt)}</legend>
          ${question.options.map((option) => `
            <label class="choice"><input type="radio" name="q${questionIndex}" value="${option.id}" required> ${escapeHtml(option.text)}</label>
          `).join("")}
        </fieldset>
      `).join("")}
      <button class="primary">Submit Quiz</button>
    </form>
  `;
}

async function resultsPage() {
  const [{ results }, { rows }] = await Promise.all([
    api("/api/results"),
    api("/api/compliance/training")
  ]);
  shell(`
    ${panel("Training Compliance", `
      <table><thead><tr><th>Employee</th><th>Department</th><th>Module</th><th>Due Date</th><th>Score</th><th>Status</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.user.name)}</td><td>${escapeHtml(row.user.department)}</td><td>${escapeHtml(row.module.title)}</td><td>${row.dueDate || "-"}</td><td>${row.score === null ? "-" : `${row.score}%`}</td><td>${status(row.status)}</td></tr>`).join("")}</tbody></table>
    `)}
    ${panel("Quiz Results", `
      <table><thead><tr><th>User</th><th>Module</th><th>Quiz</th><th>Attempt</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead>
      <tbody>${results.length ? results.map((result) => `<tr><td>${escapeHtml(result.user?.name)}</td><td>${escapeHtml(result.module?.title)}</td><td>${escapeHtml(result.quiz?.title)}</td><td>${result.attemptNumber}</td><td>${result.score}%</td><td>${status(result.status)}</td><td>${new Date(result.submittedAt).toLocaleString()}</td></tr>`).join("") : `<tr><td colspan="7" class="muted">No quiz attempts submitted yet.</td></tr>`}</tbody></table>
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
  if (route === "modules") return modulesPage();
  if (route === "assignments") return assignmentsPage();
  if (route === "quizzes") return quizzesPage();
  if (route === "employee") return employeePage();
  if (route === "results") return resultsPage();
  if (route === "audit") return auditPage();
  return dashboard();
}

render();
