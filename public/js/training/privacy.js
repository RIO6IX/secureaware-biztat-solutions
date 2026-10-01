// Short privacy notice shown on the Training page (ethical use of employee data).
import { h } from "../core/dom.js";

export const RETENTION_YEARS = 3;

export function privacyNotice() {
  return h("details", { class: "privacy-notice" },
    h("summary", {}, "How SecureAware uses your training data"),
    h("ul", {},
      h("li", {}, h("strong", {}, "What we record: "), "lessons you complete, quiz attempts (the questions you were given, your answers, scores and times) and certificates. Nothing you type in practice exercises is sent or saved."),
      h("li", {}, h("strong", {}, "Why: "), "to show that Biztat staff have completed required security training (ISO/IEC 27001 A.6.3) and to help you see where to improve."),
      h("li", {}, h("strong", {}, "Who can see it: "), "you; your department manager sees your course status, scores and number of attempts but not your individual answers; the Security/HR and System Admin teams can see full records to run the programme. Other employees cannot see your data."),
      h("li", {}, h("strong", {}, "How long: "), `attempts, answers, certificates and lesson progress are deleted automatically after ${RETENTION_YEARS} years.`),
      h("li", {}, h("strong", {}, "Your rights: "), "download your own training record from ", h("a", { href: "#/my-learning" }, "My learning"), " at any time, and contact the Security/HR team to ask for corrections.")));
}
