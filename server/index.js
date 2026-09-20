import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 4000);

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
  if (request.method === "GET" && url.pathname === "/api/policies") {
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    let rows = policies;
    if (status) rows = rows.filter((policy) => policy.status === status);
    if (category) rows = rows.filter((policy) => policy.category === category);
    json(response, 200, { policies: rows.map(withPolicyStats) });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/policies") {
    const body = await readJson(request);
    if (!body.title || !body.content) return json(response, 400, { message: "Title and content are required." });
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
    json(response, 201, { policy: withPolicyStats(policy) });
    return;
  }
  const policyMatch = url.pathname.match(/^\/api\/policies\/(\d+)$/);
  if (request.method === "PATCH" && policyMatch) {
    const policy = policies.find((item) => item.id === Number(policyMatch[1]));
    if (!policy) return json(response, 404, { message: "Policy not found." });
    Object.assign(policy, pick(await readJson(request), ["title", "category", "version", "owner", "effectiveDate", "summary", "content"]));
    json(response, 200, { policy: withPolicyStats(policy) });
    return;
  }
  const actionMatch = url.pathname.match(/^\/api\/policies\/(\d+)\/(publish|archive)$/);
  if (request.method === "POST" && actionMatch) {
    const policy = policies.find((item) => item.id === Number(actionMatch[1]));
    if (!policy) return json(response, 404, { message: "Policy not found." });
    policy.status = actionMatch[2] === "publish" ? "published" : "archived";
    if (policy.status === "published" && !policy.effectiveDate) policy.effectiveDate = new Date().toISOString().slice(0, 10);
    json(response, 200, { policy: withPolicyStats(policy) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/assignments") {
    json(response, 200, { assignments: assignments.map(withPolicy) });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/assignments") {
    const body = await readJson(request);
    if (!policies.some((policy) => policy.id === Number(body.policyId))) return json(response, 400, { message: "Invalid policy." });
    const assignment = {
      id: nextAssignmentId++,
      policyId: Number(body.policyId),
      targetType: ["role", "department", "user"].includes(body.targetType) ? body.targetType : "role",
      targetValue: String(body.targetValue || "Employee").trim(),
      dueDate: String(body.dueDate || ""),
      status: "assigned"
    };
    assignments.push(assignment);
    json(response, 201, { assignment: withPolicy(assignment) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/acknowledgements") {
    json(response, 200, { acknowledgements: acknowledgements.map(withAcknowledgementDetails) });
    return;
  }
  const ackMatch = url.pathname.match(/^\/api\/policies\/(\d+)\/acknowledge$/);
  if (request.method === "POST" && ackMatch) {
    const policy = policies.find((item) => item.id === Number(ackMatch[1]));
    if (!policy || policy.status !== "published") return json(response, 400, { message: "Only published policies can be acknowledged." });
    const body = await readJson(request);
    const user = users.find((item) => item.username === body.username) || users[1];
    if (!isAssignedTo(user, policy.id)) return json(response, 403, { message: "Policy is not assigned to this user." });
    const existing = acknowledgements.find((item) => item.userId === user.id && item.policyId === policy.id && item.policyVersion === policy.version);
    if (existing) return json(response, 200, { acknowledgement: withAcknowledgementDetails(existing) });
    const acknowledgement = {
      id: nextAcknowledgementId++,
      policyId: policy.id,
      policyVersion: policy.version,
      userId: user.id,
      acknowledgedAt: new Date().toISOString(),
      statement: String(body.statement || "I have read and understood this policy.")
    };
    acknowledgements.push(acknowledgement);
    json(response, 201, { acknowledgement: withAcknowledgementDetails(acknowledgement) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/employee/policies") {
    const username = url.searchParams.get("username") || "employee.demo";
    const user = users.find((item) => item.username === username) || users[1];
    json(response, 200, { user, assignedPolicies: assignedPoliciesFor(user) });
    return;
  }
  json(response, 404, { message: "Not found" });
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
