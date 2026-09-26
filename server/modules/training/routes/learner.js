import { courseDetail, courseSummary, lessonView, STATUS_VALUES as STATUS_FILTERS } from "../store.js";
import { fail, oneOf, queryText, slug as slugValue } from "../validate.js";


export default function registerLearner({ route, store }) {
  // Resolves a course the signed-in learner may open. Unknown and inaccessible courses
  // both return 404 so the API does not reveal which unpublished courses exist.
  function accessibleCourse(ctx) {
    const course = store.q.courseBySlug.get(slugValue(ctx.params.slug, "course"));
    if (!store.canAccessCourse(ctx.user, course)) {
      ctx.send(404, { message: "Course not found" });
      return null;
    }
    return course;
  }

  route("GET", "/courses", (ctx) => {
    const tab = queryText(ctx.query, "tab") || "assigned";
    oneOf(tab, "tab", ["assigned", "all", "completed"]);
    const search = (queryText(ctx.query, "q") || "").toLowerCase();
    const category = queryText(ctx.query, "category");
    const status = queryText(ctx.query, "status");
    if (status) oneOf(status, "status", STATUS_FILTERS);
    const mandatory = queryText(ctx.query, "mandatory");
    if (mandatory && mandatory !== "true") fail("mandatory must be true when supplied");

    const all = store.learnerCourses(ctx.user);
    const rows = all
      .filter(({ state }) => tab === "all" || (tab === "completed" ? state.status === "passed" : state.assigned && state.status !== "passed"))
      .filter(({ course }) => !search || `${course.title} ${course.summary} ${course.category}`.toLowerCase().includes(search))
      .filter(({ course }) => !category || course.category === category)
      .filter(({ state }) => !status || state.status === status)
      .filter(({ state }) => !mandatory || state.mandatory);
    return ctx.send(200, {
      courses: rows.map(({ course, state }) => ({ ...courseSummary(course), state })),
      categories: [...new Set(all.map(({ course }) => course.category))].sort(),
      counts: {
        assigned: all.filter(({ state }) => state.assigned && state.status !== "passed").length,
        all: all.length,
        completed: all.filter(({ state }) => state.status === "passed").length
      }
    });
  });

  route("GET", "/courses/:slug", (ctx) => {
    const course = accessibleCourse(ctx);
    if (!course) return;
    store.expireStaleAttempts();
    const state = store.courseState(ctx.user, course);
    const completed = new Set(state.completedPositions);
    return ctx.send(200, {
      course: courseDetail(course),
      state,
      lessons: store.q.lessons.all(course.id).map((lesson) => ({
        position: lesson.position,
        title: lesson.title,
        estimatedMinutes: lesson.estimated_minutes,
        interactive: Boolean(lesson.interactive),
        completed: completed.has(lesson.position)
      })),
      quiz: {
        questionsPerAttempt: course.questions_per_attempt,
        passMark: course.pass_mark,
        maxAttempts: course.max_attempts,
        attemptsLeft: state.attemptsLeft,
        cooldownMinutes: course.cooldown_minutes,
        cooldownUntil: state.cooldownUntil,
        unlocked: state.allLessonsComplete
      }
    });
  });

  route("GET", "/courses/:slug/lessons/:position", (ctx) => {
    const course = accessibleCourse(ctx);
    if (!course) return;
    if (!/^[1-9]\d{0,2}$/.test(ctx.params.position)) fail("Lesson number must be a positive integer");
    const lesson = store.q.lessonAt.get(course.id, Number(ctx.params.position));
    if (!lesson) return ctx.send(404, { message: "Lesson not found" });
    const total = store.q.lessonCount.get(course.id).n;
    const completed = store.q.completedLessons.all(ctx.user.id, course.id).map((row) => row.position);
    return ctx.send(200, {
      course: { slug: course.slug, title: course.title, cover: course.cover_image },
      lesson: { ...lessonView(lesson), completed: completed.includes(lesson.position) },
      progress: { completed: completed.length, total },
      nav: { position: lesson.position, total, previous: lesson.position > 1 ? lesson.position - 1 : null, next: lesson.position < total ? lesson.position + 1 : null }
    });
  });

  // Completion is recorded on the server and must follow lesson order, so the quiz
  // unlock cannot be skipped by calling the API directly.
  route("POST", "/courses/:slug/lessons/:position/complete", (ctx) => {
    const course = accessibleCourse(ctx);
    if (!course) return;
    if (!/^[1-9]\d{0,2}$/.test(ctx.params.position)) fail("Lesson number must be a positive integer");
    const lesson = store.q.lessonAt.get(course.id, Number(ctx.params.position));
    if (!lesson) return ctx.send(404, { message: "Lesson not found" });
    const done = new Set(store.q.completedLessons.all(ctx.user.id, course.id).map((row) => row.position));
    for (let position = 1; position < lesson.position; position += 1) {
      if (!done.has(position)) return ctx.send(409, { message: `Complete lesson ${position} first` });
    }
    const result = store.q.insertProgress.run(ctx.user.id, lesson.id, new Date().toISOString());
    if (result.changes) ctx.audit("TRAINING_LESSON_COMPLETED", `${course.slug}#${lesson.position}`);
    const total = store.q.lessonCount.get(course.id).n;
    const completed = done.size + (done.has(lesson.position) ? 0 : 1);
    return ctx.send(200, { completed: true, progress: { completed, total }, quizUnlocked: completed >= total });
  });
}
