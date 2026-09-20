const users = [
  { id: 1, username: "training.admin", name: "Training Administrator", role: "Security/HR Administrator", department: "Information Security" },
  { id: 2, username: "employee.demo", name: "Employee Demo", role: "Employee", department: "Finance" },
  { id: 3, username: "manager.demo", name: "Manager Demo", role: "Department Manager", department: "Finance" }
];

let nextModuleId = 4;
let nextQuizId = 3;
let nextAssignmentId = 4;
let nextResultId = 3;

const modules = [
  { id: 1, title: "Phishing Awareness Essentials", category: "Email Security", durationMinutes: 20, status: "active", content: "Recognize suspicious senders, urgent language, malicious links and unexpected attachments.", quizId: 1 },
  { id: 2, title: "Password and MFA Good Practice", category: "Account Security", durationMinutes: 15, status: "active", content: "Use strong unique passwords, password managers and multi-factor authentication for critical systems.", quizId: 2 },
  { id: 3, title: "Clean Desk and Data Handling", category: "Workplace Security", durationMinutes: 12, status: "draft", content: "Protect printed documents, lock screens and store sensitive information only in approved locations.", quizId: null }
];

const quizzes = [
  {
    id: 1,
    moduleId: 1,
    title: "Phishing Awareness Quiz",
    passMark: 70,
    questions: [
      { prompt: "Which sign most strongly suggests a phishing email?", options: ["Urgent request for credentials", "A known colleague's normal signature", "Company newsletter", "Approved HR memo"], answerIndex: 0 },
      { prompt: "What should an employee do with a suspicious link?", options: ["Click to verify it", "Forward to everyone", "Report it using the approved process", "Ignore all emails"], answerIndex: 2 }
    ]
  },
  {
    id: 2,
    moduleId: 2,
    title: "Password and MFA Quiz",
    passMark: 70,
    questions: [
      { prompt: "What is the safest password practice?", options: ["Reuse memorable passwords", "Use a password manager", "Write passwords on desk notes", "Share passwords with team leads"], answerIndex: 1 },
      { prompt: "Why enable MFA?", options: ["It replaces passwords", "It adds a second verification layer", "It makes accounts public", "It disables account monitoring"], answerIndex: 1 }
    ]
  }
];

const assignments = [
  { id: 1, moduleId: 1, targetType: "department", targetValue: "Finance", dueDate: "2026-10-05", status: "assigned" },
  { id: 2, moduleId: 2, targetType: "role", targetValue: "Employee", dueDate: "2026-10-10", status: "assigned" },
  { id: 3, moduleId: 1, targetType: "user", targetValue: "employee.demo", dueDate: "2026-09-30", status: "assigned" }
];

const results = [
  { id: 1, userId: 2, moduleId: 1, quizId: 1, score: 100, status: "passed", submittedAt: "2026-09-18T09:30:00.000Z" },
  { id: 2, userId: 2, moduleId: 2, quizId: 2, score: 50, status: "failed", submittedAt: "2026-09-19T11:15:00.000Z" }
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
  if (request.method === "GET" && url.pathname === "/api/training/modules") return json({ modules: modules.map(withQuiz) });
  if (request.method === "POST" && url.pathname === "/api/training/modules") {
    const body = await readJson(request);
    if (!body.title || !body.content) return json({ message: "Title and content are required." }, 400);
    const module = {
      id: nextModuleId++,
      title: String(body.title).trim(),
      category: String(body.category || "General"),
      durationMinutes: Number(body.durationMinutes || 10),
      status: body.status === "draft" ? "draft" : "active",
      content: String(body.content).trim(),
      quizId: null
    };
    modules.push(module);
    return json({ module: withQuiz(module) }, 201);
  }
  if (request.method === "GET" && url.pathname === "/api/training/assignments") return json({ assignments: assignments.map(withModule) });
  if (request.method === "POST" && url.pathname === "/api/training/assignments") {
    const body = await readJson(request);
    if (!modules.some((module) => module.id === Number(body.moduleId))) return json({ message: "Invalid module." }, 400);
    const assignment = {
      id: nextAssignmentId++,
      moduleId: Number(body.moduleId),
      targetType: ["role", "department", "user"].includes(body.targetType) ? body.targetType : "role",
      targetValue: String(body.targetValue || "Employee").trim(),
      dueDate: String(body.dueDate || ""),
      status: "assigned"
    };
    assignments.push(assignment);
    return json({ assignment: withModule(assignment) }, 201);
  }
  if (request.method === "GET" && url.pathname === "/api/quizzes") return json({ quizzes: quizzes.map(withModuleForQuiz) });
  if (request.method === "POST" && url.pathname === "/api/quizzes") {
    const body = await readJson(request);
    const module = modules.find((item) => item.id === Number(body.moduleId));
    if (!module || !body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
      return json({ message: "Valid module, title and questions are required." }, 400);
    }
    const quiz = {
      id: nextQuizId++,
      moduleId: module.id,
      title: String(body.title).trim(),
      passMark: Number(body.passMark || 70),
      questions: body.questions.map((question) => ({
        prompt: String(question.prompt || "").trim(),
        options: Array.isArray(question.options) ? question.options.map(String) : [],
        answerIndex: Number(question.answerIndex || 0)
      }))
    };
    quizzes.push(quiz);
    module.quizId = quiz.id;
    return json({ quiz: withModuleForQuiz(quiz) }, 201);
  }
  const submitMatch = url.pathname.match(/^\/api\/quizzes\/(\d+)\/submit$/);
  if (request.method === "POST" && submitMatch) {
    const quiz = quizzes.find((item) => item.id === Number(submitMatch[1]));
    if (!quiz) return json({ message: "Quiz not found." }, 404);
    const body = await readJson(request);
    const user = users.find((item) => item.username === body.username) || users[1];
    const answers = Array.isArray(body.answers) ? body.answers.map(Number) : [];
    const correct = quiz.questions.filter((question, index) => question.answerIndex === answers[index]).length;
    const score = Math.round((correct / quiz.questions.length) * 100);
    const result = {
      id: nextResultId++,
      userId: user.id,
      moduleId: quiz.moduleId,
      quizId: quiz.id,
      score,
      status: score >= quiz.passMark ? "passed" : "failed",
      submittedAt: new Date().toISOString()
    };
    results.push(result);
    return json({ result: withResultDetails(result) }, 201);
  }
  if (request.method === "GET" && url.pathname === "/api/results") return json({ results: results.map(withResultDetails) });
  if (request.method === "GET" && url.pathname === "/api/employee/assigned-training") {
    const username = url.searchParams.get("username") || "employee.demo";
    const user = users.find((item) => item.username === username) || users[1];
    return json({ user, assignedTraining: assignedFor(user) });
  }
  return json({ message: "Not found" }, 404);
}

function dashboard() {
  return {
    modules: modules.length,
    activeModules: modules.filter((module) => module.status === "active").length,
    assignments: assignments.length,
    attempts: results.length,
    passRate: results.length ? Math.round((results.filter((result) => result.status === "passed").length / results.length) * 100) : 0,
    overdueAssignments: assignments.filter((assignment) => assignment.dueDate && new Date(assignment.dueDate) < new Date()).length
  };
}

function assignedFor(user) {
  return assignments
    .filter((assignment) => {
      if (assignment.targetType === "role") return assignment.targetValue === user.role;
      if (assignment.targetType === "department") return assignment.targetValue === user.department;
      return assignment.targetValue === user.username;
    })
    .map((assignment) => {
      const module = modules.find((item) => item.id === assignment.moduleId);
      const result = results.find((item) => item.userId === user.id && item.moduleId === module.id);
      return { ...assignment, module: withQuiz(module), result: result ? withResultDetails(result) : null };
    });
}

function withQuiz(module) {
  return { ...module, quiz: quizzes.find((quiz) => quiz.id === module.quizId) || null };
}

function withModule(assignment) {
  return { ...assignment, module: modules.find((module) => module.id === assignment.moduleId) || null };
}

function withModuleForQuiz(quiz) {
  return { ...quiz, module: modules.find((module) => module.id === quiz.moduleId) || null };
}

function withResultDetails(result) {
  const user = users.find((item) => item.id === result.userId);
  const module = modules.find((item) => item.id === result.moduleId);
  const quiz = quizzes.find((item) => item.id === result.quizId);
  return { ...result, user, module, quiz };
}

async function readJson(request) {
  return request.json().catch(() => ({}));
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" }
  });
}

function text(body, contentType) {
  return new Response(body, {
    headers: { "content-type": contentType, "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" }
  });
}

function html() {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>SecureAware Training</title><link rel="stylesheet" href="/styles.css" /></head><body><div id="app">Loading SecureAware...</div><script src="/app.js"></script></body></html>`;
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
const nav = [["dashboard", "Dashboard"], ["modules", "Training Modules"], ["assignments", "Assignments"], ["quizzes", "Quiz Builder"], ["employee", "Employee View"], ["results", "Results"]];

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
    '</aside><main class="main"><header class="topbar"><strong>Member 3 - Security Training + Quiz & Assessment</strong><span class="muted">Signed in as training.admin</span></header><section class="workspace">' +
    content + '</section></main></div>';
  document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
    route = button.dataset.route;
    render();
  }));
}

function panel(title, body) { return '<section class="panel"><h2>' + title + '</h2>' + body + '</section>'; }
function status(value) { return '<span class="status ' + value + '">' + value + '</span>'; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }

async function dashboard() {
  const data = await api("/api/dashboard");
  shell(
    '<div class="grid metrics"><div class="metric"><strong>' + data.modules + '</strong><span>Training modules</span></div><div class="metric"><strong>' + data.activeModules + '</strong><span>Active modules</span></div><div class="metric"><strong>' + data.assignments + '</strong><span>Assignments</span></div><div class="metric"><strong>' + data.passRate + '%</strong><span>Quiz pass rate</span></div></div>' +
    panel("Demo Flow", '<p>Create a module, attach a quiz, assign it to employees, then submit quiz attempts and review results.</p>')
  );
}

async function modulesPage() {
  const { modules } = await api("/api/training/modules");
  shell(
    panel("Create Training Module", '<form id="moduleForm" class="form-grid"><label>Title<input name="title" required></label><label>Category<input name="category" value="Security Awareness"></label><label>Duration minutes<input name="durationMinutes" type="number" value="15"></label><label>Status<select name="status"><option value="active">Active</option><option value="draft">Draft</option></select></label><label class="wide">Training Content<textarea name="content" required></textarea></label><div class="wide"><button class="primary">Create Module</button></div></form>') +
    panel("Training Modules", '<table><thead><tr><th>Title</th><th>Category</th><th>Duration</th><th>Status</th><th>Quiz</th></tr></thead><tbody>' + modules.map((module) => '<tr><td>' + escapeHtml(module.title) + '</td><td>' + escapeHtml(module.category) + '</td><td>' + module.durationMinutes + ' min</td><td>' + status(module.status) + '</td><td>' + (module.quiz ? escapeHtml(module.quiz.title) : "Not attached") + '</td></tr>').join("") + '</tbody></table>')
  );
  document.getElementById("moduleForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("/api/training/modules", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
    modulesPage();
  });
}

async function assignmentsPage() {
  const [{ modules }, { assignments }] = await Promise.all([api("/api/training/modules"), api("/api/training/assignments")]);
  shell(
    panel("Assign Training", '<form id="assignmentForm" class="form-grid"><label>Module<select name="moduleId">' + modules.map((module) => '<option value="' + module.id + '">' + escapeHtml(module.title) + '</option>').join("") + '</select></label><label>Target Type<select name="targetType"><option value="role">Role</option><option value="department">Department</option><option value="user">User</option></select></label><label>Target Value<input name="targetValue" value="Employee"></label><label>Due Date<input name="dueDate" type="date"></label><div class="wide"><button class="primary">Assign Training</button></div></form>') +
    panel("Current Assignments", '<table><thead><tr><th>Module</th><th>Target</th><th>Due Date</th><th>Status</th></tr></thead><tbody>' + assignments.map((assignment) => '<tr><td>' + escapeHtml(assignment.module?.title) + '</td><td>' + assignment.targetType + ': ' + escapeHtml(assignment.targetValue) + '</td><td>' + (assignment.dueDate || "-") + '</td><td>' + status(assignment.status) + '</td></tr>').join("") + '</tbody></table>')
  );
  document.getElementById("assignmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    body.moduleId = Number(body.moduleId);
    await api("/api/training/assignments", { method: "POST", body: JSON.stringify(body) });
    assignmentsPage();
  });
}

async function quizzesPage() {
  const [{ modules }, { quizzes }] = await Promise.all([api("/api/training/modules"), api("/api/quizzes")]);
  shell(
    panel("Create Quiz", '<form id="quizForm" class="form-grid"><label>Module<select name="moduleId">' + modules.map((module) => '<option value="' + module.id + '">' + escapeHtml(module.title) + '</option>').join("") + '</select></label><label>Quiz Title<input name="title" required></label><label>Pass Mark<input name="passMark" type="number" value="70"></label><label class="wide">Question 1<input name="q1" value="What is the best action for suspicious emails?"></label><label>Option A<input name="q1a" value="Click the link"></label><label>Option B<input name="q1b" value="Report through approved process"></label><label class="wide">Question 2<input name="q2" value="Why is MFA important?"></label><label>Option A<input name="q2a" value="It adds a second verification layer"></label><label>Option B<input name="q2b" value="It makes passwords public"></label><div class="wide"><button class="primary">Create Quiz</button></div></form>') +
    panel("Quizzes", '<table><thead><tr><th>Quiz</th><th>Module</th><th>Questions</th><th>Pass Mark</th></tr></thead><tbody>' + quizzes.map((quiz) => '<tr><td>' + escapeHtml(quiz.title) + '</td><td>' + escapeHtml(quiz.module?.title) + '</td><td>' + quiz.questions.length + '</td><td>' + quiz.passMark + '%</td></tr>').join("") + '</tbody></table>')
  );
  document.getElementById("quizForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.target));
    await api("/api/quizzes", { method: "POST", body: JSON.stringify({ moduleId: Number(form.moduleId), title: form.title, passMark: Number(form.passMark), questions: [{ prompt: form.q1, options: [form.q1a, form.q1b], answerIndex: 1 }, { prompt: form.q2, options: [form.q2a, form.q2b], answerIndex: 0 }] }) });
    quizzesPage();
  });
}

async function employeePage() {
  const { user, assignedTraining } = await api("/api/employee/assigned-training?username=employee.demo");
  shell(
    panel("Employee Training Workspace", '<p>' + escapeHtml(user.name) + ' can view assigned training, complete modules and submit quizzes.</p>') +
    '<div class="grid">' + assignedTraining.map((item) => '<div class="card"><h3>' + escapeHtml(item.module.title) + '</h3><p>' + escapeHtml(item.module.content) + '</p><p><strong>Due:</strong> ' + (item.dueDate || "-") + ' ' + (item.result ? status(item.result.status) : status("pending")) + '</p>' + (item.module.quiz ? '<button class="primary" data-quiz="' + item.module.quiz.id + '">Submit Perfect Quiz Attempt</button>' : '<span class="muted">No quiz attached</span>') + '</div>').join("") + '</div>'
  );
  document.querySelectorAll("[data-quiz]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/quizzes/" + button.dataset.quiz + "/submit", { method: "POST", body: JSON.stringify({ username: "employee.demo", answers: [0, 1] }) });
    employeePage();
  }));
}

async function resultsPage() {
  const { results } = await api("/api/results");
  shell(panel("Quiz Results", '<table><thead><tr><th>User</th><th>Module</th><th>Quiz</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead><tbody>' + results.map((result) => '<tr><td>' + escapeHtml(result.user?.name) + '</td><td>' + escapeHtml(result.module?.title) + '</td><td>' + escapeHtml(result.quiz?.title) + '</td><td>' + result.score + '%</td><td>' + status(result.status) + '</td><td>' + new Date(result.submittedAt).toLocaleString() + '</td></tr>').join("") + '</tbody></table>'));
}

function render() {
  if (route === "modules") return modulesPage();
  if (route === "assignments") return assignmentsPage();
  if (route === "quizzes") return quizzesPage();
  if (route === "employee") return employeePage();
  if (route === "results") return resultsPage();
  return dashboard();
}

render();
`;
}
