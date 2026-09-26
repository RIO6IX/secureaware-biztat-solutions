// Read-side queries and learner status calculation. Nothing in this file selects
// training_options.is_correct; correctness is only read inside quiz.js for marking.

export const ATTEMPT_TIME_LIMIT_MINUTES = 60;

const parse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(days, from = new Date()) {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function courseSummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    level: row.level,
    summary: row.summary,
    durationMinutes: row.duration_minutes,
    cover: row.cover_image,
    status: row.status,
    passMark: row.pass_mark,
    maxAttempts: row.max_attempts,
    cooldownMinutes: row.cooldown_minutes,
    questionsPerAttempt: row.questions_per_attempt,
    openToAll: Boolean(row.open_to_all),
    version: row.version
  };
}

export function courseDetail(row) {
  return {
    ...courseSummary(row),
    description: row.description,
    audienceNote: row.audience_note,
    learningObjectives: parse(row.learning_objectives, []),
    whyItMatters: parse(row.why_it_matters, [])
  };
}

export function lessonView(row) {
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    bodyMarkdown: row.body_markdown,
    keyTakeaways: parse(row.key_takeaways, []),
    estimatedMinutes: row.estimated_minutes,
    interactive: row.interactive,
    sources: parse(row.sources, [])
  };
}

export function createStore(db) {
  const q = {
    courseBySlug: db.prepare("SELECT * FROM training_courses WHERE slug = ?"),
    courseById: db.prepare("SELECT * FROM training_courses WHERE id = ?"),
    publishedCourses: db.prepare("SELECT * FROM training_courses WHERE status = 'published' ORDER BY id"),
    lessons: db.prepare("SELECT * FROM training_lessons WHERE course_id = ? ORDER BY position"),
    lessonAt: db.prepare("SELECT * FROM training_lessons WHERE course_id = ? AND position = ?"),
    lessonCount: db.prepare("SELECT COUNT(*) AS n FROM training_lessons WHERE course_id = ?"),
    completedLessons: db.prepare(`SELECT l.id, l.position FROM lesson_progress p JOIN training_lessons l ON l.id = p.lesson_id
      WHERE p.user_id = ? AND l.course_id = ?`),
    assignments: db.prepare(`SELECT course_id, MIN(due_date) AS due_date, MAX(mandatory) AS mandatory FROM training_assignments
      WHERE (target_type = 'department' AND target_value = ?) OR (target_type = 'role' AND target_value = ?) OR (target_type = 'user' AND target_value = ?)
      GROUP BY course_id`),
    attempts: db.prepare("SELECT * FROM quiz_attempts WHERE user_id = ? AND course_id = ? ORDER BY attempt_number"),
    certificateForCourse: db.prepare("SELECT certificate_code FROM certificates WHERE user_id = ? AND course_id = ? ORDER BY id LIMIT 1"),
    expireStale: db.prepare("UPDATE quiz_attempts SET status = 'expired' WHERE status = 'in_progress' AND expires_at <= ?"),
    userById: db.prepare("SELECT id, username, display_name, role, department, created_at FROM users WHERE id = ? AND active = 1"),
    activeUsers: db.prepare("SELECT id, username, display_name, role, department, created_at FROM users WHERE active = 1 ORDER BY display_name")
  };

  function expireStaleAttempts() {
    q.expireStale.run(new Date().toISOString());
  }

  function assignmentMap(user) {
    const map = new Map();
    for (const row of q.assignments.all(user.department, user.role, String(user.id))) {
      map.set(row.course_id, { dueDate: row.due_date, mandatory: Boolean(row.mandatory) });
    }
    return map;
  }

  // A learner may open a course when it is published and either assigned to them or open to all.
  function canAccessCourse(user, course, assignments = assignmentMap(user)) {
    return Boolean(course) && course.status === "published" && (Boolean(course.open_to_all) || assignments.has(course.id));
  }

  function courseState(user, course, assignments = assignmentMap(user)) {
    const assignment = assignments.get(course.id) || null;
    const lessonsTotal = q.lessonCount.get(course.id).n;
    const completed = q.completedLessons.all(user.id, course.id);
    const attempts = q.attempts.all(user.id, course.id);
    const finished = attempts.filter((attempt) => attempt.status !== "in_progress");
    const passedAttempt = attempts.find((attempt) => attempt.passed === 1);
    const inProgress = attempts.find((attempt) => attempt.status === "in_progress");
    const submitted = attempts.filter((attempt) => attempt.status === "submitted");
    const bestScore = submitted.length ? Math.max(...submitted.map((attempt) => attempt.score ?? 0)) : null;
    const attemptsUsed = attempts.length;
    const attemptsLeft = Math.max(0, course.max_attempts - attemptsUsed);
    const last = finished.at(-1);
    let cooldownUntil = null;
    if (!passedAttempt && last && course.cooldown_minutes > 0) {
      const endedAt = new Date(last.submitted_at || last.expires_at).getTime();
      const until = endedAt + course.cooldown_minutes * 60_000;
      if (until > Date.now()) cooldownUntil = new Date(until).toISOString();
    }
    const overdue = Boolean(assignment?.dueDate) && assignment.dueDate < today() && !passedAttempt;
    let status = "not_started";
    if (passedAttempt) status = "passed";
    else if (overdue) status = "overdue";
    else if (finished.length && attemptsLeft === 0) status = "failed_locked";
    else if (finished.length) status = "failed_retake";
    else if (completed.length || inProgress) status = "in_progress";
    return {
      assigned: Boolean(assignment),
      mandatory: assignment?.mandatory ?? false,
      dueDate: assignment?.dueDate ?? null,
      lessonsTotal,
      lessonsCompleted: completed.length,
      completedPositions: completed.map((row) => row.position).sort((a, b) => a - b),
      allLessonsComplete: lessonsTotal > 0 && completed.length >= lessonsTotal,
      status,
      overdue,
      bestScore,
      attemptsUsed,
      attemptsLeft,
      cooldownUntil,
      inProgressAttemptId: inProgress?.id ?? null,
      passedAt: passedAttempt?.submitted_at ?? null,
      certificateCode: passedAttempt ? q.certificateForCourse.get(user.id, course.id)?.certificate_code ?? null : null
    };
  }

  // Every course that is relevant to the user: assigned courses plus published open courses.
  function learnerCourses(user) {
    expireStaleAttempts();
    const assignments = assignmentMap(user);
    return q.publishedCourses.all()
      .filter((course) => canAccessCourse(user, course, assignments))
      .map((course) => ({ course, state: courseState(user, course, assignments) }));
  }

  // Assigned courses only: used for compliance views (manager, reports).
  function assignedCourseStates(user) {
    const assignments = assignmentMap(user);
    return q.publishedCourses.all()
      .filter((course) => assignments.has(course.id))
      .map((course) => ({ course, state: courseState(user, course, assignments) }));
  }

  return { q, expireStaleAttempts, assignmentMap, canAccessCourse, courseState, learnerCourses, assignedCourseStates };
}
