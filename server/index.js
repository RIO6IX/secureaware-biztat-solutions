import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 4000);

const users = [
  { id: 1, username: "training.admin", name: "Security Awareness Administrator", role: "Security/HR Administrator", department: "Information Security" },
  { id: 2, username: "finance.analyst01", name: "Finance Analyst 01", role: "Employee", department: "Finance" },
  { id: 3, username: "finance.manager01", name: "Finance Manager 01", role: "Department Manager", department: "Finance" }
];

let nextModuleId = 4;
let nextQuizId = 3;
let nextAssignmentId = 4;
let nextResultId = 1;
let nextAuditId = 1;

const modules = [
  {
    id: 1,
    title: "Email Phishing and Reporting",
    category: "Email Security",
    durationMinutes: 20,
    status: "active",
    content: "Inspect sender domains, links, attachments, QR codes and unusual payment or credential requests. Confirm suspicious messages through a separate channel and report them using the approved process.",
    quizId: 1
  },
  {
    id: 2,
    title: "Password Manager and MFA Use",
    category: "Account Security",
    durationMinutes: 15,
    status: "active",
    content: "Use unique passwords or passphrases stored in an approved password manager. Enable MFA for business systems and report unexpected approval prompts immediately.",
    quizId: 2
  },
  {
    id: 3,
    title: "Clean Desk and Information Handling",
    category: "Workplace Security",
    durationMinutes: 12,
    status: "active",
    content: "Lock screens, clear printed documents, classify sensitive files correctly and use approved storage locations for business information.",
    quizId: 3
  }
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
    title: "Password Manager and MFA Quiz",
    passMark: 70,
    questions: [
      { prompt: "What is the safest password practice?", options: ["Reuse memorable passwords", "Use a password manager", "Write passwords on desk notes", "Share passwords with team leads"], answerIndex: 1 },
      { prompt: "Why should an unexpected MFA approval prompt be reported?", options: ["It may indicate a credential attack", "It means the password is expired", "It makes the account faster", "It is always a system test"], answerIndex: 0 }
    ]
  },
  {
    id: 3,
    moduleId: 3,
    title: "Information Handling Quiz",
    passMark: 80,
    questions: [
      { prompt: "Where should sensitive business documents be stored?", options: ["Approved company storage", "Personal email", "Public file shares", "Unlabeled USB drives"], answerIndex: 0 },
      { prompt: "What is the safest action before leaving a workstation?", options: ["Leave documents open", "Lock the screen", "Share the session", "Disable MFA"], answerIndex: 1 }
    ]
  }
];

const assignments = [
  { id: 1, moduleId: 1, targetType: "department", targetValue: "Finance", dueDate: "2026-10-05", status: "assigned" },
  { id: 2, moduleId: 2, targetType: "role", targetValue: "Employee", dueDate: "2026-10-10", status: "assigned" },
  { id: 3, moduleId: 3, targetType: "department", targetValue: "Finance", dueDate: "2026-10-15", status: "assigned" }
];

const results = [];

const auditEvents = [
  { id: nextAuditId++, actor: "system", action: "training_program_initialized", target: "SecureAware baseline training library", createdAt: new Date().toISOString() }
];

const researchBasis = [
  {
    source: "NIST SP 800-50",
    use: "Awareness programs should be managed as a program with role-appropriate content, communication, measurement and updates."
  },
  {
    source: "NIST CSF 2.0",
    use: "Awareness and training are tracked as part of Protect outcomes, with role-appropriate cybersecurity responsibilities."
  },
  {
    source: "CISA Secure Our World guidance",
    use: "Training topics prioritize phishing reporting, strong passwords, MFA, updates and suspicious-message verification."
  },
  {
    source: "OWASP ASVS",
    use: "The prototype keeps score calculation and protected workflow decisions on the server side."
  }
];

function contentType(filePath) {
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

function serveFile(response, requestPath) {
  const resolved = path.normalize(path.join(publicDir, requestPath === "/" ? "index.html" : requestPath));
  if (!resolved.startsWith(publicDir)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const filePath = fs.existsSync(resolved) && fs.statSync(resolved).isFile()
    ? resolved
    : path.join(publicDir, "index.html");
  response.writeHead(200, {
    "content-type": contentType(filePath),
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  if (url.pathname === "/api/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    handleApi(request, response, url).catch(() => json(response, 500, { message: "Server error" }));
    return;
  }
  serveFile(response, url.pathname);
});

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/dashboard") {
    json(response, 200, dashboard());
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/users") {
    json(response, 200, { users });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/research-basis") {
    json(response, 200, { researchBasis });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/audit-events") {
    json(response, 200, { auditEvents: auditEvents.slice(-25).reverse() });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/compliance/training") {
    json(response, 200, { rows: complianceRows() });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/training/modules") {
    json(response, 200, { modules: modules.map(withQuiz) });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/training/modules") {
    const body = await readJson(request);
    if (!body.title || !body.content) return json(response, 400, { message: "Title and content are required." });
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
    recordAudit("training.admin", "module_created", module.title);
    json(response, 201, { module: withQuiz(module) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/training/assignments") {
    json(response, 200, { assignments: assignments.map(withModule) });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/training/assignments") {
    const body = await readJson(request);
    if (!modules.some((module) => module.id === Number(body.moduleId))) return json(response, 400, { message: "Invalid module." });
    const assignment = {
      id: nextAssignmentId++,
      moduleId: Number(body.moduleId),
      targetType: ["role", "department", "user"].includes(body.targetType) ? body.targetType : "role",
      targetValue: String(body.targetValue || "Employee").trim(),
      dueDate: String(body.dueDate || ""),
      status: "assigned"
    };
    assignments.push(assignment);
    recordAudit("training.admin", "training_assigned", `${assignment.targetType}:${assignment.targetValue}`);
    json(response, 201, { assignment: withModule(assignment) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/quizzes") {
    json(response, 200, { quizzes: quizzes.map(withModuleForQuiz) });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/quizzes") {
    const body = await readJson(request);
    const module = modules.find((item) => item.id === Number(body.moduleId));
    if (!module || !body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
      return json(response, 400, { message: "Valid module, title and questions are required." });
    }
    const quiz = {
      id: nextQuizId++,
      moduleId: module.id,
      title: String(body.title).trim(),
      passMark: Number(body.passMark || 70),
      questions: body.questions.map((question) => ({
        prompt: String(question.prompt || "").trim(),
        options: question.options.map(String),
        answerIndex: Number(question.answerIndex || 0)
      }))
    };
    quizzes.push(quiz);
    module.quizId = quiz.id;
    recordAudit("training.admin", "quiz_created", quiz.title);
    json(response, 201, { quiz: withModuleForQuiz(quiz) });
    return;
  }
  const submitMatch = url.pathname.match(/^\/api\/quizzes\/(\d+)\/submit$/);
  if (request.method === "POST" && submitMatch) {
    const quiz = quizzes.find((item) => item.id === Number(submitMatch[1]));
    if (!quiz) return json(response, 404, { message: "Quiz not found." });
    const body = await readJson(request);
    const user = users.find((item) => item.username === body.username) || users[1];
    const answers = Array.isArray(body.answers) ? body.answers.map(Number) : [];
    const correct = quiz.questions.filter((question, index) => question.answerIndex === answers[index]).length;
    const score = Math.round((correct / quiz.questions.length) * 100);
    const existing = results.find((item) => item.userId === user.id && item.quizId === quiz.id);
    const result = existing || {
      id: nextResultId++,
      userId: user.id,
      moduleId: quiz.moduleId,
      quizId: quiz.id,
      score: 0,
      status: "failed",
      submittedAt: ""
    };
    Object.assign(result, {
      score,
      status: score >= quiz.passMark ? "passed" : "failed",
      submittedAt: new Date().toISOString()
    });
    if (!existing) results.push(result);
    recordAudit(user.username, "quiz_submitted", `${quiz.title} - ${score}%`);
    json(response, 201, { result: withResultDetails(result) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/results") {
    json(response, 200, { results: results.map(withResultDetails) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/employee/assigned-training") {
    const username = url.searchParams.get("username") || "finance.analyst01";
    const user = users.find((item) => item.username === username) || users[1];
    json(response, 200, { user, assignedTraining: assignedFor(user) });
    return;
  }
  json(response, 404, { message: "Not found" });
}

function dashboard() {
  const rows = complianceRows();
  const complete = rows.filter((row) => row.status === "complete").length;
  return {
    modules: modules.length,
    activeModules: modules.filter((module) => module.status === "active").length,
    assignments: assignments.length,
    attempts: results.length,
    passRate: results.length ? Math.round((results.filter((result) => result.status === "passed").length / results.length) * 100) : 0,
    complianceRate: rows.length ? Math.round((complete / rows.length) * 100) : 0,
    overdueAssignments: rows.filter((row) => row.status === "overdue").length
  };
}

function complianceRows() {
  return assignments.flatMap((assignment) => users
    .filter((user) => matchesAssignment(user, assignment))
    .map((user) => {
      const module = modules.find((item) => item.id === assignment.moduleId);
      const result = results.find((item) => item.userId === user.id && item.moduleId === module.id);
      const overdue = assignment.dueDate && new Date(`${assignment.dueDate}T23:59:59.000Z`) < new Date();
      const complete = result?.status === "passed";
      return {
        assignmentId: assignment.id,
        user: { username: user.username, name: user.name, department: user.department, role: user.role },
        module: { id: module.id, title: module.title, category: module.category },
        dueDate: assignment.dueDate,
        score: result?.score ?? null,
        resultStatus: result?.status ?? "not_attempted",
        status: complete ? "complete" : overdue ? "overdue" : "pending",
        submittedAt: result?.submittedAt ?? null
      };
    }));
}

function assignedFor(user) {
  return assignments
    .filter((assignment) => matchesAssignment(user, assignment))
    .map((assignment) => {
      const module = modules.find((item) => item.id === assignment.moduleId);
      const result = results.find((item) => item.userId === user.id && item.moduleId === module.id);
      return { ...assignment, module: withQuiz(module), result: result ? withResultDetails(result) : null };
    });
}

function matchesAssignment(user, assignment) {
  if (assignment.targetType === "role") return assignment.targetValue === user.role;
  if (assignment.targetType === "department") return assignment.targetValue === user.department;
  return assignment.targetValue === user.username;
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

function recordAudit(actor, action, target) {
  auditEvents.push({ id: nextAuditId++, actor, action, target, createdAt: new Date().toISOString() });
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, "127.0.0.1", () => {
    console.log(`SecureAware running at http://127.0.0.1:${port}`);
  });
}

export default server;
