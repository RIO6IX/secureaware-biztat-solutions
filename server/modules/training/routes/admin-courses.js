import { ADMIN_ROLES, COVERS, INTERACTIVE_KEYS, LEVELS, QUESTION_TYPES } from "../schema.js";
import { courseDetail, lessonView } from "../store.js";
import { bool, fail, id as idValue, int, oneOf, optionalId, slug as slugValue, text, textList } from "../validate.js";

const LARGE_BODY = 256 * 1024;

function slugify(title) {
  return title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "course";
}

function validateCourse(body, existing = null) {
  return {
    title: text(body.title, "Title", { min: 3, max: 120 }),
    category: text(body.category, "Category", { min: 2, max: 60 }),
    level: oneOf(body.level, "Level", LEVELS),
    summary: text(body.summary, "Summary", { min: 10, max: 300 }),
    description: text(body.description ?? "", "Description", { required: false, max: 4000 }),
    learningObjectives: textList(body.learningObjectives ?? [], "Learning objectives", { maxItems: 10, maxLength: 200 }),
    durationMinutes: int(body.durationMinutes, "Duration", 1, 600),
    audienceNote: text(body.audienceNote ?? "", "Audience note", { required: false, max: 300 }),
    cover: oneOf(body.cover ?? existing?.cover_image ?? "shield", "Cover", COVERS),
    passMark: int(body.passMark, "Pass mark", 50, 100),
    maxAttempts: int(body.maxAttempts, "Maximum attempts", 1, 10),
    cooldownMinutes: int(body.cooldownMinutes, "Cooldown", 0, 10080),
    questionsPerAttempt: int(body.questionsPerAttempt, "Questions per attempt", 1, 50),
    openToAll: bool(body.openToAll, "Open to all")
  };
}

function validateLesson(body) {
  const sources = body.sources ?? [];
  if (!Array.isArray(sources) || sources.length > 10) fail("Sources must be a list of at most 10 items");
  return {
    title: text(body.title, "Lesson title", { min: 3, max: 120 }),
    bodyMarkdown: text(body.bodyMarkdown, "Lesson content", { min: 20, max: 50_000 }),
    keyTakeaways: textList(body.keyTakeaways ?? [], "Key takeaways", { maxItems: 8, maxLength: 240 }),
    estimatedMinutes: int(body.estimatedMinutes, "Estimated minutes", 1, 120),
    interactive: body.interactive ? oneOf(body.interactive, "Interactive element", INTERACTIVE_KEYS) : null,
    sources: sources.map((source, index) => {
      if (!source || typeof source !== "object") fail(`Source ${index + 1} is invalid`);
      const url = text(source.url, `Source ${index + 1} URL`, { max: 500 });
      if (!/^https:\/\/[^\s]+$/i.test(url)) fail(`Source ${index + 1} must be an https:// link`);
      return { title: text(source.title, `Source ${index + 1} title`, { min: 3, max: 200 }), url };
    })
  };
}

// Every question needs at least one correct option; single-answer types need exactly one.
function validateQuestion(body, lessonIds) {
  const type = oneOf(body.type, "Question type", QUESTION_TYPES);
  const options = body.options;
  if (!Array.isArray(options) || options.length < 2 || options.length > 6) fail("A question needs 2 to 6 options");
  const cleaned = options.map((option, index) => {
    if (!option || typeof option !== "object") fail(`Option ${index + 1} is invalid`);
    return { text: text(option.text, `Option ${index + 1}`, { max: 300 }), isCorrect: bool(option.isCorrect, `Option ${index + 1} correct flag`) };
  });
  const correct = cleaned.filter((option) => option.isCorrect).length;
  if (correct < 1) fail("Mark at least one option as correct");
  if (type !== "multi" && correct !== 1) fail("Single-answer questions need exactly one correct option");
  if (type === "true_false" && cleaned.length !== 2) fail("True/false questions need exactly two options");
  if (new Set(cleaned.map((option) => option.text.toLowerCase())).size !== cleaned.length) fail("Options must be different from each other");
  const lessonId = optionalId(body.lessonId, "Lesson");
  if (lessonId && !lessonIds.includes(lessonId)) fail("The linked lesson must belong to this course");
  return {
    type,
    prompt: text(body.prompt, "Question", { min: 5, max: 500 }),
    scenarioText: text(body.scenarioText ?? "", "Scenario", { required: false, max: 1500 }),
    explanation: text(body.explanation, "Explanation", { min: 5, max: 1000 }),
    difficulty: int(body.difficulty ?? 2, "Difficulty", 1, 3),
    lessonId,
    options: cleaned
  };
}

export default function registerAdminCourses({ route, store, foundation, hooks }) {
  const db = foundation.db;
  const admin = { roles: ADMIN_ROLES };
  const now = () => new Date().toISOString();

  function courseOr404(ctx) {
    const course = store.q.courseById.get(idValue(ctx.params.id, "course id"));
    if (!course) ctx.send(404, { message: "Course not found" });
    return course;
  }

  function questionsFor(courseId) {
    return db.prepare("SELECT * FROM training_questions WHERE course_id = ? ORDER BY active DESC, id").all(courseId).map((question) => ({
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      scenarioText: question.scenario_text,
      explanation: question.explanation,
      difficulty: question.difficulty,
      lessonId: question.lesson_id,
      active: Boolean(question.active),
      used: isUsed(question.course_id, question.id),
      options: db.prepare("SELECT id, text, is_correct FROM training_options WHERE question_id = ? ORDER BY position").all(question.id)
        .map((option) => ({ id: option.id, text: option.text, isCorrect: Boolean(option.is_correct) }))
    }));
  }

  function isUsed(courseId, questionId) {
    return Boolean(db.prepare("SELECT 1 FROM quiz_attempts a, json_each(a.question_ids) j WHERE a.course_id = ? AND j.value = ? LIMIT 1").get(courseId, questionId));
  }

  function activeQuestionCount(courseId) {
    return db.prepare("SELECT COUNT(*) AS n FROM training_questions WHERE course_id = ? AND active = 1").get(courseId).n;
  }

  // Changing the question set of a published course creates a new course version.
  // Attempts keep the version they were taken under.
  function bumpVersionIfPublished(course) {
    if (course.status !== "published") return course.version;
    db.prepare("UPDATE training_courses SET version = version + 1, updated_at = ? WHERE id = ?").run(now(), course.id);
    return course.version + 1;
  }

  function insertQuestion(courseId, question) {
    const { lastInsertRowid } = db.prepare(`INSERT INTO training_questions (course_id,lesson_id,type,prompt,scenario_text,explanation,difficulty,active,created_at)
      VALUES (?,?,?,?,?,?,?,1,?)`).run(courseId, question.lessonId, question.type, question.prompt, question.scenarioText, question.explanation, question.difficulty, now());
    question.options.forEach((option, index) => {
      db.prepare("INSERT INTO training_options (question_id,position,text,is_correct) VALUES (?,?,?,?)").run(lastInsertRowid, index + 1, option.text, option.isCorrect ? 1 : 0);
    });
    return Number(lastInsertRowid);
  }

  function transaction(work) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function adminCourse(course) {
    return {
      ...courseDetail(course),
      lessons: store.q.lessons.all(course.id).map(lessonView),
      questions: questionsFor(course.id),
      activeQuestions: activeQuestionCount(course.id)
    };
  }

  route("GET", "/admin/courses", (ctx) => {
    const rows = db.prepare(`SELECT c.*,
        (SELECT COUNT(*) FROM training_lessons l WHERE l.course_id = c.id) AS lesson_count,
        (SELECT COUNT(*) FROM training_questions q WHERE q.course_id = c.id AND q.active = 1) AS question_count,
        (SELECT COUNT(*) FROM quiz_attempts a WHERE a.course_id = c.id AND a.status = 'submitted') AS attempt_count,
        (SELECT COUNT(*) FROM quiz_attempts a WHERE a.course_id = c.id AND a.passed = 1) AS pass_count
      FROM training_courses c ORDER BY c.status = 'archived', c.title`).all();
    return ctx.send(200, {
      courses: rows.map((row) => ({
        id: row.id, slug: row.slug, title: row.title, category: row.category, status: row.status, version: row.version,
        lessons: row.lesson_count, activeQuestions: row.question_count, questionsPerAttempt: row.questions_per_attempt,
        attempts: row.attempt_count, passRate: row.attempt_count ? Math.round((row.pass_count / row.attempt_count) * 100) : null, updatedAt: row.updated_at
      })),
      options: { levels: LEVELS, covers: COVERS, interactive: INTERACTIVE_KEYS, questionTypes: QUESTION_TYPES }
    });
  }, admin);

  route("POST", "/admin/courses", async (ctx) => {
    const body = await ctx.body();
    const course = validateCourse(body);
    let slug = body.slug ? slugValue(body.slug) : slugify(course.title);
    if (store.q.courseBySlug.get(slug)) {
      if (body.slug) return ctx.send(409, { message: "Another course already uses this web address (slug)" });
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const { lastInsertRowid } = db.prepare(`INSERT INTO training_courses
      (slug,title,category,level,summary,description,learning_objectives,why_it_matters,duration_minutes,audience_note,cover_image,status,pass_mark,max_attempts,cooldown_minutes,questions_per_attempt,open_to_all,version,created_by,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,'[]',?,?,?,'draft',?,?,?,?,?,1,?,?,?)`)
      .run(slug, course.title, course.category, course.level, course.summary, course.description, JSON.stringify(course.learningObjectives),
        course.durationMinutes, course.audienceNote, course.cover, course.passMark, course.maxAttempts, course.cooldownMinutes, course.questionsPerAttempt,
        course.openToAll ? 1 : 0, ctx.user.id, now(), now());
    ctx.audit("TRAINING_COURSE_CREATED", slug);
    return ctx.send(201, { course: adminCourse(store.q.courseById.get(Number(lastInsertRowid))) });
  }, admin);

  route("GET", "/admin/courses/:id", (ctx) => {
    const course = courseOr404(ctx);
    if (!course) return;
    return ctx.send(200, { course: adminCourse(course), options: { levels: LEVELS, covers: COVERS, interactive: INTERACTIVE_KEYS, questionTypes: QUESTION_TYPES } });
  }, admin);

  route("PUT", "/admin/courses/:id", async (ctx) => {
    const existing = courseOr404(ctx);
    if (!existing) return;
    const course = validateCourse(await ctx.body(), existing);
    if (existing.status === "published" && course.questionsPerAttempt > activeQuestionCount(existing.id)) fail("Questions per attempt cannot exceed the number of active questions");
    db.prepare(`UPDATE training_courses SET title=?, category=?, level=?, summary=?, description=?, learning_objectives=?, duration_minutes=?, audience_note=?, cover_image=?,
      pass_mark=?, max_attempts=?, cooldown_minutes=?, questions_per_attempt=?, open_to_all=?, updated_at=? WHERE id = ?`)
      .run(course.title, course.category, course.level, course.summary, course.description, JSON.stringify(course.learningObjectives), course.durationMinutes,
        course.audienceNote, course.cover, course.passMark, course.maxAttempts, course.cooldownMinutes, course.questionsPerAttempt, course.openToAll ? 1 : 0, now(), existing.id);
    ctx.audit("TRAINING_COURSE_UPDATED", existing.slug);
    return ctx.send(200, { course: adminCourse(store.q.courseById.get(existing.id)) });
  }, admin);

  route("POST", "/admin/courses/:id/publish", (ctx) => {
    const course = courseOr404(ctx);
    if (!course) return;
    const problems = [];
    if (!store.q.lessonCount.get(course.id).n) problems.push("add at least one lesson");
    if (activeQuestionCount(course.id) < course.questions_per_attempt) problems.push(`add at least ${course.questions_per_attempt} active questions`);
    const missingCorrect = db.prepare(`SELECT COUNT(*) AS n FROM training_questions q WHERE q.course_id = ? AND q.active = 1
      AND NOT EXISTS (SELECT 1 FROM training_options o WHERE o.question_id = q.id AND o.is_correct = 1)`).get(course.id).n;
    if (missingCorrect) problems.push("give every question a correct option");
    if (problems.length) return ctx.send(400, { message: `Before publishing: ${problems.join("; ")}.` });
    db.prepare("UPDATE training_courses SET status = 'published', updated_at = ? WHERE id = ?").run(now(), course.id);
    ctx.audit("TRAINING_COURSE_PUBLISHED", course.slug);
    hooks.afterPublish?.(course.id);
    return ctx.send(200, { course: adminCourse(store.q.courseById.get(course.id)) });
  }, admin);

  route("POST", "/admin/courses/:id/archive", (ctx) => {
    const course = courseOr404(ctx);
    if (!course) return;
    db.prepare("UPDATE training_courses SET status = 'archived', updated_at = ? WHERE id = ?").run(now(), course.id);
    ctx.audit("TRAINING_COURSE_ARCHIVED", course.slug);
    return ctx.send(200, { course: adminCourse(store.q.courseById.get(course.id)) });
  }, admin);

  route("POST", "/admin/courses/:id/lessons", async (ctx) => {
    const course = courseOr404(ctx);
    if (!course) return;
    const lesson = validateLesson(await ctx.body());
    const position = db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS next FROM training_lessons WHERE course_id = ?").get(course.id).next;
    db.prepare("INSERT INTO training_lessons (course_id,position,title,body_markdown,key_takeaways,estimated_minutes,interactive,sources) VALUES (?,?,?,?,?,?,?,?)")
      .run(course.id, position, lesson.title, lesson.bodyMarkdown, JSON.stringify(lesson.keyTakeaways), lesson.estimatedMinutes, lesson.interactive, JSON.stringify(lesson.sources));
    db.prepare("UPDATE training_courses SET updated_at = ? WHERE id = ?").run(now(), course.id);
    ctx.audit("TRAINING_LESSON_CREATED", `${course.slug}#${position}`);
    return ctx.send(201, { course: adminCourse(store.q.courseById.get(course.id)) });
  }, { ...admin, bodyLimit: LARGE_BODY });

  route("PUT", "/admin/lessons/:id", async (ctx) => {
    const existing = db.prepare("SELECT * FROM training_lessons WHERE id = ?").get(idValue(ctx.params.id, "lesson id"));
    if (!existing) return ctx.send(404, { message: "Lesson not found" });
    const lesson = validateLesson(await ctx.body());
    db.prepare("UPDATE training_lessons SET title=?, body_markdown=?, key_takeaways=?, estimated_minutes=?, interactive=?, sources=? WHERE id = ?")
      .run(lesson.title, lesson.bodyMarkdown, JSON.stringify(lesson.keyTakeaways), lesson.estimatedMinutes, lesson.interactive, JSON.stringify(lesson.sources), existing.id);
    const course = store.q.courseById.get(existing.course_id);
    db.prepare("UPDATE training_courses SET updated_at = ? WHERE id = ?").run(now(), course.id);
    ctx.audit("TRAINING_LESSON_UPDATED", `${course.slug}#${existing.position}`);
    return ctx.send(200, { course: adminCourse(course) });
  }, { ...admin, bodyLimit: LARGE_BODY });

  // Removing a lesson from a live course would silently change learners' progress, so it is
  // only allowed while the course is a draft.
  route("DELETE", "/admin/lessons/:id", (ctx) => {
    const existing = db.prepare("SELECT * FROM training_lessons WHERE id = ?").get(idValue(ctx.params.id, "lesson id"));
    if (!existing) return ctx.send(404, { message: "Lesson not found" });
    const course = store.q.courseById.get(existing.course_id);
    if (course.status !== "draft") return ctx.send(409, { message: "Lessons can only be deleted while the course is a draft. Archive the course and create a new one instead." });
    transaction(() => {
      db.prepare("DELETE FROM training_lessons WHERE id = ?").run(existing.id);
      const rest = db.prepare("SELECT id FROM training_lessons WHERE course_id = ? ORDER BY position").all(course.id);
      rest.forEach((row, index) => db.prepare("UPDATE training_lessons SET position = ? WHERE id = ?").run(-(index + 1), row.id));
      rest.forEach((row, index) => db.prepare("UPDATE training_lessons SET position = ? WHERE id = ?").run(index + 1, row.id));
    });
    ctx.audit("TRAINING_LESSON_DELETED", `${course.slug}#${existing.position}`);
    return ctx.send(200, { course: adminCourse(course) });
  }, admin);

  route("POST", "/admin/courses/:id/questions", async (ctx) => {
    const course = courseOr404(ctx);
    if (!course) return;
    const lessonIds = store.q.lessons.all(course.id).map((lesson) => lesson.id);
    const question = validateQuestion(await ctx.body(), lessonIds);
    const questionId = transaction(() => {
      const newId = insertQuestion(course.id, question);
      bumpVersionIfPublished(course);
      return newId;
    });
    ctx.audit("TRAINING_QUESTION_CREATED", `${course.slug}#q${questionId}`);
    return ctx.send(201, { questionId, course: adminCourse(store.q.courseById.get(course.id)) });
  }, admin);

  // Questions that have appeared in an attempt are never edited in place: the edit creates a
  // new question and retires the old one, so past attempts can still be reviewed as taken.
  route("PUT", "/admin/questions/:id", async (ctx) => {
    const existing = db.prepare("SELECT * FROM training_questions WHERE id = ?").get(idValue(ctx.params.id, "question id"));
    if (!existing) return ctx.send(404, { message: "Question not found" });
    const course = store.q.courseById.get(existing.course_id);
    const lessonIds = store.q.lessons.all(course.id).map((lesson) => lesson.id);
    const question = validateQuestion(await ctx.body(), lessonIds);
    const used = isUsed(course.id, existing.id);
    const questionId = transaction(() => {
      let resultId = existing.id;
      if (used) {
        db.prepare("UPDATE training_questions SET active = 0 WHERE id = ?").run(existing.id);
        resultId = insertQuestion(course.id, question);
      } else {
        db.prepare("UPDATE training_questions SET lesson_id=?, type=?, prompt=?, scenario_text=?, explanation=?, difficulty=? WHERE id = ?")
          .run(question.lessonId, question.type, question.prompt, question.scenarioText, question.explanation, question.difficulty, existing.id);
        db.prepare("DELETE FROM training_options WHERE question_id = ?").run(existing.id);
        question.options.forEach((option, index) => {
          db.prepare("INSERT INTO training_options (question_id,position,text,is_correct) VALUES (?,?,?,?)").run(existing.id, index + 1, option.text, option.isCorrect ? 1 : 0);
        });
      }
      bumpVersionIfPublished(course);
      return resultId;
    });
    ctx.audit("TRAINING_QUESTION_UPDATED", `${course.slug}#q${existing.id}${used ? `->q${questionId}` : ""}`);
    return ctx.send(200, { questionId, replaced: used, course: adminCourse(store.q.courseById.get(course.id)) });
  }, admin);

  route("POST", "/admin/questions/:id/:action", (ctx) => {
    const action = oneOf(ctx.params.action, "action", ["activate", "deactivate"]);
    const existing = db.prepare("SELECT * FROM training_questions WHERE id = ?").get(idValue(ctx.params.id, "question id"));
    if (!existing) return ctx.send(404, { message: "Question not found" });
    const course = store.q.courseById.get(existing.course_id);
    if (action === "deactivate" && existing.active && course.status === "published" && activeQuestionCount(course.id) - 1 < course.questions_per_attempt) {
      return ctx.send(409, { message: `A published course needs at least ${course.questions_per_attempt} active questions.` });
    }
    const active = action === "activate" ? 1 : 0;
    if (existing.active !== active) {
      transaction(() => {
        db.prepare("UPDATE training_questions SET active = ? WHERE id = ?").run(active, existing.id);
        bumpVersionIfPublished(course);
      });
      ctx.audit(action === "activate" ? "TRAINING_QUESTION_ACTIVATED" : "TRAINING_QUESTION_DEACTIVATED", `${course.slug}#q${existing.id}`);
    }
    return ctx.send(200, { course: adminCourse(store.q.courseById.get(course.id)) });
  }, admin);
}
