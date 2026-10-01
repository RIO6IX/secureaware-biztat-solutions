import { api } from "../core/api.js";
import { h, externalLink, formatDateTime } from "../core/dom.js";
import { withStates, pageHeader } from "../core/ui.js";
import { cover } from "./covers.js";
import { statusBadge, dueLabel, lessonHref, quizHref, nextStep, minutes } from "./common.js";

function quizBox(slug, quiz, state) {
  let lockReason = null;
  if (state.status === "passed") lockReason = "You have passed this course.";
  else if (!quiz.unlocked) lockReason = "Complete every lesson to unlock the quiz.";
  else if (quiz.attemptsLeft === 0 && !state.inProgressAttemptId) lockReason = "No attempts left. Contact the Security/HR team if you need another attempt.";
  else if (quiz.cooldownUntil) lockReason = `Review the lessons, then try again after ${formatDateTime(quiz.cooldownUntil)}.`;
  return h("aside", { class: "panel quiz-box", "aria-labelledby": "quiz-box-title" },
    h("h2", { id: "quiz-box-title" }, "Assessment"),
    h("dl", { class: "facts" },
      h("div", {}, h("dt", {}, "Questions"), h("dd", {}, String(quiz.questionsPerAttempt))),
      h("div", {}, h("dt", {}, "Pass mark"), h("dd", {}, `${quiz.passMark}%`)),
      h("div", {}, h("dt", {}, "Attempts left"), h("dd", {}, `${quiz.attemptsLeft} of ${quiz.maxAttempts}`)),
      h("div", {}, h("dt", {}, "Wait after a fail"), h("dd", {}, quiz.cooldownMinutes ? minutes(quiz.cooldownMinutes) : "None"))),
    h("p", { class: "muted small" }, "Questions are drawn at random for every attempt, so a retake is a new test."),
    lockReason && !state.inProgressAttemptId
      ? h("p", { class: "lock-reason" }, h("span", { "aria-hidden": "true" }, "🔒 "), lockReason)
      : h("a", { class: "button primary block", href: quizHref(slug) }, state.inProgressAttemptId ? "Resume quiz" : "Start quiz"),
    state.certificateCode ? h("a", { class: "button block", href: `#/training/certificates/${state.certificateCode}` }, "View certificate") : null);
}

export function coursePage(container, { slug }) {
  return withStates(container, () => api(`/api/training/courses/${encodeURIComponent(slug)}`), ({ course, state, lessons, quiz }) => {
    const step = nextStep(course.slug, state);
    return h("div", { class: "course-page" },
      pageHeader(course.title, "", null, [["Training", "#/training"], [course.title]]),
      h("section", { class: "hero" },
        h("div", { class: "hero-cover" }, cover(course.cover, course.title)),
        h("div", { class: "hero-body" },
          h("div", { class: "chip-row" }, h("span", { class: "chip" }, course.category), state.mandatory ? h("span", { class: "chip chip-strong" }, "Mandatory") : null, statusBadge(state.status)),
          h("p", { class: "lead" }, course.summary),
          h("p", { class: "meta" }, `${course.level} · ${minutes(course.durationMinutes)} · ${lessons.length} lessons`, state.dueDate ? " · " : "", dueLabel(state)),
          h("div", { class: "hero-actions" }, h("a", { class: "button primary", href: step.href }, step.label)))),
      h("div", { class: "course-layout" },
        h("div", { class: "stack" },
          h("section", { class: "panel" }, h("h2", {}, "About this course"), h("p", {}, course.description), course.audienceNote ? h("p", { class: "muted" }, course.audienceNote) : null),
          h("section", { class: "panel" }, h("h2", {}, "What you will learn"),
            h("ul", { class: "check-list" }, course.learningObjectives.map((objective) => h("li", {}, objective)))),
          course.whyItMatters.length ? h("section", { class: "panel" }, h("h2", {}, "Why this matters at Biztat"),
            h("div", { class: "stat-grid" }, course.whyItMatters.map((item) => h("figure", { class: "stat" },
              h("p", { class: "stat-value" }, item.stat),
              h("figcaption", {}, h("p", {}, item.text), h("p", { class: "small" }, "Source: ", externalLink(item.source.url, item.source.title))))))) : null,
          h("section", { class: "panel" }, h("h2", {}, "Lessons"),
            h("ol", { class: "outline" }, lessons.map((lesson) => h("li", { class: lesson.completed ? "done" : "" },
              h("span", { class: "outline-mark", "aria-hidden": "true" }, lesson.completed ? "✓" : String(lesson.position)),
              h("a", { href: lessonHref(course.slug, lesson.position) }, lesson.title),
              h("span", { class: "muted small" }, ` ${minutes(lesson.estimatedMinutes)}`, lesson.interactive ? " · interactive" : ""),
              h("span", { class: "sr-only" }, lesson.completed ? " (completed)" : " (not completed)")))))),
        quizBox(course.slug, quiz, state)));
  });
}
