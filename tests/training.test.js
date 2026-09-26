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
    const headers = { cookie };
    if (method !== "GET") headers["x-csrf-token"] = body.csrfToken;
    Object.assign(headers, extraHeaders);
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

async function completeAllLessons(session, slug) {
  const course = await session.get(`/api/training/courses/${slug}`);
  for (const lesson of course.body.lessons) {
    const result = await session.post(`/api/training/courses/${slug}/lessons/${lesson.position}/complete`);
    assert.equal(result.status, 200);
  }
}

test("lesson progress is recorded on the server in order and unlocks the quiz", async () => {
  const learner = await login("consultant.demo");
  const slug = "phishing-social-engineering";
  assert.equal((await learner.post(`/api/training/courses/${slug}/lessons/3/complete`)).status, 409);
  const noCsrf = await learner.raw("POST", `/api/training/courses/${slug}/lessons/1/complete`, {}, { "x-csrf-token": "wrong" });
  assert.equal(noCsrf.status, 403);
  await completeAllLessons(learner, slug);
  const again = await learner.post(`/api/training/courses/${slug}/lessons/1/complete`);
  assert.equal(again.status, 200);
  const course = await learner.get(`/api/training/courses/${slug}`);
  assert.equal(course.body.quiz.unlocked, true);
  assert.equal(course.body.state.status, "in_progress");
});

const FORBIDDEN_KEYS = ["is_correct", "isCorrect", "correctOptionIds", "correctOptions", "correctAnswer", "answerIndex"];
function assertNoCorrectness(value, where) {
  const walk = (node, trail) => {
    if (Array.isArray(node)) return node.forEach((item, index) => walk(item, `${trail}[${index}]`));
    if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        assert.ok(!FORBIDDEN_KEYS.includes(key), `${where}: correctness key "${key}" exposed at ${trail}`);
        walk(child, `${trail}.${key}`);
      }
    }
  };
  walk(value, "$");
}

function answerKey() {
  const db = new DatabaseSync(process.env.SECUREAWARE_DB);
  const rows = db.prepare("SELECT question_id, id, is_correct FROM training_options").all();
  db.close();
  const key = new Map();
  for (const row of rows) {
    if (!key.has(row.question_id)) key.set(row.question_id, { right: [], wrong: [] });
    key.get(row.question_id)[row.is_correct ? "right" : "wrong"].push(row.id);
  }
  return key;
}

function withDb(run) {
  const db = new DatabaseSync(process.env.SECUREAWARE_DB);
  try {
    return run(db);
  } finally {
    db.close();
  }
}

const answersFor = (attempt, correct) => {
  const key = answerKey();
  return attempt.questions.map((question) => ({
    questionId: question.id,
    optionIds: correct ? key.get(question.id).right : [key.get(question.id).wrong[0]]
  }));
};

test("the quiz stays locked until the server has every lesson complete", async () => {
  const employee = await login("employee.demo");
  const response = await employee.post("/api/training/courses/phishing-social-engineering/attempts");
  assert.equal(response.status, 403);
});

test("quiz answers are validated against the questions served in the attempt", async () => {
  const learner = await login("consultant.demo");
  const started = await learner.post("/api/training/courses/phishing-social-engineering/attempts");
  assert.equal(started.status, 201);
  const attempt = started.body.attempt;
  assert.equal(attempt.questions.length, 10);
  assertNoCorrectness(started.body, "quiz start");
  const options = attempt.questions[0].options.map((option) => option.id);
  assert.ok(options.length >= 2);

  const resumed = await learner.post("/api/training/courses/phishing-social-engineering/attempts");
  assert.equal(resumed.status, 200);
  assert.equal(resumed.body.attempt.id, attempt.id);
  assert.deepEqual(resumed.body.attempt.questions[0].options.map((option) => option.id), options, "option order is stable on resume");

  const served = new Set(attempt.questions.map((question) => question.id));
  const unserved = [...answerKey().keys()].find((questionId) => !served.has(questionId));
  const good = answersFor(attempt, true);
  const withForeign = [...good.slice(1), { questionId: unserved, optionIds: answerKey().get(unserved).right }];
  assert.equal((await learner.post(`/api/training/attempts/${attempt.id}/submit`, { answers: withForeign })).status, 400);
  assert.equal((await learner.post(`/api/training/attempts/${attempt.id}/submit`, { answers: good.slice(1) })).status, 400);
  const wrongOption = good.map((answer, index) => (index === 0 ? { ...answer, optionIds: [answerKey().get(good[1].questionId).right[0]] } : answer));
  assert.equal((await learner.post(`/api/training/attempts/${attempt.id}/submit`, { answers: wrongOption })).status, 400);
  assert.equal((await learner.post(`/api/training/attempts/${attempt.id}/submit`, { answers: "all" })).status, 400);
});

test("server scoring is correct and a pass issues a certificate", async () => {
  const learner = await login("consultant.demo");
  const started = await learner.post("/api/training/courses/phishing-social-engineering/attempts");
  const attempt = started.body.attempt;
  const submitted = await learner.post(`/api/training/attempts/${attempt.id}/submit`, { answers: answersFor(attempt, true) });
  assert.equal(submitted.status, 200);
  assert.equal(submitted.body.attempt.score, 100);
  assert.equal(submitted.body.attempt.passed, true);
  assert.match(submitted.body.certificateCode, /^SA-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.ok(submitted.body.review.every((item) => item.answeredCorrectly && item.explanation));
  assertNoCorrectness(submitted.body, "quiz submit");
  assert.equal((await learner.post(`/api/training/attempts/${attempt.id}/submit`, { answers: answersFor(attempt, true) })).status, 409);
  assert.equal((await learner.post("/api/training/courses/phishing-social-engineering/attempts")).status, 409);
});

test("cooldown and the attempt limit return 429", async () => {
  const learner = await login("dev.demo");
  const slug = "phishing-social-engineering";
  await completeAllLessons(learner, slug);
  const fail = async () => {
    const started = await learner.post(`/api/training/courses/${slug}/attempts`);
    assert.equal(started.status, 201);
    const result = await learner.post(`/api/training/attempts/${started.body.attempt.id}/submit`, { answers: answersFor(started.body.attempt, false) });
    assert.equal(result.body.attempt.passed, false);
    assert.equal(result.body.certificateCode, null);
    assert.ok(result.body.topicsToReview.length >= 1);
    assert.ok(result.body.review.every((item) => item.explanation === null), "explanations for wrong answers stay hidden until the course is passed");
    assertNoCorrectness(result.body, "failed result");
    return result.body;
  };
  const first = await fail();
  assert.equal(first.attemptsLeft, 2);
  const blocked = await learner.post(`/api/training/courses/${slug}/attempts`);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.body.retryAt);
  const endCooldown = () => withDb((db) => db.prepare("UPDATE quiz_attempts SET submitted_at = '2020-01-01T00:00:00.000Z' WHERE user_id = ?").run(learner.user.id));
  endCooldown();
  await fail();
  endCooldown();
  await fail();
  endCooldown();
  const exhausted = await learner.post(`/api/training/courses/${slug}/attempts`);
  assert.equal(exhausted.status, 429);
  assert.match(exhausted.body.message, /all 3 attempts/);
});

test("learners cannot read other learners' attempts", async () => {
  const other = await login("employee.demo");
  const owner = await login("dev.demo");
  const history = await owner.get(`/api/training/team/users/${owner.user.id}`);
  assert.equal(history.status, 403, "employees cannot use the team endpoint even for themselves");
  const attemptId = withDb((db) => db.prepare("SELECT id FROM quiz_attempts WHERE user_id = ? LIMIT 1").get(owner.user.id).id);
  assert.equal((await other.get(`/api/training/attempts/${attemptId}/result`)).status, 404);
  assert.equal((await other.get(`/api/training/attempts/${attemptId}`)).status, 404);
  assert.equal((await owner.get(`/api/training/attempts/${attemptId}/result`)).status, 200);
  const consultingManager = await login("manager.consulting");
  assert.equal((await consultingManager.get(`/api/training/attempts/${attemptId}/result`)).status, 404, "manager of another department");
});

test("quiz rate limiter blocks bursts per user and recovers after the window", async () => {
  const { createRateLimiter } = await import("../server/modules/training/rateLimit.js");
  const allow = createRateLimiter({ limit: 3, windowMs: 1000 });
  assert.ok(allow("7:quiz-start", 0).allowed);
  assert.ok(allow("7:quiz-start", 10).allowed);
  assert.ok(allow("7:quiz-start", 20).allowed);
  assert.equal(allow("7:quiz-start", 30).allowed, false);
  assert.ok(allow("8:quiz-start", 30).allowed, "other users are unaffected");
  assert.ok(allow("7:quiz-start", 1001).allowed);
});

test("certificates are private to the holder and verification reveals no personal data", async () => {
  const holder = await login("consultant.demo");
  const me = await holder.get("/api/training/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.summary.completed, 1);
  const code = me.body.certificates[0].code;
  assertNoCorrectness(me.body, "my learning");

  const own = await holder.get(`/api/training/me/certificates/${code}`);
  assert.equal(own.status, 200);
  assert.equal(own.body.certificate.learnerName, "Consultant Demo");
  assert.equal(own.body.certificate.score, 100);

  const stranger = await login("employee.demo");
  assert.equal((await stranger.get(`/api/training/me/certificates/${code}`)).status, 404);
  const verified = await stranger.get(`/api/training/certificates/${code}`);
  assert.deepEqual(Object.keys(verified.body).sort(), ["course", "issuedOn", "valid"]);
  assert.equal(verified.body.valid, true);
  assert.ok(!JSON.stringify(verified.body).includes("Consultant"));
  const fake = await stranger.get("/api/training/certificates/SA-0000-0000-0000-0000");
  assert.deepEqual(fake.body, { valid: false });
  const junk = await stranger.get("/api/training/certificates/%3Cscript%3E");
  assert.deepEqual(junk.body, { valid: false });
});
