import { createQuiz } from "../quiz.js";
import { createRateLimiter } from "../rateLimit.js";
import { canViewUser } from "../access.js";
import { id as idValue, slug as slugValue } from "../validate.js";

export const QUIZ_RATE_LIMIT = { limit: 10, windowMs: 60_000 };

export default function registerQuiz({ route, store, foundation }) {
  const quiz = createQuiz(foundation.db);
  const startLimiter = createRateLimiter(QUIZ_RATE_LIMIT);
  const submitLimiter = createRateLimiter(QUIZ_RATE_LIMIT);

  function limited(ctx, limiter, action) {
    const verdict = limiter(`${ctx.user.id}:${action}`);
    if (verdict.allowed) return false;
    ctx.audit("TRAINING_RATE_LIMITED", action);
    ctx.response.setHeader("retry-after", String(verdict.retryAfterSeconds));
    ctx.send(429, { message: "Too many requests. Please wait a moment and try again." });
    return true;
  }

  // Owners only: an attempt id that belongs to someone else looks exactly like a missing one.
  function ownAttempt(ctx) {
    const attempt = quiz.q.attemptById.get(idValue(ctx.params.id, "attempt id"));
    if (!attempt || attempt.user_id !== ctx.user.id) {
      ctx.send(404, { message: "Attempt not found" });
      return null;
    }
    return attempt;
  }

  route("POST", "/courses/:slug/attempts", (ctx) => {
    if (limited(ctx, startLimiter, "quiz-start")) return;
    const course = store.q.courseBySlug.get(slugValue(ctx.params.slug, "course"));
    if (!store.canAccessCourse(ctx.user, course)) return ctx.send(404, { message: "Course not found" });
    store.expireStaleAttempts();
    const state = store.courseState(ctx.user, course);
    let attempt;
    try {
      attempt = quiz.startAttempt(ctx.user, course, state);
    } catch (error) {
      if (error.status === 429 || error.status === 403) ctx.audit("TRAINING_QUIZ_BLOCKED", `${course.slug}: ${error.status}`);
      if (error.status) return ctx.send(error.status, { message: error.publicMessage, retryAt: error.retryAt || null });
      if (String(error.message).includes("UNIQUE")) return ctx.send(409, { message: "An attempt is already being started. Please refresh." });
      throw error;
    }
    const resumed = attempt.id === state.inProgressAttemptId;
    if (!resumed) ctx.audit("TRAINING_QUIZ_STARTED", `${course.slug} attempt ${attempt.attempt_number}`);
    return ctx.send(resumed ? 200 : 201, {
      resumed,
      course: { slug: course.slug, title: course.title, passMark: course.pass_mark, maxAttempts: course.max_attempts },
      attempt: quiz.attemptForLearner(attempt)
    });
  });

  route("GET", "/attempts/:id", (ctx) => {
    const attempt = ownAttempt(ctx);
    if (!attempt) return;
    store.expireStaleAttempts();
    const fresh = quiz.q.attemptById.get(attempt.id);
    if (fresh.status !== "in_progress") return ctx.send(409, { message: "This attempt is no longer in progress", status: fresh.status });
    const course = store.q.courseById.get(fresh.course_id);
    return ctx.send(200, {
      course: { slug: course.slug, title: course.title, passMark: course.pass_mark, maxAttempts: course.max_attempts },
      attempt: quiz.attemptForLearner(fresh)
    });
  });

  route("POST", "/attempts/:id/submit", async (ctx) => {
    if (limited(ctx, submitLimiter, "quiz-submit")) return;
    const attempt = ownAttempt(ctx);
    if (!attempt) return;
    const body = await ctx.body();
    const course = store.q.courseById.get(attempt.course_id);
    const outcome = quiz.submitAttempt(attempt, course, body);
    ctx.audit("TRAINING_QUIZ_SUBMITTED", `${course.slug} attempt ${attempt.attempt_number}: ${outcome.score}%`);
    ctx.audit(outcome.passed ? "TRAINING_QUIZ_PASSED" : "TRAINING_QUIZ_FAILED", `${course.slug} attempt ${attempt.attempt_number}`);
    if (outcome.certificateCode) ctx.audit("TRAINING_CERTIFICATE_ISSUED", `${course.slug} attempt ${attempt.attempt_number}`);
    const state = store.courseState(ctx.user, course);
    return ctx.send(200, {
      ...quiz.resultView(quiz.q.attemptById.get(attempt.id), course),
      attemptsLeft: state.attemptsLeft,
      cooldownUntil: state.cooldownUntil
    });
  });

  // Results: the learner, their department manager, or an admin.
  route("GET", "/attempts/:id/result", (ctx) => {
    const attempt = quiz.q.attemptById.get(idValue(ctx.params.id, "attempt id"));
    const owner = attempt ? store.q.userById.get(attempt.user_id) : null;
    if (!attempt || !canViewUser(ctx.user, owner)) return ctx.send(404, { message: "Attempt not found" });
    if (attempt.status === "in_progress") return ctx.send(409, { message: "This attempt has not been submitted yet" });
    const course = store.q.courseById.get(attempt.course_id);
    const state = store.courseState(owner, course);
    return ctx.send(200, {
      ...quiz.resultView(attempt, course),
      learner: { displayName: owner.display_name },
      attemptsLeft: state.attemptsLeft,
      cooldownUntil: state.cooldownUntil
    });
  });
}
