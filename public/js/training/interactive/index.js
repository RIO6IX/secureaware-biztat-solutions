// Interactive lesson elements, looked up by the key stored on the lesson.
import phishingEmail from "./phishing-email.js";

const registry = {
  "phishing-email": phishingEmail
};

export function interactiveFor(key) {
  return registry[key] || null;
}
