// "Spot the difference" between a genuine and a spoofed sign-in page. The pages are drawn
// with plain elements (no real brand logos) and the addresses are fictional look-alikes.
import { h, mount } from "../../core/dom.js";

const PAIRS = [
  {
    left: "https://login.microsoftonline.com/common/oauth2",
    right: "https://login.microsoftonline.com.account-verify.co/common/oauth2",
    fake: "right",
    why: "Read the domain from the right: the second page really belongs to account-verify.co."
  },
  {
    left: "https://portal.biztat-solutions.example/signin",
    right: "https://portal.biztat-solutlons.example/signin",
    fake: "right",
    why: "\"solutlons\" swaps an i for an l – a classic look-alike domain."
  },
  {
    left: "http://secure-payroll-biztat.example/login",
    right: "https://payroll.biztat-solutions.example/login",
    fake: "left",
    why: "The first page is on an unrelated domain and does not even use https."
  }
];

function mockPage(address) {
  return h("div", { class: "mock-login", "aria-hidden": "true" },
    h("div", { class: "mock-address" }, `🔒 ${address}`),
    h("strong", {}, "Sign in"),
    h("span", { class: "muted" }, "Email or username"),
    h("div", { class: "mock-address" }, " "),
    h("span", { class: "muted" }, "Password"),
    h("div", { class: "mock-address" }, " "));
}

export default function spoofedLogin({ onComplete }) {
  let index = 0;
  let right = 0;
  const body = h("div", {});
  const live = h("p", { class: "exercise-score", "aria-live": "polite" }, `Pair 1 of ${PAIRS.length}`);

  function draw(feedback = null) {
    const pair = PAIRS[index];
    const choose = (side) => {
      const correct = side === pair.fake;
      if (correct) right += 1;
      draw({ correct, why: pair.why });
    };
    mount(body,
      h("p", {}, "Both pages look identical. Which one is the fake? Read the address bar carefully."),
      h("div", { class: "choice-grid" },
        h("button", { type: "button", class: ["choice-card", feedback && pair.fake === "left" ? "incorrect" : "", feedback && pair.fake !== "left" ? "correct" : ""], disabled: Boolean(feedback), on: { click: () => choose("left") } },
          h("span", {}, "Page A is fake"), h("span", { class: "sr-only" }, `Address: ${pair.left}`), mockPage(pair.left)),
        h("button", { type: "button", class: ["choice-card", feedback && pair.fake === "right" ? "incorrect" : "", feedback && pair.fake !== "right" ? "correct" : ""], disabled: Boolean(feedback), on: { click: () => choose("right") } },
          h("span", {}, "Page B is fake"), h("span", { class: "sr-only" }, `Address: ${pair.right}`), mockPage(pair.right))),
      feedback ? h("div", { class: `callout ${feedback.correct ? "callout-do" : "callout-dont"}` },
        h("p", { class: "callout-title" }, feedback.correct ? "✓ Correct" : "✕ Not quite"), h("p", {}, feedback.why),
        index < PAIRS.length - 1
          ? h("button", { type: "button", on: { click: () => { index += 1; live.textContent = `Pair ${index + 1} of ${PAIRS.length}`; draw(); } } }, "Next pair")
          : h("p", { class: "completed-note" }, `Exercise complete – you spotted ${right} of ${PAIRS.length}.`)) : null);
    if (feedback && index === PAIRS.length - 1) onComplete();
  }
  draw();
  return h("section", { class: "exercise", "aria-labelledby": "exercise-title" },
    h("div", { class: "exercise-header" }, h("h2", { id: "exercise-title" }, "Exercise: spot the fake login page"), live),
    body);
}
