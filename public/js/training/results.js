import { api } from "../core/api.js";
import { h, formatDateTime } from "../core/dom.js";
import { withStates, pageHeader } from "../core/ui.js";
import { courseHref, lessonHref, quizHref } from "./common.js";

// Results never say which option was correct: they show the learner's own choice, whether
// it was right, the explanation and the lesson to revisit. Retakes draw new questions.
export function resultsPage(container, { id }) {
  return withStates(container, () => api(`/api/training/attempts/${encodeURIComponent(id)}/result`), (data) => {
    const { attempt, course, review, topicsToReview, certificateCode, attemptsLeft, cooldownUntil } = data;
    const passed = attempt.passed;
    const correct = review.filter((item) => item.answeredCorrectly).length;
    let nextAction;
    if (passed) nextAction = h("a", { class: "button primary", href: `#/training/certificates/${certificateCode}` }, "View certificate");
    else if (attemptsLeft > 0) {
      nextAction = h("div", { class: "stack" },
        h("p", {}, `You have ${attemptsLeft} attempt(s) left.`, cooldownUntil ? ` Review the lessons below, then retake after ${formatDateTime(cooldownUntil)}.` : ""),
        h("a", { class: "button primary", href: cooldownUntil ? courseHref(course.slug) : quizHref(course.slug) }, cooldownUntil ? "Back to the course" : "Retake quiz"));
    } else nextAction = h("p", { class: "lock-reason" }, "You have used every attempt. The Security/HR team can arrange extra support or another attempt.");

    return h("div", { class: "stack" },
      pageHeader("Quiz results", `${course.title} · attempt ${attempt.attemptNumber} of ${course.maxAttempts}`, null, [["Training", "#/training"], [course.title, courseHref(course.slug)], ["Results"]]),
      h("section", { class: "panel result-hero", "aria-live": "polite" },
        h("div", { class: ["score-circle", passed ? "pass" : "fail"] }, `${attempt.score}%`),
        h("div", { class: "stack" },
          h("h2", {}, passed ? "Passed – well done!" : "Not passed this time"),
          h("p", {}, `You answered ${correct} of ${review.length} questions correctly. The pass mark is ${course.passMark}%.`),
          h("p", { class: "muted small" }, `Submitted ${formatDateTime(attempt.submittedAt)} · course version ${attempt.courseVersion}`),
          nextAction)),
      !passed && topicsToReview.length ? h("section", { class: "panel" },
        h("h2", {}, "Topics to review"),
        h("p", { class: "muted" }, "These lessons cover the questions you missed. The next attempt uses different questions, so focus on the ideas rather than the answers."),
        h("ul", { class: "topics" }, topicsToReview.map((topic) => h("li", {},
          h("a", { href: lessonHref(course.slug, topic.position) }, `Lesson ${topic.position}: ${topic.title}`),
          h("span", { class: "muted" }, ` – ${topic.missed} question(s) missed`))))) : null,
      h("section", { class: "panel" },
        h("h2", {}, "Question by question"),
        h("ol", { class: "question-review" }, review.map((item) => h("li", { class: item.answeredCorrectly ? "right" : "wrong" },
          h("p", { class: ["verdict", item.answeredCorrectly ? "right" : "wrong"] }, item.answeredCorrectly ? "✓ Correct" : "✕ Incorrect"),
          item.scenarioText ? h("p", { class: "scenario" }, item.scenarioText) : null,
          h("p", {}, h("strong", {}, item.prompt)),
          h("p", {}, h("span", { class: "muted" }, "Your answer: "), item.yourAnswer.join("; ") || "No answer"),
          item.explanation
            ? h("p", {}, h("span", { class: "muted" }, "Why: "), item.explanation)
            : h("p", { class: "muted" }, "The explanation for this question unlocks when you pass the course. Revisit the lesson below and think about why your choice might not be the safest option."),
          item.lesson ? h("p", { class: "small" }, h("a", { href: lessonHref(course.slug, item.lesson.position) }, `Revisit lesson ${item.lesson.position}: ${item.lesson.title}`)) : null)))));
  });
}
