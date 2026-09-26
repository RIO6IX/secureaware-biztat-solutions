import { api } from "../core/api.js";
import { h, mount, formatDate } from "../core/dom.js";
import { currentQuery } from "../core/router.js";
import { withStates, pageHeader, field, loading, errorState } from "../core/ui.js";

export function certificatePage(container, { code }) {
  return withStates(container, () => api(`/api/training/me/certificates/${encodeURIComponent(code)}`), ({ certificate }) => h("div", { class: "certificate-page" },
    pageHeader("Certificate of completion", "", h("div", { class: "certificate-actions" },
      h("button", { type: "button", class: "primary", on: { click: () => window.print() } }, "Print or save as PDF")),
    [["Training", "#/training"], ["My learning", "#/my-learning"], ["Certificate"]]),
    h("article", { class: "certificate", "aria-label": "Certificate of completion" },
      h("div", { class: "brand" }, h("span", { class: "brand-mark", "aria-hidden": "true" }, "SA"), h("span", {}, "SecureAware · Biztat Solutions")),
      h("p", { class: "certificate-title" }, "Certificate of Completion"),
      h("p", {}, "This certifies that"),
      h("p", { class: "certificate-name" }, certificate.learnerName),
      h("p", {}, "has successfully completed the security awareness course"),
      h("p", { class: "certificate-course" }, certificate.course.title),
      h("div", { class: "certificate-meta" },
        h("span", {}, `Date: ${formatDate(certificate.issuedAt)}`),
        h("span", {}, `Score: ${certificate.score}%`),
        h("span", {}, `Course version: ${certificate.courseVersion}`)),
      h("p", { class: "small" }, "Certificate code ", h("span", { class: "certificate-code" }, certificate.code)),
      h("p", { class: "muted small" }, "Verify this certificate in SecureAware under Learning → Verify a certificate.")),
    h("p", { class: "certificate-actions" }, h("a", { href: `#/training/verify?code=${encodeURIComponent(certificate.code)}` }, "Check this certificate's verification record"))));
}

export function verifyPage(container) {
  const input = h("input", { id: "verify-code", name: "code", placeholder: "SA-XXXX-XXXX-XXXX-XXXX", autocomplete: "off", value: currentQuery().get("code") || "", maxlength: "40", required: true });
  const result = h("div", { class: "verify-result", "aria-live": "polite" });
  async function check() {
    const code = input.value.trim();
    if (!code) return;
    mount(result, loading("Checking…"));
    try {
      const data = await api(`/api/training/certificates/${encodeURIComponent(code)}`);
      mount(result, data.valid
        ? h("div", { class: "callout callout-do" }, h("p", { class: "callout-title" }, "✓ Valid certificate"), h("p", {}, `Issued for "${data.course}" on ${formatDate(data.issuedOn)}.`))
        : h("div", { class: "callout callout-dont" }, h("p", { class: "callout-title" }, "✕ Not a valid certificate code"), h("p", {}, "Check the code for typing mistakes.")));
    } catch (error) {
      mount(result, errorState(error, check));
    }
  }
  const form = h("form", { class: "stack narrow", on: { submit: (event) => { event.preventDefault(); check(); } } },
    field("Certificate code", input, "The code is printed at the bottom of every SecureAware certificate."),
    h("button", { type: "submit", class: "primary" }, "Verify"));
  mount(container,
    pageHeader("Verify a certificate", "Confirms whether a code is genuine. For privacy, the result shows only the course and date – never the holder's name or score."),
    h("section", { class: "panel" }, form, result));
  if (input.value) check();
}
