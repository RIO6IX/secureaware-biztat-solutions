import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import server from "../server/index.js";

let baseUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("health endpoint works", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("dashboard returns proposal-aligned compliance metrics", async () => {
  const response = await fetch(`${baseUrl}/api/compliance/dashboard?period=30&department=All`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.summary.employees, 10);
  assert.ok(data.summary.policyRate > 0);
  assert.ok(data.summary.trainingRate > 0);
  assert.ok(data.summary.quizPassRate > 0);
  assert.equal(data.trend.length, 7);
  assert.equal(data.departments.length, 5);
  assert.ok(data.overdue.every((item) => item.user && item.daysOverdue > 0));
});

test("department scope limits dashboard data", async () => {
  const response = await fetch(`${baseUrl}/api/compliance/dashboard?department=Development`);
  const data = await response.json();
  assert.equal(data.summary.employees, 1);
  assert.equal(data.departments.length, 1);
  assert.equal(data.departments[0].name, "Development");
  assert.ok(data.overdue.every((item) => item.user.department === "Development"));
});

test("reports support filtered JSON and downloadable CSV", async () => {
  const reportResponse = await fetch(`${baseUrl}/api/reports?type=policy&department=Marketing`);
  const report = await reportResponse.json();
  assert.equal(report.title, "Policy Acknowledgement Report");
  assert.equal(report.rows.length, 2);
  assert.ok(report.rows.every((row) => row.department === "Marketing"));

  const csvResponse = await fetch(`${baseUrl}/api/reports/export?type=training&department=All`);
  assert.match(csvResponse.headers.get("content-type"), /text\/csv/);
  assert.match(csvResponse.headers.get("content-disposition"), /secureaware-training-report\.csv/);
  const csv = await csvResponse.text();
  assert.match(csv, /quizScore/);
  assert.match(csv, /Nimal Perera/);
});

test("reminders update compliance state and create an audit-safe notification", async () => {
  const reminderResponse = await fetch(`${baseUrl}/api/reminders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemId: 1 })
  });
  assert.equal(reminderResponse.status, 201);
  const reminder = await reminderResponse.json();
  assert.equal(reminder.item.reminderSent, true);
  assert.equal(reminder.notification.type, "reminder");

  const dashboard = await (await fetch(`${baseUrl}/api/compliance/dashboard`)).json();
  assert.equal(dashboard.overdue.find((item) => item.id === 1).reminderSent, true);
});

test("policy module supports versioned creation, assignment and acknowledgement", async () => {
  const overviewResponse = await fetch(`${baseUrl}/api/policy/overview`);
  assert.equal(overviewResponse.status, 200);
  const overview = await overviewResponse.json();
  assert.ok(overview.summary.policies >= 4);
  assert.ok(overview.complianceRows.length > 0);

  const createResponse = await fetch(`${baseUrl}/api/policy/policies`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Data Classification Policy",
      category: "Data Protection",
      version: "1.0",
      status: "draft",
      summary: "Classify and protect business information.",
      content: "Employees must classify information before storage or sharing."
    })
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.policy.status, "draft");

  const publishResponse = await fetch(`${baseUrl}/api/policy/policies/${created.policy.id}/publish`, { method: "POST" });
  assert.equal(publishResponse.status, 200);

  const assignResponse = await fetch(`${baseUrl}/api/policy/assignments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ policyId: created.policy.id, targetType: "user", targetValue: "isuru.contractor" })
  });
  assert.equal(assignResponse.status, 201);

  const ackResponse = await fetch(`${baseUrl}/api/policy/policies/${created.policy.id}/acknowledge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: 8, statement: "I have read and understood this policy." })
  });
  assert.equal(ackResponse.status, 201);
  const acknowledgement = await ackResponse.json();
  assert.equal(acknowledgement.acknowledgement.policyVersion, "1.0");
});

test("learning portal returns training cards and records quiz marks", async () => {
  const overviewResponse = await fetch(`${baseUrl}/api/learning/overview`);
  assert.equal(overviewResponse.status, 200);
  const overview = await overviewResponse.json();
  assert.equal(overview.modules.length, 3);
  assert.ok(overview.rows.some((row) => row.status === "complete"));

  const quizResponse = await fetch(`${baseUrl}/api/learning/modules/1/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: 8, answers: [1, 0, 0] })
  });
  assert.equal(quizResponse.status, 201);
  const quiz = await quizResponse.json();
  assert.equal(quiz.attempt.score, 100);
  assert.equal(quiz.attempt.status, "passed");
});

test("notification settings and read state are interactive", async () => {
  const settingsResponse = await fetch(`${baseUrl}/api/notification-settings`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ weeklyDigest: false, overdue: true })
  });
  const settings = await settingsResponse.json();
  assert.equal(settings.settings.weeklyDigest, false);
  assert.equal(settings.settings.overdue, true);

  const readResponse = await fetch(`${baseUrl}/api/notifications/read-all`, { method: "POST" });
  assert.equal(readResponse.status, 200);
  const notifications = await (await fetch(`${baseUrl}/api/notifications`)).json();
  assert.equal(notifications.unreadCount, 0);
});

test("static responses include defensive security headers", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy"), /default-src 'self'/);
});
