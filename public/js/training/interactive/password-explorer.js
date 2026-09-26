// Password explorer. Everything runs in the browser and nothing typed here is sent anywhere
// or stored. The checks mirror NIST SP 800-63B-4 (length, blocklist, no composition rules)
// and deliberately avoid inventing "time to crack" figures.
import { h, mount } from "../../core/dom.js";

const COMMON = ["password", "passw0rd", "123456", "qwerty", "letmein", "welcome", "admin", "iloveyou", "monkey", "dragon", "football", "biztat", "secureaware", "summer", "winter", "colombo", "srilanka"];

function assess(value) {
  const length = [...value].length;
  const lower = value.toLowerCase();
  const words = value.trim().split(/\s+/).filter(Boolean);
  const findings = [];
  const common = COMMON.filter((word) => lower.replace(/[^a-z0-9]/g, "").includes(word));
  if (!length) return { level: "empty", label: "Type something to see feedback", findings };
  if (length < 15) findings.push(`${length} characters – NIST SP 800-63B-4 asks for at least 15 when a password is used on its own.`);
  else findings.push(`${length} characters – meets the 15-character minimum.`);
  if (common.length) findings.push(`Contains common or context words (${common.join(", ")}) that are on blocklists and tried first by attackers.`);
  if (/(.)\1{3,}/.test(value)) findings.push("Contains a long run of the same character, which adds little strength.");
  if (/(19|20)\d{2}/.test(value)) findings.push("Contains a year – dates are among the first things attackers try.");
  if (words.length >= 4) findings.push(`${words.length} words – a passphrase. Make sure the words are random, not a well-known phrase.`);
  if (/[^a-z0-9\s]/i.test(value) && length < 15) findings.push("Symbols do not make up for a short password. Adding length helps far more.");
  let level = "weak";
  if (length >= 15 && !common.length) level = length >= 20 ? "strong" : "good";
  else if (length >= 15) level = "fair";
  const labels = { weak: "Weak – too short or too predictable", fair: "Fair – long enough, but contains predictable words", good: "Good – meets the length rule", strong: "Strong – long and free of common words" };
  return { level, label: labels[level], findings };
}

export default function passwordExplorer({ onComplete }) {
  const input = h("input", { id: "explorer-input", type: "text", autocomplete: "off", spellcheck: "false", placeholder: "Try: Summer2026!  then try: lantern orbit pepper canal", "aria-describedby": "explorer-note" });
  const meter = h("progress", { class: "progress", max: "3", value: "0", "aria-label": "Strength" });
  const label = h("p", { class: "strength-label", "aria-live": "polite" }, "Type something to see feedback");
  const list = h("ul", { class: "strength-list" });
  let completed = false;

  input.addEventListener("input", () => {
    const result = assess(input.value);
    meter.value = { empty: 0, weak: 0.5, fair: 1.5, good: 2.3, strong: 3 }[result.level];
    label.textContent = result.label;
    mount(list, result.findings.map((finding) => h("li", {}, finding)));
    if (!completed && (result.level === "good" || result.level === "strong")) {
      completed = true;
      onComplete();
    }
  });

  return h("section", { class: "exercise", "aria-labelledby": "exercise-title" },
    h("div", { class: "exercise-header" }, h("h2", { id: "exercise-title" }, "Exercise: password explorer")),
    h("p", { id: "explorer-note", class: "muted small" }, "Practice only – never type a real password here. Nothing you type is sent or saved."),
    h("label", { class: "field", for: "explorer-input" }, h("span", { class: "field-label" }, "Try a password or passphrase"), input),
    h("div", { class: "strength-meter" }, meter, label, list),
    h("p", { class: "small" }, "Build a passphrase that reaches \"Good\" or \"Strong\" to complete the exercise."));
}
