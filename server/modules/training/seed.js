import { courses, matrixSeed } from "./content/index.js";
import { newCertificateCode } from "./quiz.js";
import { addDays } from "./store.js";

// Seeds each course once, keyed by slug. A course that already exists is left alone so
// that admin edits survive restarts, which makes the seed safe to run on every start-up.
export function seedCourses(db) {
  const now = new Date().toISOString();
  let seeded = 0;
  for (const course of courses) {
    if (db.prepare("SELECT 1 FROM training_courses WHERE slug = ?").get(course.slug)) continue;
    db.exec("BEGIN");
    try {
      const { lastInsertRowid: courseId } = db.prepare(`INSERT INTO training_courses
        (slug,title,category,level,summary,description,learning_objectives,why_it_matters,duration_minutes,audience_note,cover_image,status,pass_mark,max_attempts,cooldown_minutes,questions_per_attempt,open_to_all,version,created_by,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,'published',?,?,?,?,?,1,NULL,?,?)`)
        .run(course.slug, course.title, course.category, course.level, course.summary, course.description,
          JSON.stringify(course.learningObjectives), JSON.stringify(course.whyItMatters), course.durationMinutes,
          course.audienceNote, course.cover, course.passMark, course.maxAttempts, course.cooldownMinutes,
          course.questionsPerAttempt, course.openToAll ? 1 : 0, now, now);
      const lessonIds = course.lessons.map((lesson, index) => db.prepare(`INSERT INTO training_lessons
        (course_id,position,title,body_markdown,key_takeaways,estimated_minutes,interactive,sources) VALUES (?,?,?,?,?,?,?,?)`)
        .run(courseId, index + 1, lesson.title, lesson.body, JSON.stringify(lesson.keyTakeaways), lesson.estimatedMinutes,
          lesson.interactive || null, JSON.stringify(lesson.sources)).lastInsertRowid);
      for (const question of course.questions) {
        const { lastInsertRowid: questionId } = db.prepare(`INSERT INTO training_questions
          (course_id,lesson_id,type,prompt,scenario_text,explanation,difficulty,active,created_at) VALUES (?,?,?,?,?,?,?,1,?)`)
          .run(courseId, lessonIds[question.lesson - 1] ?? null, question.type, question.prompt, question.scenario || "",
            question.explanation, question.difficulty || 2, now);
        question.options.forEach(([text, isCorrect], index) => {
          db.prepare("INSERT INTO training_options (question_id,position,text,is_correct) VALUES (?,?,?,?)").run(questionId, index + 1, text, isCorrect ? 1 : 0);
        });
      }
      for (const row of matrixSeed.filter((entry) => entry.slugs.includes(course.slug))) {
        db.prepare("INSERT OR IGNORE INTO training_role_requirements (role,department,course_id,due_in_days) VALUES (?,?,?,?)")
          .run(row.role, row.department, courseId, row.dueInDays);
      }
      db.exec("COMMIT");
      seeded += 1;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return seeded;
}

// Fictional activity so the manager and evidence views have something to show on a fresh
// install. Each item is applied once (tracked in training_meta) and only when the courses it
// needs exist. Disable with SECUREAWARE_DEMO_DATA=off (the automated tests do).
export function seedDemoActivity(db) {
  if (process.env.SECUREAWARE_DEMO_DATA === "off") return;
  const done = (key) => Boolean(db.prepare("SELECT 1 FROM training_meta WHERE key = ?").get(`demo:${key}`));
  const mark = (key) => db.prepare("INSERT OR IGNORE INTO training_meta (key, value) VALUES (?, ?)").run(`demo:${key}`, new Date().toISOString());
  const user = (username) => db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  const course = (slug) => db.prepare("SELECT * FROM training_courses WHERE slug = ? AND status = 'published'").get(slug);
  const lessons = (courseId) => db.prepare("SELECT id FROM training_lessons WHERE course_id = ? ORDER BY position").all(courseId).map((row) => row.id);
  const daysAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString();
  const completeLessons = (userId, courseId, count, when) => lessons(courseId).slice(0, count)
    .forEach((lessonId) => db.prepare("INSERT OR IGNORE INTO lesson_progress (user_id, lesson_id, completed_at) VALUES (?,?,?)").run(userId, lessonId, when));

  function submittedAttempt(userId, target, passed, when) {
    const questionIds = db.prepare("SELECT id FROM training_questions WHERE course_id = ? AND active = 1 ORDER BY id LIMIT ?").all(target.id, target.questions_per_attempt).map((row) => row.id);
    const correctCount = passed ? questionIds.length : Math.floor(questionIds.length * 0.4);
    const number = db.prepare("SELECT COUNT(*) AS n FROM quiz_attempts WHERE user_id = ? AND course_id = ?").get(userId, target.id).n + 1;
    const order = Object.fromEntries(questionIds.map((questionId) => [questionId, db.prepare("SELECT id FROM training_options WHERE question_id = ? ORDER BY position").all(questionId).map((row) => row.id)]));
    const { lastInsertRowid: attemptId } = db.prepare(`INSERT INTO quiz_attempts (user_id,course_id,course_version,attempt_number,started_at,expires_at,submitted_at,score,passed,question_ids,option_order,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'submitted')`).run(userId, target.id, target.version, number, when, when, when,
      Math.round((correctCount / questionIds.length) * 100), passed ? 1 : 0, JSON.stringify(questionIds), JSON.stringify(order));
    questionIds.forEach((questionId, index) => {
      const isCorrect = index < correctCount;
      const option = db.prepare(`SELECT id FROM training_options WHERE question_id = ? AND is_correct = ? ORDER BY position LIMIT 1`).get(questionId, isCorrect ? 1 : 0);
      db.prepare("INSERT INTO quiz_answers (attempt_id,question_id,selected_option_ids,correct) VALUES (?,?,?,?)").run(attemptId, questionId, JSON.stringify([option.id]), isCorrect ? 1 : 0);
    });
    if (passed) db.prepare("INSERT INTO certificates (user_id,course_id,attempt_id,certificate_code,issued_at) VALUES (?,?,?,?,?)").run(userId, target.id, attemptId, newCertificateCode(), when);
  }

  const items = [
    ["overdue-finance-incident", ["incident-reporting"], () => {
      const admin = user("security.admin");
      db.prepare(`INSERT OR IGNORE INTO training_assignments (course_id,target_type,target_value,due_date,mandatory,source,assigned_by,created_at)
        VALUES (?,'department','Finance',?,1,'manual',?,?)`).run(course("incident-reporting").id, addDays(-5), admin?.id ?? null, daysAgo(40));
    }],
    ["consultant-in-progress", ["phishing-social-engineering"], () => {
      const consultant = user("consultant.demo");
      if (consultant) completeLessons(consultant.id, course("phishing-social-engineering").id, 2, daysAgo(3));
    }],
    ["developer-failed-attempt", ["phishing-social-engineering"], () => {
      const developer = user("dev.demo");
      const target = course("phishing-social-engineering");
      if (!developer) return;
      completeLessons(developer.id, target.id, 99, daysAgo(4));
      submittedAttempt(developer.id, target, false, daysAgo(2));
    }],
    ["consulting-manager-passed", ["phishing-social-engineering", "passwords-mfa"], () => {
      const manager = user("manager.consulting");
      if (!manager) return;
      for (const slug of ["phishing-social-engineering", "passwords-mfa"]) {
        const target = course(slug);
        completeLessons(manager.id, target.id, 99, daysAgo(9));
        submittedAttempt(manager.id, target, true, daysAgo(8));
      }
    }]
  ];
  for (const [key, needs, apply] of items) {
    if (done(key) || !needs.every((slug) => course(slug))) continue;
    db.exec("BEGIN");
    try {
      apply();
      mark(key);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
