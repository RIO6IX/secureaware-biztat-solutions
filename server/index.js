import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 4000);

const daysFromNow = (offset) => {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const users = [
  { id: 1, name: "Nimal Perera", username: "nimal.manager", department: "Leadership", role: "Management", policiesAssigned: 6, policiesAcknowledged: 6, trainingAssigned: 4, trainingCompleted: 4, quizScore: 94, lastActivity: daysFromNow(-1) },
  { id: 2, name: "Ayesha Fernando", username: "ayesha.manager", department: "Leadership", role: "Management", policiesAssigned: 6, policiesAcknowledged: 5, trainingAssigned: 4, trainingCompleted: 4, quizScore: 88, lastActivity: daysFromNow(-2) },
  { id: 3, name: "Kavindu Silva", username: "kavindu.consultant", department: "Consulting", role: "Consultant", policiesAssigned: 5, policiesAcknowledged: 5, trainingAssigned: 4, trainingCompleted: 4, quizScore: 91, lastActivity: daysFromNow(-1) },
  { id: 4, name: "Dinithi Jayasinghe", username: "dinithi.consultant", department: "Consulting", role: "Consultant", policiesAssigned: 5, policiesAcknowledged: 4, trainingAssigned: 4, trainingCompleted: 3, quizScore: 76, lastActivity: daysFromNow(-4) },
  { id: 5, name: "Ravindu Senanayake", username: "ravindu.consultant", department: "Consulting", role: "Consultant", policiesAssigned: 5, policiesAcknowledged: 5, trainingAssigned: 4, trainingCompleted: 4, quizScore: 86, lastActivity: daysFromNow(-2) },
  { id: 6, name: "Tharushi Maduranga", username: "tharushi.marketing", department: "Marketing", role: "Marketing", policiesAssigned: 5, policiesAcknowledged: 4, trainingAssigned: 3, trainingCompleted: 2, quizScore: 68, lastActivity: daysFromNow(-7) },
  { id: 7, name: "Sahan Wijesinghe", username: "sahan.marketing", department: "Marketing", role: "Marketing", policiesAssigned: 5, policiesAcknowledged: 5, trainingAssigned: 3, trainingCompleted: 3, quizScore: 82, lastActivity: daysFromNow(-3) },
  { id: 8, name: "Isuru Gunawardena", username: "isuru.contractor", department: "Development", role: "External Contractor", policiesAssigned: 4, policiesAcknowledged: 3, trainingAssigned: 4, trainingCompleted: 2, quizScore: 64, lastActivity: daysFromNow(-9) },
  { id: 9, name: "Piumi Ekanayake", username: "piumi.intern", department: "Internship", role: "Intern", policiesAssigned: 4, policiesAcknowledged: 4, trainingAssigned: 3, trainingCompleted: 3, quizScore: 79, lastActivity: daysFromNow(-2) },
  { id: 10, name: "Chamod Rathnayake", username: "chamod.intern", department: "Internship", role: "Intern", policiesAssigned: 4, policiesAcknowledged: 3, trainingAssigned: 3, trainingCompleted: 2, quizScore: 72, lastActivity: daysFromNow(-6) }
];

const overdueItems = [
  { id: 1, userId: 8, category: "Policy", title: "Secure Development Policy v1.2", dueDate: daysFromNow(-9), severity: "high", reminderSent: false },
  { id: 2, userId: 6, category: "Training", title: "Phishing Awareness Refresher", dueDate: daysFromNow(-7), severity: "high", reminderSent: true },
  { id: 3, userId: 4, category: "Training", title: "Client Data Handling", dueDate: daysFromNow(-4), severity: "medium", reminderSent: false },
  { id: 4, userId: 2, category: "Policy", title: "Remote Working Policy v2.0", dueDate: daysFromNow(-3), severity: "medium", reminderSent: false },
  { id: 5, userId: 10, category: "Policy", title: "Acceptable Use Policy v1.0", dueDate: daysFromNow(-2), severity: "low", reminderSent: true }
];

let notifications = [
  { id: 1, type: "risk", title: "High-risk compliance item", message: "Secure Development Policy acknowledgement is 9 days overdue.", createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), read: false },
  { id: 2, type: "training", title: "Training completion improved", message: "Consulting reached 92% training completion this week.", createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), read: false },
  { id: 3, type: "policy", title: "Policy version published", message: "Remote Working Policy v2.0 is now included in compliance reporting.", createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), read: true },
  { id: 4, type: "report", title: "Weekly report ready", message: "The weekly executive compliance summary is ready to export.", createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), read: true }
];

let notificationSettings = {
  assignmentCreated: true,
  dueSoon: true,
  overdue: true,
  weeklyDigest: true
};

const auditEvents = [
  { id: 1, actor: "compliance.admin", action: "REPORT_VIEWED", target: "Executive compliance summary", createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
  { id: 2, actor: "system", action: "REMINDER_SENT", target: "Phishing Awareness Refresher", createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: 3, actor: "policy.admin", action: "POLICY_PUBLISHED", target: "Remote Working Policy v2.0", createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString() },
  { id: 4, actor: "training.admin", action: "TRAINING_ASSIGNED", target: "Client Data Handling", createdAt: new Date(Date.now() - 29 * 60 * 60 * 1000).toISOString() }
];

let nextTrainingModuleId = 5;
let nextTrainingAssignmentId = 5;
let nextTrainingResultId = 4;

const trainingModules = [
  {
    id: 1,
    title: "Phishing Recognition and Reporting",
    category: "Email Security",
    durationMinutes: 25,
    owner: "Information Security",
    status: "active",
    summary: "Recognise social engineering indicators, verify requests through trusted channels and report suspicious messages.",
    quiz: {
      passMark: 75,
      maxAttempts: 3,
      questions: [
        { prompt: "Which action best handles a suspicious payment request?", options: ["Reply asking for bank details", "Verify using an approved separate channel", "Forward it to personal email", "Approve it quickly"], answerIndex: 1 },
        { prompt: "Which item is a common phishing warning sign?", options: ["Unexpected urgency", "Known meeting invite", "Approved helpdesk ticket", "Monthly newsletter"], answerIndex: 0 },
        { prompt: "Where should suspicious emails be reported?", options: ["Approved reporting process", "Public chat group", "Personal inbox", "Deleted items only"], answerIndex: 0 }
      ]
    }
  },
  {
    id: 2,
    title: "Password Manager and MFA Behaviour",
    category: "Access Control",
    durationMinutes: 20,
    owner: "IT Security",
    status: "active",
    summary: "Use unique credentials, approved password managers and report unexpected MFA approval prompts.",
    quiz: {
      passMark: 70,
      maxAttempts: 3,
      questions: [
        { prompt: "What is the safest password practice?", options: ["Reuse a memorable password", "Use an approved password manager", "Store it in a notebook", "Share it with a manager"], answerIndex: 1 },
        { prompt: "Why report an unexpected MFA prompt?", options: ["It may indicate credential misuse", "It improves screen brightness", "It confirms payroll approval", "It is always harmless"], answerIndex: 0 }
      ]
    }
  },
  {
    id: 3,
    title: "Client Data Handling",
    category: "Data Protection",
    durationMinutes: 30,
    owner: "Compliance",
    status: "active",
    summary: "Classify, store and share client data through approved systems using least-privilege access.",
    quiz: {
      passMark: 80,
      maxAttempts: 2,
      questions: [
        { prompt: "Where should restricted client files be stored?", options: ["Approved company repository", "Personal cloud drive", "Unlabelled USB drive", "Public folder"], answerIndex: 0 },
        { prompt: "What should be checked before sharing client data?", options: ["Recipient need-to-know", "Recipient birthday", "Desktop wallpaper", "File colour"], answerIndex: 0 }
      ]
    }
  },
  {
    id: 4,
    title: "Secure Development Basics",
    category: "Application Security",
    durationMinutes: 35,
    owner: "Engineering Security",
    status: "draft",
    summary: "Introduces input validation, secure error handling, dependency awareness and safe code review routines.",
    quiz: {
      passMark: 75,
      maxAttempts: 3,
      questions: [
        { prompt: "Where should validation happen?", options: ["Only in CSS", "Server-side and client-side where useful", "Only in screenshots", "Never"], answerIndex: 1 },
        { prompt: "What should error messages avoid?", options: ["Sensitive internals", "Clear user language", "HTTP status codes", "Audit references"], answerIndex: 0 }
      ]
    }
  }
];

const trainingAssignments = [
  { id: 1, moduleId: 1, targetType: "department", targetValue: "Marketing", dueDate: daysFromNow(10), status: "assigned" },
  { id: 2, moduleId: 2, targetType: "role", targetValue: "Consultant", dueDate: daysFromNow(14), status: "assigned" },
  { id: 3, moduleId: 3, targetType: "department", targetValue: "Consulting", dueDate: daysFromNow(-4), status: "assigned" },
  { id: 4, moduleId: 4, targetType: "department", targetValue: "Development", dueDate: daysFromNow(21), status: "assigned" }
];

const trainingResults = [
  { id: 1, userId: 3, moduleId: 2, attemptNumber: 1, score: 100, status: "passed", submittedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString() },
  { id: 2, userId: 4, moduleId: 3, attemptNumber: 1, score: 50, status: "failed", submittedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() },
  { id: 3, userId: 7, moduleId: 1, attemptNumber: 1, score: 67, status: "failed", submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() }
];

const trendByPeriod = {
  30: [72, 75, 77, 79, 82, 84, 86],
  60: [64, 67, 70, 73, 77, 81, 86],
  90: [58, 62, 66, 70, 75, 80, 86]
};

function percent(completed, total) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function riskFor(user) {
  const policyRate = percent(user.policiesAcknowledged, user.policiesAssigned);
  const trainingRate = percent(user.trainingCompleted, user.trainingAssigned);
  if (policyRate < 80 || trainingRate < 70 || user.quizScore < 70) return "high";
  if (policyRate < 100 || trainingRate < 100 || user.quizScore < 80) return "medium";
  return "low";
}

function filteredUsers(department) {
  return !department || department === "All"
    ? users
    : users.filter((user) => user.department === department);
}

function buildDashboard(department = "All", period = 30) {
  const selectedUsers = filteredUsers(department);
  const policiesAssigned = selectedUsers.reduce((sum, user) => sum + user.policiesAssigned, 0);
  const policiesAcknowledged = selectedUsers.reduce((sum, user) => sum + user.policiesAcknowledged, 0);
  const trainingAssigned = selectedUsers.reduce((sum, user) => sum + user.trainingAssigned, 0);
  const trainingCompleted = selectedUsers.reduce((sum, user) => sum + user.trainingCompleted, 0);
  const quizzesPassed = selectedUsers.filter((user) => user.quizScore >= 70).length;
  const policyRate = percent(policiesAcknowledged, policiesAssigned);
  const trainingRate = percent(trainingCompleted, trainingAssigned);
  const quizPassRate = percent(quizzesPassed, selectedUsers.length);
  const overallRate = Math.round((policyRate + trainingRate + quizPassRate) / 3);
  const selectedIds = new Set(selectedUsers.map((user) => user.id));
  const selectedOverdue = overdueItems
    .filter((item) => selectedIds.has(item.userId))
    .map((item) => ({
      ...item,
      user: users.find((user) => user.id === item.userId),
      daysOverdue: Math.max(1, Math.ceil((Date.now() - new Date(`${item.dueDate}T23:59:59Z`).getTime()) / 86400000))
    }));

  const departments = [...new Set(selectedUsers.map((user) => user.department))].map((name) => {
    const members = selectedUsers.filter((user) => user.department === name);
    const assignedPolicies = members.reduce((sum, user) => sum + user.policiesAssigned, 0);
    const acknowledgedPolicies = members.reduce((sum, user) => sum + user.policiesAcknowledged, 0);
    const assignedTraining = members.reduce((sum, user) => sum + user.trainingAssigned, 0);
    const completedTraining = members.reduce((sum, user) => sum + user.trainingCompleted, 0);
    const departmentPolicyRate = percent(acknowledgedPolicies, assignedPolicies);
    const departmentTrainingRate = percent(completedTraining, assignedTraining);
    const departmentQuizRate = percent(members.filter((user) => user.quizScore >= 70).length, members.length);
    return {
      name,
      employees: members.length,
      policyRate: departmentPolicyRate,
      trainingRate: departmentTrainingRate,
      overallRate: Math.round((departmentPolicyRate + departmentTrainingRate + departmentQuizRate) / 3)
    };
  });

  const risks = { low: 0, medium: 0, high: 0 };
  selectedUsers.forEach((user) => { risks[riskFor(user)] += 1; });
  const periodValues = trendByPeriod[period] || trendByPeriod[30];
  const trend = periodValues.map((value, index) => ({
    label: `W${index + 1}`,
    value: department === "All" ? value : Math.max(45, Math.min(99, value + overallRate - periodValues.at(-1)))
  }));

  return {
    filters: { department, period, departments: ["All", ...new Set(users.map((user) => user.department))] },
    summary: {
      overallRate,
      policyRate,
      trainingRate,
      quizPassRate,
      overdueCount: selectedOverdue.length,
      highRiskCount: risks.high,
      employees: selectedUsers.length,
      unreadNotifications: notifications.filter((notification) => !notification.read).length
    },
    trend,
    departments,
    risks,
    overdue: selectedOverdue,
    activity: auditEvents.slice(0, 6),
    lastUpdated: new Date().toISOString()
  };
}

function reportRows(type, department = "All") {
  const selectedUsers = filteredUsers(department);
  if (type === "executive") {
    return buildDashboard(department).departments.map((item) => ({
      department: item.name,
      employees: item.employees,
      policyCompliance: `${item.policyRate}%`,
      trainingCompletion: `${item.trainingRate}%`,
      overallCompliance: `${item.overallRate}%`
    }));
  }
  if (type === "policy") {
    return selectedUsers.map((user) => ({
      employee: user.name,
      department: user.department,
      assigned: user.policiesAssigned,
      acknowledged: user.policiesAcknowledged,
      compliance: `${percent(user.policiesAcknowledged, user.policiesAssigned)}%`,
      status: user.policiesAcknowledged === user.policiesAssigned ? "Compliant" : "Action required"
    }));
  }
  if (type === "training") {
    return selectedUsers.map((user) => ({
      employee: user.name,
      department: user.department,
      assigned: user.trainingAssigned,
      completed: user.trainingCompleted,
      quizScore: `${user.quizScore}%`,
      status: user.trainingCompleted === user.trainingAssigned && user.quizScore >= 70 ? "Completed" : "Action required"
    }));
  }
  return selectedUsers.map((user) => ({
    employee: user.name,
    department: user.department,
    role: user.role,
    policyRate: `${percent(user.policiesAcknowledged, user.policiesAssigned)}%`,
    trainingRate: `${percent(user.trainingCompleted, user.trainingAssigned)}%`,
    quizScore: `${user.quizScore}%`,
    risk: riskFor(user)
  }));
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  if (!rows.length) return "No data\n";
  const headers = Object.keys(rows[0]);
  return [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

function trainingMatches(user, assignment) {
  if (assignment.targetType === "department") return user.department === assignment.targetValue;
  if (assignment.targetType === "role") return user.role === assignment.targetValue;
  return user.username === assignment.targetValue;
}

function trainingModuleById(id) {
  return trainingModules.find((module) => module.id === Number(id));
}

function publicTrainingModule(module) {
  return {
    ...module,
    quiz: {
      passMark: module.quiz.passMark,
      maxAttempts: module.quiz.maxAttempts,
      questions: module.quiz.questions.map((question, index) => ({
        id: `${module.id}-${index + 1}`,
        prompt: question.prompt,
        options: question.options.map((text, optionIndex) => ({ id: optionIndex, text }))
      }))
    }
  };
}

function bestTrainingResult(userId, moduleId) {
  const attempts = trainingResults.filter((result) => result.userId === userId && result.moduleId === moduleId);
  return attempts.find((result) => result.status === "passed") || attempts.at(-1) || null;
}

function trainingComplianceRows() {
  return trainingAssignments.flatMap((assignment) => users
    .filter((user) => trainingMatches(user, assignment))
    .map((user) => {
      const module = trainingModuleById(assignment.moduleId);
      const result = bestTrainingResult(user.id, module.id);
      const overdue = assignment.dueDate && new Date(`${assignment.dueDate}T23:59:59Z`) < new Date();
      return {
        assignmentId: assignment.id,
        employee: user.name,
        department: user.department,
        role: user.role,
        module: module.title,
        category: module.category,
        dueDate: assignment.dueDate,
        score: result?.score ?? null,
        status: result?.status === "passed" ? "complete" : overdue ? "overdue" : "pending",
        submittedAt: result?.submittedAt ?? null
      };
    }));
}

function trainingOverview() {
  const rows = trainingComplianceRows();
  const completed = rows.filter((row) => row.status === "complete").length;
  const passed = trainingResults.filter((result) => result.status === "passed").length;
  return {
    summary: {
      modules: trainingModules.length,
      activeModules: trainingModules.filter((module) => module.status === "active").length,
      assignments: trainingAssignments.length,
      attempts: trainingResults.length,
      completionRate: percent(completed, rows.length),
      passRate: percent(passed, trainingResults.length),
      overdue: rows.filter((row) => row.status === "overdue").length
    },
    modules: trainingModules.map(publicTrainingModule),
    assignments: trainingAssignments.map((assignment) => ({ ...assignment, module: trainingModuleById(assignment.moduleId) })),
    complianceRows: rows,
    results: trainingResults.map((result) => ({ ...result, user: users.find((user) => user.id === result.userId), module: trainingModuleById(result.moduleId) })),
    researchBasis: [
      { source: "NIST SP 800-50", use: "Treats awareness as a managed program with role-based content, measurements and updates." },
      { source: "NIST CSF 2.0 PR.AT", use: "Connects training completion to protect-function awareness outcomes." },
      { source: "CISA Secure Our World", use: "Uses phishing, passwords, MFA and reporting as practical employee topics." },
      { source: "OWASP ASVS", use: "Keeps quiz scoring on the server so answers are not trusted from the browser." }
    ]
  };
}

function contentType(filePath) {
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function securityHeaders(contentTypeValue) {
  return {
    "content-type": contentTypeValue,
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()"
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, securityHeaders("application/json; charset=utf-8"));
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error("Request body is too large");
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function serveFile(response, requestPath) {
  const safeRequestPath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const resolved = path.resolve(publicDir, safeRequestPath);
  const relative = path.relative(publicDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    response.writeHead(404, securityHeaders("text/plain; charset=utf-8"));
    response.end("Not found");
    return;
  }
  const filePath = fs.existsSync(resolved) && fs.statSync(resolved).isFile() ? resolved : path.join(publicDir, "index.html");
  response.writeHead(200, securityHeaders(contentType(filePath)));
  fs.createReadStream(filePath).pipe(response);
}

async function handleApi(request, response, url) {
  const { pathname, searchParams } = url;

  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/compliance/dashboard") {
    sendJson(response, 200, buildDashboard(searchParams.get("department") || "All", Number(searchParams.get("period") || 30)));
    return true;
  }
  if (request.method === "GET" && pathname === "/api/training/overview") {
    sendJson(response, 200, trainingOverview());
    return true;
  }
  if (request.method === "GET" && pathname === "/api/training/modules") {
    sendJson(response, 200, { modules: trainingModules.map(publicTrainingModule) });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/training/modules") {
    const body = await readJson(request);
    if (!body.title || !body.summary) {
      sendJson(response, 400, { message: "Title and summary are required." });
      return true;
    }
    const module = {
      id: nextTrainingModuleId++,
      title: String(body.title).trim(),
      category: String(body.category || "Security Awareness").trim(),
      durationMinutes: Number(body.durationMinutes || 15),
      owner: String(body.owner || "Information Security").trim(),
      status: body.status === "draft" ? "draft" : "active",
      summary: String(body.summary).trim(),
      quiz: {
        passMark: Number(body.passMark || 70),
        maxAttempts: 3,
        questions: [
          { prompt: "Which action should employees take first?", options: ["Follow approved security process", "Use personal email", "Ignore policy", "Share credentials"], answerIndex: 0 },
          { prompt: "Why is this training measured?", options: ["To evidence awareness and reduce risk", "To collect passwords", "To replace managers", "To bypass policy"], answerIndex: 0 }
        ]
      }
    };
    trainingModules.push(module);
    auditEvents.unshift({ id: Math.max(0, ...auditEvents.map((event) => event.id)) + 1, actor: "training.admin", action: "TRAINING_MODULE_CREATED", target: module.title, createdAt: new Date().toISOString() });
    sendJson(response, 201, { module: publicTrainingModule(module) });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/training/assignments") {
    const body = await readJson(request);
    if (!trainingModuleById(body.moduleId)) {
      sendJson(response, 400, { message: "Valid training module is required." });
      return true;
    }
    const assignment = {
      id: nextTrainingAssignmentId++,
      moduleId: Number(body.moduleId),
      targetType: ["department", "role", "user"].includes(body.targetType) ? body.targetType : "department",
      targetValue: String(body.targetValue || "Consulting").trim(),
      dueDate: String(body.dueDate || daysFromNow(14)),
      status: "assigned"
    };
    trainingAssignments.push(assignment);
    auditEvents.unshift({ id: Math.max(0, ...auditEvents.map((event) => event.id)) + 1, actor: "training.admin", action: "TRAINING_ASSIGNED", target: `${assignment.targetType}:${assignment.targetValue}`, createdAt: new Date().toISOString() });
    sendJson(response, 201, { assignment: { ...assignment, module: trainingModuleById(assignment.moduleId) } });
    return true;
  }
  const trainingSubmitMatch = pathname.match(/^\/api\/training\/modules\/(\d+)\/submit$/);
  if (request.method === "POST" && trainingSubmitMatch) {
    const module = trainingModuleById(trainingSubmitMatch[1]);
    if (!module) {
      sendJson(response, 404, { message: "Training module not found." });
      return true;
    }
    const body = await readJson(request);
    const user = users.find((entry) => entry.id === Number(body.userId)) || users.find((entry) => entry.username === body.username) || users[0];
    const attempts = trainingResults.filter((result) => result.userId === user.id && result.moduleId === module.id);
    if (attempts.length >= module.quiz.maxAttempts && !attempts.some((attempt) => attempt.status === "passed")) {
      sendJson(response, 429, { message: "Maximum attempts reached for this module." });
      return true;
    }
    const answers = Array.isArray(body.answers) ? body.answers.map(Number) : [];
    const correct = module.quiz.questions.filter((question, index) => question.answerIndex === answers[index]).length;
    const score = Math.round((correct / module.quiz.questions.length) * 100);
    const result = {
      id: nextTrainingResultId++,
      userId: user.id,
      moduleId: module.id,
      attemptNumber: attempts.length + 1,
      score,
      status: score >= module.quiz.passMark ? "passed" : "failed",
      submittedAt: new Date().toISOString()
    };
    trainingResults.push(result);
    auditEvents.unshift({ id: Math.max(0, ...auditEvents.map((event) => event.id)) + 1, actor: user.username, action: "TRAINING_QUIZ_SUBMITTED", target: `${module.title} - ${score}%`, createdAt: result.submittedAt });
    sendJson(response, 201, { result });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/reports") {
    const type = searchParams.get("type") || "executive";
    const department = searchParams.get("department") || "All";
    const titles = { executive: "Executive Compliance Summary", policy: "Policy Acknowledgement Report", training: "Training and Quiz Report", risk: "Employee Risk Review" };
    sendJson(response, 200, { title: titles[type] || titles.executive, type, department, generatedAt: new Date().toISOString(), rows: reportRows(type, department) });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/reports/export") {
    const type = searchParams.get("type") || "executive";
    const department = searchParams.get("department") || "All";
    response.writeHead(200, { ...securityHeaders("text/csv; charset=utf-8"), "content-disposition": `attachment; filename="secureaware-${type}-report.csv"` });
    response.end(toCsv(reportRows(type, department)));
    return true;
  }
  if (request.method === "GET" && pathname === "/api/notifications") {
    sendJson(response, 200, { notifications: notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), unreadCount: notifications.filter((notification) => !notification.read).length, settings: notificationSettings });
    return true;
  }
  if (request.method === "POST" && /^\/api\/notifications\/\d+\/read$/.test(pathname)) {
    const notification = notifications.find((item) => item.id === Number(pathname.split("/")[3]));
    if (!notification) {
      sendJson(response, 404, { message: "Notification not found" });
      return true;
    }
    notification.read = true;
    sendJson(response, 200, { notification });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/notifications/read-all") {
    notifications.forEach((notification) => { notification.read = true; });
    sendJson(response, 200, { ok: true });
    return true;
  }
  if (request.method === "PATCH" && pathname === "/api/notification-settings") {
    const body = await readJson(request);
    for (const key of Object.keys(notificationSettings)) if (typeof body[key] === "boolean") notificationSettings[key] = body[key];
    sendJson(response, 200, { settings: notificationSettings });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/reminders") {
    const body = await readJson(request);
    const item = overdueItems.find((entry) => entry.id === Number(body.itemId));
    if (!item) {
      sendJson(response, 404, { message: "Compliance item not found" });
      return true;
    }
    const user = users.find((entry) => entry.id === item.userId);
    item.reminderSent = true;
    const notification = { id: Math.max(0, ...notifications.map((entry) => entry.id)) + 1, type: "reminder", title: "Reminder sent", message: `${item.title} reminder sent to ${user.name}.`, createdAt: new Date().toISOString(), read: false };
    notifications = [notification, ...notifications];
    auditEvents.unshift({ id: Math.max(0, ...auditEvents.map((event) => event.id)) + 1, actor: "compliance.admin", action: "REMINDER_SENT", target: `${item.title} - ${user.name}`, createdAt: new Date().toISOString() });
    sendJson(response, 201, { notification, item });
    return true;
  }
  if (pathname.startsWith("/api/")) {
    sendJson(response, 404, { message: "API endpoint not found" });
    return true;
  }
  return false;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  try {
    if (await handleApi(request, response, url)) return;
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, securityHeaders("text/plain; charset=utf-8"));
      response.end("Method not allowed");
      return;
    }
    serveFile(response, url.pathname);
  } catch (error) {
    sendJson(response, 400, { message: error.message || "Request failed" });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, "127.0.0.1", () => console.log(`SecureAware running at http://127.0.0.1:${port}`));
}

export default server;
