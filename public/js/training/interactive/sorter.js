// Generic "decide for each item" exercise used by several courses. Learners choose a category
// for every item and then check their answers; feedback explains each one.
import { h, mount } from "../../core/dom.js";

export function sorter({ title, intro, categories, items, passRatio = 0.75 }) {
  return function build({ onComplete }) {
    const choices = new Map();
    const status = h("p", { class: "exercise-score", "aria-live": "polite" }, `0 of ${items.length} answered`);
    const result = h("div", { "aria-live": "polite" });
    let completed = false;

    const rows = items.map((item, index) => {
      const feedback = h("p", { class: "small", hidden: true });
      const buttons = categories.map((category) => h("button", { type: "button", "aria-pressed": "false", on: { click: () => {
        choices.set(index, category);
        buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.textContent === category)));
        status.textContent = `${choices.size} of ${items.length} answered`;
      } } }, category));
      const row = h("div", { class: "sorter-item", role: "group", "aria-label": `Item ${index + 1}` },
        item.code ? h("pre", { class: "mock-address" }, item.text) : h("p", {}, h("strong", {}, item.text)),
        h("div", { class: "sorter-options" }, buttons),
        feedback);
      return { row, feedback, item, index };
    });

    function check() {
      if (choices.size < items.length) {
        mount(result, h("p", { class: "form-error" }, "Choose an answer for every item first."));
        return;
      }
      let right = 0;
      for (const { row, feedback, item, index } of rows) {
        const correct = choices.get(index) === item.answer;
        if (correct) right += 1;
        row.classList.toggle("right", correct);
        row.classList.toggle("wrong", !correct);
        feedback.hidden = false;
        feedback.textContent = `${correct ? "✓ Correct" : `✕ Best answer: ${item.answer}`} – ${item.why}`;
      }
      const passed = right / items.length >= passRatio;
      mount(result, h("p", { class: passed ? "completed-note" : "form-error" },
        `${right} of ${items.length} correct. ${passed ? "Exercise complete." : "Read the feedback, then change your answers and check again."}`));
      if (passed && !completed) {
        completed = true;
        onComplete();
      }
    }

    return h("section", { class: "exercise", "aria-labelledby": "exercise-title" },
      h("div", { class: "exercise-header" }, h("h2", { id: "exercise-title" }, title), status),
      h("p", {}, intro),
      h("div", { class: "sorter" }, rows.map(({ row }) => row)),
      h("p", { class: "section-gap" }, h("button", { type: "button", class: "primary", on: { click: check } }, "Check my answers")),
      result);
  };
}
