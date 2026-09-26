import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secureaware-training-"));
process.env.SECUREAWARE_DB = path.join(tempDir, "training.sqlite");
const { default: server } = await import("../server/index.js");
const { courses } = await import("../server/modules/training/content/index.js");
const { migrate } = await import("../server/modules/training/schema.js");
const { seedCourses } = await import("../server/modules/training/seed.js");

let base;
test.before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const PASSWORDS = {
  "employee.demo": "EmployeePass!2026",
  "manager.demo": "ManagerPass!2026",
  "security.admin": "AdminPass!2026",
  "system.admin": "SystemPass!2026",
  "dev.demo": "DeveloperPass!2026",
  "consultant.demo": "ConsultantPass!2026",
  "manager.consulting": "ConsultManagerPass!2026"
};

async function login(username) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: PASSWORDS[username] })
  });
  assert.equal(response.status, 200, `login ${username}`);
  const body = await response.json();
  const cookie = response.headers.get("set-cookie").split(";", 1)[0];
  const call = async (method, url, payload, extraHeaders = {}) => {
    const headers = { cookie, ...extraHeaders };
    if (method !== "GET") headers["x-csrf-token"] = body.csrfToken;
    if (payload !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(`${base}${url}`, { method, headers, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, body: json, text, headers: res.headers };
  };
  return { user: body.user, cookie, csrf: body.csrfToken, get: (url) => call("GET", url), post: (url, payload = {}) => call("POST", url, payload), put: (url, payload = {}) => call("PUT", url, payload), del: (url) => call("DELETE", url), raw: call };
}

test("seed content meets the question bank rules for every course", () => {
  assert.ok(courses.length >= 1);
  for (const course of courses) {
    assert.ok(course.lessons.length >= 4 && course.lessons.length <= 6, `${course.slug} lesson count`);
    assert.ok(course.questions.length >= 12, `${course.slug} has at least 12 questions`);
    assert.ok(course.questions.length > course.questionsPerAttempt, `${course.slug} bank larger than one attempt`);
    for (const lesson of course.lessons) assert.ok(lesson.sources.length >= 1, `${course.slug} lesson "${lesson.title}" cites sources`);
    for (const question of course.questions) {
      const correct = question.options.filter(([, isCorrect]) => isCorrect).length;
      assert.ok(correct >= 1, `${course.slug}: "${question.prompt}" has a correct option`);
      if (question.type !== "multi") assert.equal(correct, 1, `${course.slug}: "${question.prompt}" has exactly one correct option`);
      if (question.type === "true_false") assert.equal(question.options.length, 2);
      assert.ok(question.lesson >= 1 && question.lesson <= course.lessons.length, `${course.slug}: question links to a lesson`);
    }
  }
});

test("schema migration and seed are safe to run more than once", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY)");
  migrate(db);
  migrate(db);
  assert.equal(seedCourses(db), courses.length);
  assert.equal(seedCourses(db), 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM training_courses").get().n, courses.length);
});


test("unauthenticated requests to the training API return 401", async () => {
  for (const url of ["/api/training/courses", "/api/training/courses/phishing-social-engineering", "/api/training/me"]) {
    const response = await fetch(`${base}${url}`);
    assert.equal(response.status, 401, url);
  }
  const post = await fetch(`${base}/api/training/courses/phishing-social-engineering/attempts`, { method: "POST" });
  assert.equal(post.status, 401);
});

test("learner catalogue and lesson reader work from the session identity", async () => {
  const employee = await login("employee.demo");
  const catalogue = await employee.get("/api/training/courses?tab=all");
  assert.equal(catalogue.status, 200);
  assert.ok(catalogue.body.courses.some((course) => course.slug === "phishing-social-engineering"));
  const course = await employee.get("/api/training/courses/phishing-social-engineering");
  assert.equal(course.status, 200);
  assert.ok(course.body.lessons.length >= 4);
  assert.equal(course.body.quiz.unlocked, false);
  const lesson = await employee.get("/api/training/courses/phishing-social-engineering/lessons/2");
  assert.equal(lesson.status, 200);
  assert.equal(lesson.body.nav.previous, 1);
  assert.ok(lesson.body.lesson.sources.length >= 1);
  assert.equal((await employee.get("/api/training/courses/not-a-course")).status, 404);
  assert.equal((await employee.get("/api/training/courses/BAD%20SLUG")).status, 400);
  assert.equal((await employee.get("/api/training/courses?tab=everything")).status, 400);
});

test("department managers only see their own department", async () => {
  const employee = await login("employee.demo");
  assert.equal((await employee.get("/api/training/team")).status, 403);

  const consultant = await login("consultant.demo");
  const financeManager = await login("manager.demo");
  const team = await financeManager.get("/api/training/team?department=Consulting");
  assert.equal(team.status, 200);
  assert.equal(team.body.department, "Finance");
  assert.ok(team.body.members.every((member) => member.user.department === "Finance"));
  assert.ok(team.body.members.some((member) => member.user.id === employee.user.id));

  assert.equal((await financeManager.get(`/api/training/team/users/${consultant.user.id}`)).status, 404);
  assert.equal((await financeManager.get(`/api/training/team/users/${employee.user.id}`)).status, 200);
  assert.equal((await financeManager.get("/api/training/team/users/abc")).status, 400);

  const consultingManager = await login("manager.consulting");
  assert.equal((await consultingManager.get(`/api/training/team/users/${consultant.user.id}`)).status, 200);
  assert.equal((await consultingManager.get(`/api/training/team/users/${employee.user.id}`)).status, 404);

  const admin = await login("security.admin");
  const all = await admin.get("/api/training/team");
  assert.ok(new Set(all.body.members.map((member) => member.user.department)).size >= 3);
});
