// Interactive lesson elements, looked up by the key stored on the lesson. Keep this list in
// step with INTERACTIVE_KEYS in server/modules/training/schema.js.
import phishingEmail from "./phishing-email.js";
import spoofedLogin from "./spoofed-login.js";
import passwordExplorer from "./password-explorer.js";
import { dataClassifier, incidentTriage, remoteRisk, secureCodeReview } from "./exercises.js";

const registry = {
  "phishing-email": phishingEmail,
  "spoofed-login": spoofedLogin,
  "password-explorer": passwordExplorer,
  "data-classifier": dataClassifier,
  "incident-triage": incidentTriage,
  "remote-risk": remoteRisk,
  "secure-code-review": secureCodeReview
};

export function interactiveFor(key) {
  return registry[key] || null;
}
