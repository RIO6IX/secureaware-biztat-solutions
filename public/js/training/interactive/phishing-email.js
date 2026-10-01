// "Spot the red flags" exercise. Every part of the sample email is a button, including
// innocent parts, so learners must judge each one instead of tabbing to the answers.
import { h } from "../../core/dom.js";

const PARTS = {
  sender: { flag: true, title: "Look-alike sender domain", detail: "The display name says Microsoft 365, but the address is micros0ft-support.co – a zero instead of the letter o, on a domain Microsoft does not use." },
  subject: { flag: true, title: "Artificial urgency", detail: "\"Suspended in 2 hours\" is designed to make you act before you think. Real services give notice and let you check in the usual way." },
  date: { flag: false, detail: "The date and time look normal. Timing alone does not tell you much." },
  greeting: { flag: true, title: "Generic greeting", detail: "\"Dear user\" suggests a mass mailing. Services you use normally know your name – though a personalised greeting does not make a message safe either." },
  link: { flag: true, title: "Link text does not match its destination", detail: "The button says Microsoft, but hovering shows login.microsoftonline.com.verify-session.net. Read domains from the right: the real owner is verify-session.net." },
  request: { flag: true, title: "Asks for your password and MFA code", detail: "No legitimate service or Biztat IT team will ask you to send your password or a one-time code." },
  attachment: { flag: true, title: "Unexpected compressed attachment", detail: "A ZIP file called an \"invoice\" that you were not expecting is a common way to deliver malware." },
  signature: { flag: false, detail: "A signature block is easy to copy, so it neither proves nor disproves anything. Judge the request, not the branding." }
};

const TOTAL_FLAGS = Object.values(PARTS).filter((part) => part.flag).length;
const REQUIRED = 5;

export default function phishingEmail({ onComplete }) {
  const found = new Set();
  const feedback = h("ul", { class: "flag-feedback", "aria-live": "polite" });
  const status = h("p", { class: "exercise-score", "aria-live": "polite" }, `0 of ${TOTAL_FLAGS} red flags found`);
  const note = h("p", { class: "muted small", "aria-live": "polite" });
  let completed = false;

  function update() {
    status.textContent = `${found.size} of ${TOTAL_FLAGS} red flags found`;
    if (!completed && found.size >= REQUIRED) {
      completed = true;
      note.textContent = found.size === TOTAL_FLAGS ? "Excellent – you found every red flag." : `Good work. You found ${found.size}. Use "Show all" to see the rest.`;
      onComplete();
    }
  }

  function part(key, ...content) {
    const info = PARTS[key];
    const button = h("button", { type: "button", class: "flag", "aria-pressed": "false", dataset: { part: key }, on: { click: () => {
      if (!info.flag) {
        note.textContent = info.detail;
        return;
      }
      if (found.has(key)) return;
      found.add(key);
      button.classList.add("found");
      button.setAttribute("aria-pressed", "true");
      feedback.append(h("li", {}, h("strong", {}, `${info.title}. `), info.detail));
      update();
    } } }, content);
    return button;
  }

  function revealAll() {
    for (const key of Object.keys(PARTS)) {
      if (PARTS[key].flag && !found.has(key)) {
        email.querySelector(`[data-part="${key}"]`)?.click();
      }
    }
  }

  const email = h("div", { class: "fake-email", role: "group", "aria-label": "Sample suspicious email" },
    h("div", { class: "fake-email-head" },
      h("div", {}, h("strong", {}, "From: "), part("sender", "Microsoft 365 Security <no-reply@micros0ft-support.co>")),
      h("div", {}, h("strong", {}, "To: "), "you@biztat.example"),
      h("div", {}, h("strong", {}, "Subject: "), part("subject", "URGENT: Your mailbox will be suspended in 2 hours")),
      h("div", {}, h("strong", {}, "Date: "), part("date", "Tuesday, 09:14"))),
    h("div", { class: "fake-email-body" },
      h("p", {}, part("greeting", "Dear user,")),
      h("p", {}, "We detected unusual activity and your mailbox storage has exceeded its limit. To avoid losing your emails, verify your account now."),
      h("p", {}, part("link", h("span", { class: "fake-button", title: "https://login.microsoftonline.com.verify-session.net/confirm" }, "Verify with Microsoft"))),
      h("p", {}, part("request", "To confirm it's you, reply with your password and the 6-digit code we send to your phone.")),
      h("p", {}, part("attachment", h("span", { class: "fake-attachment" }, "📎 Mailbox_Quota_Invoice.zip (212 KB)"))),
      h("p", {}, part("signature", "Kind regards,", h("br"), "Microsoft 365 Account Team"))));

  return h("section", { class: "exercise", "aria-labelledby": "exercise-title" },
    h("div", { class: "exercise-header" },
      h("h2", { id: "exercise-title" }, "Exercise: spot the red flags"),
      status),
    h("p", {}, `Select every part of this email that is a warning sign. Some parts are normal. Find at least ${REQUIRED} red flags to complete the exercise. Tip: the Verify button shows its real address when you hover over it.`),
    email,
    note,
    feedback,
    h("button", { type: "button", on: { click: revealAll } }, "Show all red flags"));
}
