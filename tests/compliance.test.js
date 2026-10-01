// Compliance dashboard tests, ported from the shaeed028 branch to the authenticated API.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secureaware-compliance-"));
process.env.SECUREAWARE_DB = path.join(tempDir, "compliance.sqlite");
const { default: server } = await import("../server/index.js");
const { riskFor } = await import("../server/modules/compliance/index.js");

let base;
test.before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const PASSWORDS = { "employee.demo": "EmployeePass!2026", "manager.demo": "ManagerPass!2026", "security.admin": "AdminPass!2026" };

async function login(username) {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password: PASSWORDS[username] }) });
  const body = await response.json();
  const cookie = response.headers.get("set-cookie").split(";", 1)[0];
  const call = async (method, url, payload) => {
    const headers = { cookie, "x-csrf-token": body.csrfToken };
    if (payload !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(`${base}${url}`, { method, headers, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, body: json, text, headers: res.headers };
  };
  return { user: body.user, get: (url) => call("GET", url), post: (url, payload = {}) => call("POST", url, payload) };
}

test("dashboard requires a session and a manager or admin role", async () => {
  assert.equal((await fetch(`${base}/api/compliance/dashboard`)).status, 401);
  const employee = await login("employee.demo");
  assert.equal((await employee.get("/api/compliance/dashboard")).status, 403);
  assert.equal((await employee.get("/api/compliance/reports")).status, 403);
});

test("dashboard returns live compliance metrics built from policy and training data", async () => {
  const admin = await login("security.admin");
  const response = await admin.get("/api/compliance/dashboard?period=60");
  assert.equal(response.status, 200);
  const { summary, trend, departments, risks, overdue, filters } = response.body;
  for (const key of ["overallRate", "policyRate", "trainingRate", "quizPassRate"]) assert.ok(summary[key] >= 0 && summary[key] <= 100, key);
  assert.equal(summary.overallRate, Math.round((summary.policyRate + summary.trainingRate + summary.quizPassRate) / 3));
  assert.equal(trend.length, 7);
  assert.equal(filters.period, 60);
  assert.ok(departments.length >= 3);
  assert.equal(risks.low + risks.medium + risks.high, summary.employees);
  assert.ok(overdue.every((item) => item.daysOverdue >= 1 && ["Policy", "Training"].includes(item.category)));
});

test("department scope limits dashboard data and managers are pinned to their own department", async () => {
  const admin = await login("security.admin");
  const finance = await admin.get("/api/compliance/dashboard?department=Finance");
  assert.ok(finance.body.departments.every((item) => item.name === "Finance"));
  const manager = await login("manager.demo");
  const response = await manager.get("/api/compliance/dashboard?department=Consulting");
  assert.equal(response.body.filters.department, "Finance");
  assert.ok(response.body.departments.every((item) => item.name === "Finance"));
  assert.ok(response.body.overdue.every((item) => item.user.department === "Finance"));
  assert.deepEqual(response.body.activity, [], "audit activity is for admins only");
});

test("reports support filtered JSON and a formula-safe CSV download", async () => {
  const admin = await login("security.admin");
  for (const type of ["executive", "policy", "training", "risk"]) {
    const report = await admin.get(`/api/compliance/reports?type=${type}`);
    assert.equal(report.status, 200);
    assert.equal(report.body.type, type);
    assert.ok(report.body.rows.length > 0, type);
  }
  const db = new DatabaseSync(process.env.SECUREAWARE_DB);
  db.prepare("UPDATE users SET display_name = ? WHERE username = 'employee.demo'").run("=cmd|' /C calc'!A0");
  const csv = await admin.get("/api/compliance/reports.csv?type=risk");
  db.prepare("UPDATE users SET display_name = 'Employee Demo' WHERE username = 'employee.demo'").run();
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get("content-type"), /text\/csv/);
  assert.match(csv.headers.get("content-disposition"), /secureaware-risk-report\.csv/);
  assert.ok(csv.text.includes("\"'=cmd"));
  const actions = db.prepare("SELECT action FROM audit_events WHERE action IN ('REPORT_VIEWED','REPORT_EXPORTED')").all().map((row) => row.action);
  assert.ok(actions.includes("REPORT_VIEWED") && actions.includes("REPORT_EXPORTED"));
  db.close();
});

test("reminders notify the employee, are scoped, throttled and audited", async () => {
  const manager = await login("manager.demo");
  const employee = await login("employee.demo");
  const dashboard = await manager.get("/api/compliance/dashboard");
  const item = dashboard.body.overdue.find((entry) => entry.user.id === employee.user.id)
    || { user: employee.user, kind: "policy", slug: "password-authentication" };
  const sent = await manager.post("/api/compliance/reminders", { userId: employee.user.id, kind: item.kind, slug: item.slug });
  assert.equal(sent.status, 201, sent.text);
  assert.equal((await manager.post("/api/compliance/reminders", { userId: employee.user.id, kind: item.kind, slug: item.slug })).status, 429);
  const consultant = new DatabaseSync(process.env.SECUREAWARE_DB).prepare("SELECT id FROM users WHERE username = 'consultant.demo'").get();
  assert.equal((await manager.post("/api/compliance/reminders", { userId: consultant.id, kind: "policy", slug: "acceptable-use" })).status, 404);
  assert.equal((await manager.post("/api/compliance/reminders", { userId: "x", kind: "policy", slug: "acceptable-use" })).status, 400);
  const notes = await employee.get("/api/notifications");
  assert.ok(notes.body.notifications.some((note) => note.title.startsWith("Reminder:")));
});

test("notifications can all be marked read by their owner", async () => {
  const employee = await login("employee.demo");
  const before = await employee.get("/api/notifications");
  assert.ok(before.body.unreadCount > 0);
  const result = await employee.post("/api/compliance/notifications/read-all");
  assert.equal(result.status, 200);
  assert.equal((await employee.get("/api/notifications")).body.unreadCount, 0);
});

test("risk rule matches the original dashboard thresholds", () => {
  assert.equal(riskFor({ policyRate: 70, trainingRate: 100, quizScore: 95 }), "high");
  assert.equal(riskFor({ policyRate: 100, trainingRate: 60, quizScore: 95 }), "high");
  assert.equal(riskFor({ policyRate: 100, trainingRate: 100, quizScore: 65 }), "high");
  assert.equal(riskFor({ policyRate: 90, trainingRate: 100, quizScore: 95 }), "medium");
  assert.equal(riskFor({ policyRate: 100, trainingRate: 100, quizScore: 75 }), "medium");
  assert.equal(riskFor({ policyRate: 100, trainingRate: 100, quizScore: null }), "low");
});

test("static responses include defensive security headers", async () => {
  const response = await fetch(`${base}/`);
  assert.match(response.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
});
