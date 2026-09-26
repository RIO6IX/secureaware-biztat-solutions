import { api } from "../core/api.js";
import { h, mount, uid, formatDateTime } from "../core/dom.js";
import { navigate } from "../core/router.js";
import { loading, errorState, pageHeader, progressBar, confirmDialog, toast } from "../core/ui.js";
import { courseHref } from "./common.js";

// Answers in progress are kept in sessionStorage (this tab only) so a reload does not lose
// them. They are a convenience copy; the server marks only what is finally submitted.
function draftKey(attemptId) {
  return `secureaware.quiz.${attemptId}`;
}
function loadDraft(attemptId) {
  try {
    return new Map(JSON.parse(sessionStorage.getItem(draftKey(attemptId)) || "[]"));
  } catch {
    return new Map();
  }
}
function saveDraft(attemptId, answers) {
  try {
    sessionStorage.setItem(draftKey(attemptId), JSON.stringify([...answers]));
  } catch {
    // Ignore storage failures; answers stay in memory.
  }
}
function clearDraft(attemptId) {
  try {
    sessionStorage.removeItem(draftKey(attemptId));
  } catch {
    // Nothing to clear.
  }
}

export async function quizPage(container, { slug }) {
  mount(container, loading("Preparing your quiz…"));
  let data;
  try {
    data = await api(`/api/training/courses/${encodeURIComponent(slug)}/attempts`, { method: "POST", body: {} });
  } catch (error) {
    if (error.status === 401) return;
    const retryAt = error.body?.retryAt;
    const message = retryAt ? `${error.message} You can try again after ${formatDateTime(retryAt)}.` : error.message || "The quiz could not be started.";
    mount(container,
      pageHeader("Quiz not available", "", null, [["Training", "#/training"], ["Course", courseHref(slug)], ["Quiz"]]),
      error.status === 403 || error.status === 429 || error.status === 409
        ? h("section", { class: "panel" }, h("p", { class: "lock-reason", role: "alert" }, message), h("a", { class: "button primary", href: courseHref(slug) }, "Back to the course"))
        : errorState(error, () => quizPage(container, { slug })));
    return;
  }

  const { course, attempt } = data;
  const questions = attempt.questions;
  const answers = loadDraft(attempt.id);
  let index = Math.min(answers.size, questions.length - 1);
  let reviewing = false;
  const body = h("div", {});
  const timer = h("span", { class: "timer" });
  const live = h("p", { class: "quiz-hint", "aria-live": "assertive" });

  function remainingText() {
    const ms = new Date(attempt.expiresAt).getTime() - Date.now();
    if (ms <= 0) return "Time is up";
    const minutes = Math.floor(ms / 60000);
    return `${minutes} min left`;
  }
  timer.textContent = remainingText();
  const interval = setInterval(() => {
    if (!document.body.contains(timer)) return clearInterval(interval);
    timer.textContent = remainingText();
    return undefined;
  }, 15000);

  function questionView() {
    const question = questions[index];
    const selected = new Set(answers.get(question.id) || []);
    const name = uid("q");
    const legendId = uid("legend");
    const options = question.options.map((option) => {
      const input = h("input", { type: question.selectMultiple ? "checkbox" : "radio", name, value: String(option.id), checked: selected.has(option.id) });
      input.addEventListener("change", () => {
        if (question.selectMultiple) {
          if (input.checked) selected.add(option.id);
          else selected.delete(option.id);
        } else {
          selected.clear();
          selected.add(option.id);
        }
        if (selected.size) answers.set(question.id, [...selected]);
        else answers.delete(question.id);
        saveDraft(attempt.id, answers);
        live.textContent = "";
      });
      return h("label", { class: "option" }, input, h("span", {}, option.text));
    });
    function next() {
      if (!answers.has(question.id)) {
        live.textContent = "Choose an answer to continue.";
        return;
      }
      if (index === questions.length - 1) reviewing = true;
      else index += 1;
      draw();
    }
    return h("form", { class: "quiz-card", on: { submit: (event) => { event.preventDefault(); next(); } } },
      h("fieldset", { "aria-labelledby": legendId },
        h("legend", { id: legendId }, h("span", { class: "sr-only" }, `Question ${index + 1} of ${questions.length}. `), question.prompt),
        question.scenarioText ? h("div", { class: "scenario" }, h("strong", {}, "Scenario: "), question.scenarioText) : null,
        question.selectMultiple ? h("p", { class: "muted" }, "Select all that apply.") : null,
        h("div", { class: "options" }, options)),
      live,
      h("div", { class: "quiz-actions" },
        index > 0 ? h("button", { type: "button", on: { click: () => { index -= 1; draw(); } } }, "← Previous") : h("span"),
        h("button", { type: "submit", class: "primary" }, index === questions.length - 1 ? "Review answers" : "Next →")));
  }

  function reviewView() {
    const unanswered = questions.filter((question) => !answers.has(question.id)).length;
    return h("section", { class: "quiz-card", "aria-labelledby": "review-title" },
      h("h2", { id: "review-title" }, "Review your answers"),
      h("p", { class: "muted" }, unanswered ? `${unanswered} question(s) still need an answer.` : "You can change any answer before you submit. After submitting, answers are final."),
      h("ol", { class: "review-list" }, questions.map((question, position) => {
        const chosen = (answers.get(question.id) || []).map((optionId) => question.options.find((option) => option.id === optionId)?.text).filter(Boolean);
        return h("li", {},
          h("div", {}, h("strong", {}, `${position + 1}. ${question.prompt}`), h("p", { class: "review-answer" }, chosen.length ? chosen.join("; ") : "Not answered")),
          h("button", { type: "button", on: { click: () => { index = position; reviewing = false; draw(); } } }, "Change", h("span", { class: "sr-only" }, ` answer to question ${position + 1}`)));
      })),
      live,
      h("div", { class: "quiz-actions" },
        h("button", { type: "button", on: { click: () => { reviewing = false; index = questions.length - 1; draw(); } } }, "← Back"),
        h("button", { type: "button", class: "primary", on: { click: submit } }, "Submit quiz")));
  }

  async function submit() {
    if (questions.some((question) => !answers.has(question.id))) {
      live.textContent = "Answer every question before submitting.";
      return;
    }
    const ok = await confirmDialog({ title: "Submit your quiz?", body: h("p", {}, "Your answers will be marked and cannot be changed."), confirmLabel: "Submit" });
    if (!ok) return;
    try {
      await api(`/api/training/attempts/${attempt.id}/submit`, {
        method: "POST",
        body: { answers: questions.map((question) => ({ questionId: question.id, optionIds: answers.get(question.id) })) }
      });
      clearDraft(attempt.id);
      navigate(`/training/attempts/${attempt.id}`);
    } catch (error) {
      toast(error.message, "error");
      if (error.status === 409) navigate(`/training/${slug}`);
    }
  }

  function draw() {
    const answered = questions.filter((question) => answers.has(question.id)).length;
    mount(body,
      h("div", { class: "lesson-topbar" },
        h("div", { class: "lesson-topbar-row" },
          h("span", {}, reviewing ? "Review" : `Question ${index + 1} of ${questions.length}`),
          h("span", {}, `${answered} answered · `, timer)),
        progressBar(reviewing ? questions.length : index + 1, questions.length, reviewing ? "Reviewing answers" : `Question ${index + 1} of ${questions.length}`)),
      reviewing ? reviewView() : questionView());
    body.querySelector("legend, h2")?.setAttribute("tabindex", "-1");
    body.querySelector("legend, h2")?.focus();
  }

  mount(container, h("div", { class: "quiz" },
    pageHeader(`${course.title}: quiz`, `Attempt ${attempt.attemptNumber} of ${course.maxAttempts} · pass mark ${course.passMark}%`, null, [["Training", "#/training"], [course.title, courseHref(slug)], ["Quiz"]]),
    data.resumed ? h("p", { class: "lock-reason" }, "Welcome back – you are continuing the attempt you already started.") : null,
    body));
  draw();
}
