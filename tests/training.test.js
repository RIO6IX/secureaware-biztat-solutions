import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secureaware-training-"));
process.env.SECUREAWARE_DB = path.join(tempDir, "training.sqlite");
process.env.SECUREAWARE_DEMO_DATA = "off";
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
  withDb((db) => db.prepare("UPDATE users SET department = 'Development' WHERE username = 'manager.consulting'").run());
  assert.equal((await consultingManager.get(`/api/training/attempts/${attemptId}/result`)).status, 404, "managers never see individual answers, even in their own department");
  assert.equal((await consultingManager.get(`/api/training/team/users/${owner.user.id}`)).status, 200, "but they do see their own team's status");
  withDb((db) => db.prepare("UPDATE users SET department = 'Consulting' WHERE username = 'manager.consulting'").run());
  const admin = await login("security.admin");
  assert.equal((await admin.get(`/api/training/attempts/${attemptId}/result`)).status, 200);
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

const newCourse = {
  title: "Test Course for Builder",
  category: "Testing",
  level: "Foundation",
  summary: "A course created by the automated tests.",
  description: "Created by tests.",
  learningObjectives: ["Check the builder"],
  durationMinutes: 10,
  audienceNote: "",
  cover: "shield",
  passMark: 80,
  maxAttempts: 3,
  cooldownMinutes: 0,
  questionsPerAttempt: 2,
  openToAll: true
};
const newQuestion = (prompt, lessonId = null) => ({
  type: "single", prompt, scenarioText: "", explanation: "Because the test says so.", difficulty: 1, lessonId,
  options: [{ text: "Right answer", isCorrect: true }, { text: "Wrong answer", isCorrect: false }]
});

test("employees and managers cannot use the course builder endpoints", async () => {
  for (const username of ["employee.demo", "manager.demo"]) {
    const session = await login(username);
    assert.equal((await session.get("/api/training/admin/courses")).status, 403, username);
    assert.equal((await session.post("/api/training/admin/courses", newCourse)).status, 403, username);
    assert.equal((await session.put("/api/training/admin/questions/1", newQuestion("Changed?"))).status, 403, username);
    assert.equal((await session.post("/api/training/admin/courses/1/publish")).status, 403, username);
  }
});

test("course builder validates questions and versions published courses", async () => {
  const admin = await login("security.admin");
  assert.equal((await admin.post("/api/training/admin/courses", { ...newCourse, passMark: "high" })).status, 400);
  const created = await admin.post("/api/training/admin/courses", newCourse);
  assert.equal(created.status, 201);
  const courseId = created.body.course.id;
  assert.equal(created.body.course.status, "draft");

  assert.equal((await admin.post(`/api/training/admin/courses/${courseId}/publish`)).status, 400, "cannot publish an empty course");
  const withLesson = await admin.post(`/api/training/admin/courses/${courseId}/lessons`, {
    title: "Only lesson", bodyMarkdown: "## Heading\n\nSome <script>alert(1)</script> text for the lesson body.", keyTakeaways: ["One"], estimatedMinutes: 3,
    interactive: null, sources: [{ title: "OWASP Top 10", url: "https://owasp.org/Top10/" }]
  });
  assert.equal(withLesson.status, 201);
  const lessonId = withLesson.body.course.lessons[0].id;
  assert.equal((await admin.post(`/api/training/admin/courses/${courseId}/lessons`, { title: "Bad", bodyMarkdown: "x".repeat(30), estimatedMinutes: 2, sources: [{ title: "Bad link", url: "javascript:alert(1)" }] })).status, 400);

  const noCorrect = { ...newQuestion("No correct option?"), options: [{ text: "A", isCorrect: false }, { text: "B", isCorrect: false }] };
  assert.equal((await admin.post(`/api/training/admin/courses/${courseId}/questions`, noCorrect)).status, 400);
  const twoCorrect = { ...newQuestion("Two correct on single?"), options: [{ text: "A", isCorrect: true }, { text: "B", isCorrect: true }] };
  assert.equal((await admin.post(`/api/training/admin/courses/${courseId}/questions`, twoCorrect)).status, 400);
  assert.equal((await admin.post(`/api/training/admin/courses/${courseId}/questions`, newQuestion("Wrong lesson link?", 999999))).status, 400);
  const q1 = await admin.post(`/api/training/admin/courses/${courseId}/questions`, newQuestion("First question?", lessonId));
  await admin.post(`/api/training/admin/courses/${courseId}/questions`, newQuestion("Second question?", lessonId));
  await admin.post(`/api/training/admin/courses/${courseId}/questions`, newQuestion("Third question?", lessonId));

  const published = await admin.post(`/api/training/admin/courses/${courseId}/publish`);
  assert.equal(published.status, 200);
  assert.equal(published.body.course.version, 1);

  // A learner takes the course so the questions become "used".
  const learner = await login("system.admin");
  const slug = published.body.course.slug;
  assert.equal((await learner.post(`/api/training/courses/${slug}/lessons/1/complete`)).status, 200);
  const attempt = (await learner.post(`/api/training/courses/${slug}/attempts`)).body.attempt;
  await learner.post(`/api/training/attempts/${attempt.id}/submit`, { answers: answersFor(attempt, true) });

  const edited = await admin.put(`/api/training/admin/questions/${q1.body.questionId}`, newQuestion("First question, reworded?", lessonId));
  assert.equal(edited.status, 200);
  const used = withDb((db) => db.prepare("SELECT COUNT(*) AS n FROM quiz_attempts a, json_each(a.question_ids) j WHERE a.id = ? AND j.value = ?").get(attempt.id, q1.body.questionId).n);
  if (used) {
    assert.equal(edited.body.replaced, true, "used questions are replaced, not edited");
    assert.notEqual(edited.body.questionId, q1.body.questionId);
  }
  assert.equal(edited.body.course.version, 2, "editing a published course's questions bumps the version");
  const review = await learner.get(`/api/training/attempts/${attempt.id}/result`);
  assert.equal(review.body.attempt.courseVersion, 1, "earlier attempts keep their version");
  assert.equal((await admin.del(`/api/training/admin/lessons/${lessonId}`)).status, 409, "lessons of a published course cannot be deleted");
  assert.equal((await admin.post(`/api/training/admin/courses/${courseId}/archive`)).status, 200);
  assert.equal((await learner.get(`/api/training/courses/${slug}`)).status, 404, "archived courses disappear for learners");
});

test("assignments need a published course, preview recipients and are admin-only", async () => {
  for (const username of ["employee.demo", "manager.demo"]) {
    const session = await login(username);
    assert.equal((await session.post("/api/training/admin/assignments", { courseId: 1, targetType: "department", targetValue: "Finance" })).status, 403);
    assert.equal((await session.get("/api/training/admin/matrix")).status, 403);
  }
  const admin = await login("security.admin");
  const draft = await admin.post("/api/training/admin/courses", { ...newCourse, title: "Draft only course" });
  const future = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  assert.equal((await admin.post("/api/training/admin/assignments", { courseId: draft.body.course.id, targetType: "department", targetValue: "Finance", dueDate: future, mandatory: true })).status, 400);
  assert.equal((await admin.post("/api/training/admin/assignments", { courseId: 1, targetType: "department", targetValue: "Nowhere", dueDate: future, mandatory: true })).status, 400);
  assert.equal((await admin.post("/api/training/admin/assignments", { courseId: 1, targetType: "department", targetValue: "Finance", dueDate: "2001-01-01", mandatory: true })).status, 400);
  const preview = await admin.post("/api/training/admin/assignments/preview", { courseId: 1, targetType: "department", targetValue: "Consulting" });
  assert.equal(preview.status, 200);
  assert.ok(preview.body.recipients.every((person) => person.department === "Consulting"));
  const assigned = await admin.post("/api/training/admin/assignments", { courseId: 1, targetType: "department", targetValue: "Consulting", dueDate: future, mandatory: true });
  assert.equal(assigned.status, 201);
  assert.equal(assigned.body.recipients, preview.body.recipients.length);
  const consultant = await login("consultant.demo");
  const notes = await consultant.get("/api/notifications");
  assert.ok(notes.body.notifications.some((note) => note.title.includes("Phishing")));
});

test("the Training Needs Matrix auto-assigns new users and follows department changes", async () => {
  const admin = await login("security.admin");
  // A Development-only requirement for a new published course.
  const created = await admin.post("/api/training/admin/courses", { ...newCourse, title: "Development only course" });
  const courseId = created.body.course.id;
  await admin.post(`/api/training/admin/courses/${courseId}/lessons`, { title: "Lesson", bodyMarkdown: "Lesson body with enough text.", estimatedMinutes: 2, sources: [] });
  for (const prompt of ["Dev question one?", "Dev question two?"]) await admin.post(`/api/training/admin/courses/${courseId}/questions`, newQuestion(prompt));
  assert.equal((await admin.post(`/api/training/admin/courses/${courseId}/publish`)).status, 200);
  const matrix = await admin.get("/api/training/admin/matrix");
  const requirements = [...matrix.body.requirements, { role: "*", department: "Development", courseId, dueInDays: 21 }];
  assert.equal((await admin.put("/api/training/admin/matrix", { requirements: [...requirements, { role: "Wizard", department: null, courseId, dueInDays: 5 }] })).status, 400);
  assert.equal((await admin.put("/api/training/admin/matrix", { requirements })).status, 200);

  // A brand-new user created directly in the users table (as an HR system would) is assigned on first login.
  const { scryptSync, randomBytes } = await import("node:crypto");
  const salt = randomBytes(16).toString("hex");
  withDb((db) => db.prepare("INSERT INTO users (username,display_name,role,department,password_salt,password_hash,created_at) VALUES (?,?,?,?,?,?,?)")
    .run("new.starter", "New Starter", "Employee", "Development", salt, scryptSync("new starter passphrase", salt, 64).toString("hex"), new Date().toISOString()));
  PASSWORDS["new.starter"] = "new starter passphrase";
  const starter = await login("new.starter");
  const mine = await starter.get("/api/training/courses?tab=assigned");
  const slugs = mine.body.courses.map((course) => course.slug);
  assert.ok(slugs.includes("phishing-social-engineering"), "all-staff requirement applied");
  assert.ok(slugs.includes(created.body.course.slug), "department requirement applied");
  assert.ok(mine.body.courses.every((course) => course.state.mandatory && course.state.dueDate));

  // Moving department removes the requirement that no longer applies.
  withDb((db) => db.prepare("UPDATE users SET department = 'Finance' WHERE username = 'new.starter'").run());
  const moved = await login("new.starter");
  const after = await moved.get("/api/training/courses?tab=assigned");
  assert.ok(!after.body.courses.some((course) => course.slug === created.body.course.slug));
});

test("managers can remind only their own team and reminders are audited", async () => {
  const employee = await login("employee.demo");
  const consultant = await login("consultant.demo");
  const financeManager = await login("manager.demo");
  const phishing = withDb((db) => db.prepare("SELECT id FROM training_courses WHERE slug = 'phishing-social-engineering'").get().id);
  assert.equal((await employee.post("/api/training/team/reminders", { targetUserId: consultant.user.id, courseId: phishing })).status, 403);
  assert.equal((await financeManager.post("/api/training/team/reminders", { targetUserId: consultant.user.id, courseId: phishing })).status, 404);
  assert.equal((await financeManager.post("/api/training/team/reminders", { targetUserId: employee.user.id, courseId: phishing })).status, 201);
  assert.equal((await financeManager.post("/api/training/team/reminders", { targetUserId: employee.user.id, courseId: phishing })).status, 429);
  const notes = await employee.get("/api/notifications");
  assert.ok(notes.body.notifications.some((note) => note.type === "reminder" && note.body.includes("Manager Demo")));
  const audit = withDb((db) => db.prepare("SELECT actor_user_id FROM audit_events WHERE action = 'TRAINING_REMINDER_SENT' ORDER BY id DESC LIMIT 1").get());
  assert.equal(audit.actor_user_id, financeManager.user.id, "audit records the real actor");
});

test("evidence export is admin-only and neutralises spreadsheet formulas", async () => {
  const { scryptSync, randomBytes } = await import("node:crypto");
  const salt = randomBytes(16).toString("hex");
  withDb((db) => db.prepare("INSERT INTO users (username,display_name,role,department,password_salt,password_hash,created_at) VALUES (?,?,?,?,?,?,?)")
    .run("formula.user", "=HYPERLINK(\"http://evil.example\",\"click\")", "Employee", "Finance", salt, scryptSync("formula user passphrase", salt, 64).toString("hex"), new Date().toISOString()));
  const admin = await login("security.admin");
  await admin.post("/api/training/admin/matrix/apply");
  const employee = await login("employee.demo");
  assert.equal((await employee.get("/api/training/admin/reports")).status, 403);
  assert.equal((await employee.get("/api/training/admin/reports.csv")).status, 403);

  const report = await admin.get("/api/training/admin/reports?department=Finance");
  assert.equal(report.status, 200);
  assert.ok(report.body.rows.every((row) => row.department === "Finance"));
  assert.ok(report.body.byCourse.length >= 1);
  assert.equal((await admin.get("/api/training/admin/reports?status=bogus")).status, 400);

  const csv = await admin.get("/api/training/admin/reports.csv?department=Finance");
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get("content-type"), /text\/csv/);
  assert.match(csv.headers.get("content-disposition"), /attachment; filename="training-evidence-/);
  assert.ok(csv.text.includes(`"'=HYPERLINK(`), "formula cell is prefixed with a quote");
  for (const line of csv.text.split("\r\n")) {
    for (const cell of line.split('","')) assert.ok(!/^"?[=+\-@]/.test(cell), `unsafe cell: ${cell}`);
  }
  const exported = withDb((db) => db.prepare("SELECT actor_user_id FROM audit_events WHERE action = 'TRAINING_EVIDENCE_EXPORTED' ORDER BY id DESC LIMIT 1").get());
  assert.equal(exported.actor_user_id, admin.user.id);
});

test("learners can download their own training record and old records are purged", async () => {
  const learner = await login("consultant.demo");
  const record = await learner.get("/api/training/me/record.csv");
  assert.equal(record.status, 200);
  assert.match(record.headers.get("content-disposition"), /my-training-record-/);
  assert.match(record.text, /"record_type","course","detail","status","score","date"/);
  assert.match(record.text, /"certificate"/);
  assert.ok(!record.text.includes("Employee Demo"), "the record contains only the requester's data");
  assert.equal((await learner.get("/api/training/privacy")).body.retentionYears, 3);

  const { purgeExpiredTrainingRecords, TRAINING_RETENTION_YEARS } = await import("../server/modules/training/retention.js");
  assert.equal(TRAINING_RETENTION_YEARS, 3);
  const outcome = withDb((db) => {
    db.exec("PRAGMA foreign_keys = ON");
    const courseId = db.prepare("SELECT id FROM training_courses WHERE slug = 'passwords-mfa'").get().id;
    const old = "2019-01-01T00:00:00.000Z";
    const attempt = db.prepare(`INSERT INTO quiz_attempts (user_id,course_id,course_version,attempt_number,started_at,expires_at,submitted_at,score,passed,question_ids,option_order,status)
      VALUES (?,?,1,99,?,?,?,90,1,'[]','{}','submitted')`).run(learner.user.id, courseId, old, old, old).lastInsertRowid;
    db.prepare("INSERT INTO certificates (user_id,course_id,attempt_id,certificate_code,issued_at) VALUES (?,?,?,?,?)").run(learner.user.id, courseId, attempt, "SA-OLD0-OLD0-OLD0-OLD0", old);
    const events = [];
    const result = purgeExpiredTrainingRecords(db, (...args) => events.push(args));
    return {
      result,
      events,
      left: db.prepare("SELECT COUNT(*) AS n FROM quiz_attempts WHERE id = ?").get(attempt).n,
      cert: db.prepare("SELECT COUNT(*) AS n FROM certificates WHERE attempt_id = ?").get(attempt).n
    };
  });
  assert.ok(outcome.result.attempts >= 1);
  assert.equal(outcome.left, 0);
  assert.equal(outcome.cert, 0, "certificates go with their attempt");
  assert.equal(outcome.events[0][1], "TRAINING_RETENTION_PURGE");
});
