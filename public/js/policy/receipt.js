import { api, download } from "../core/api.js";
import { h, formatDateTime } from "../core/dom.js";
import { withStates, pageHeader, table, toast, emptyState } from "../core/ui.js";
import { policyHref } from "./common.js";

export function receiptPage(container, params) {
  return withStates(container, () => api(`/api/policy/receipts/${encodeURIComponent(params.code)}`), ({ receipt }) => h("div", { class: "stack" },
    pageHeader("Acknowledgement receipt", "Keep this receipt as proof that you accepted the policy.",
      h("button", { type: "button", class: "no-print", on: { click: () => window.print() } }, "Print receipt"),
      [["My policies", "#/policies"], ["My acknowledgements", "#/policies/receipts"], [receipt.receiptCode, null]]),
    h("section", { class: "receipt panel", "aria-labelledby": "receipt-title" },
      h("div", { class: "brand" }, h("span", { class: "brand-mark", "aria-hidden": "true" }, "SA"), h("span", {}, "SecureAware · Biztat Solutions")),
      h("h2", { id: "receipt-title" }, "Policy acknowledgement"),
      h("dl", { class: "facts receipt-facts" },
        h("dt", {}, "Receipt ID"), h("dd", {}, h("code", {}, receipt.receiptCode)),
        h("dt", {}, "Employee"), h("dd", {}, `${receipt.employee.displayName} (${receipt.employee.department})`),
        h("dt", {}, "Policy"), h("dd", {}, h("a", { href: policyHref(receipt.policy.slug) }, receipt.policy.title)),
        h("dt", {}, "Version"), h("dd", {}, receipt.versionLabel),
        h("dt", {}, "Acknowledged"), h("dd", {}, formatDateTime(receipt.acknowledgedAt)),
        h("dt", {}, "Signed as"), h("dd", {}, receipt.typedFullName),
        h("dt", {}, "Statement"), h("dd", {}, receipt.statement),
        h("dt", {}, "Content SHA-256"), h("dd", {}, h("code", { class: "hash" }, receipt.contentSha256)),
        h("dt", {}, "Browser"), h("dd", {}, receipt.browser)),
      h("p", { class: "muted small" }, "The SHA-256 fingerprint identifies the exact text shown. If even one character of the policy changed, the fingerprint would be different."))));
}

export function myReceiptsPage(container) {
  return withStates(container, () => api("/api/policy/me/acknowledgements"), (data) => h("div", { class: "stack" },
    pageHeader("My acknowledgements", "Every policy acknowledgement recorded about you.",
      h("button", { type: "button", on: { click: () => download("/api/policy/me/acknowledgements.csv", "my-policy-acknowledgements.csv").catch((error) => toast(error.message, "error")) } }, "Download my record (CSV)"),
      [["My policies", "#/policies"], ["My acknowledgements", null]]),
    data.acknowledgements.length ? table([
      { label: "Policy", render: (row) => h("a", { href: policyHref(row.policy.slug) }, row.policy.title) },
      { label: "Version", key: "versionLabel" },
      { label: "Acknowledged", render: (row) => formatDateTime(row.acknowledgedAt) },
      { label: "Receipt", render: (row) => h("a", { href: `#/policies/receipts/${row.receiptCode}` }, row.receiptCode) }
    ], data.acknowledgements, { caption: "My acknowledgements" }) : emptyState("No acknowledgements yet", "Policies you acknowledge will be listed here.")));
}
