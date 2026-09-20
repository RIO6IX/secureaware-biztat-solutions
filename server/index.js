import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 4000);

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
  {
    id: 1,
    title: "Phishing Awareness Essentials",
    category: "Email Security",
    durationMinutes: 20,
    status: "active",
    content: "Recognize suspicious senders, urgent language, malicious links and unexpected attachments.",
    quizId: 1
  },
  {
    id: 2,
    title: "Password and MFA Good Practice",
    category: "Account Security",
    durationMinutes: 15,
    status: "active",
    content: "Use strong unique passwords, password managers and multi-factor authentication for critical systems.",
    quizId: 2
  },
  {
    id: 3,
    title: "Clean Desk and Data Handling",
    category: "Workplace Security",
    durationMinutes: 12,
    status: "draft",
    content: "Protect printed documents, lock screens and store sensitive information only in approved locations.",
    quizId: null
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
    json(response, 201, { result: withResultDetails(result) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/results") {
    json(response, 200, { results: results.map(withResultDetails) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/employee/assigned-training") {
    const username = url.searchParams.get("username") || "employee.demo";
    const user = users.find((item) => item.username === username) || users[1];
    json(response, 200, { user, assignedTraining: assignedFor(user) });
    return;
  }
  json(response, 404, { message: "Not found" });
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
