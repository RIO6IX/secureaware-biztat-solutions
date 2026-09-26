import { courses, matrixSeed } from "./content/index.js";

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
