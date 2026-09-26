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

