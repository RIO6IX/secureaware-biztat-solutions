import { api } from "../core/api.js";
import { h, formatDate, formatDateTime } from "../core/dom.js";
import { currentQuery } from "../core/router.js";
import { withStates, pageHeader, toast, field, badge, emptyState } from "../core/ui.js";
import { policyHref } from "./common.js";

function nextMonth() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function questionsPage(container) {
  const state = ["open", "answered", "all"].includes(currentQuery().get("state")) ? currentQuery().get("state") : "open";
  const reload = () => questionsPage(container);
  return withStates(container, () => api(`/api/policy/admin/questions?state=${state}`), (data) => h("div", { class: "stack" },
    pageHeader("Policy questions", "Employees' requests for clarification. Answers appear under the policy without the asker's name, so everyone benefits."),
    h("div", { class: "tabs", role: "tablist", "aria-label": "Question lists" }, [["open", "Waiting"], ["answered", "Answered"], ["all", "All"]].map(([key, label]) =>
      h("a", { class: "tab", role: "tab", href: `#/policies/admin/questions?state=${key}`, "aria-selected": String(key === state) }, label))),
    data.questions.length ? data.questions.map((item) => {
      const answer = h("textarea", { id: `answer-${item.id}`, rows: "3", maxlength: "2000" }, item.answer || "");
      return h("article", { class: "panel" },
        h("p", { class: "muted small" }, h("a", { href: policyHref(item.policy.slug) }, `${item.policy.title} v${item.versionLabel}`), ` · ${item.askedBy} (${item.department || "—"}) · ${formatDateTime(item.createdAt)}`),
        h("p", {}, h("strong", {}, item.question)),
        item.answer ? h("p", { class: "muted small" }, `Answered by ${item.answeredBy || "—"} ${formatDateTime(item.answeredAt)}`) : null,
        field(item.answer ? "Edit answer" : "Answer", answer),
        h("button", { type: "button", class: "primary", on: { click: async () => {
          try {
            await api(`/api/policy/admin/questions/${item.id}/answer`, { method: "POST", body: { answer: answer.value } });
            toast("Answer published and the employee notified.");
            reload();
          } catch (error) {
            toast(error.message, "error");
          }
        } } }, "Save answer"));
    }) : emptyState(state === "open" ? "No questions waiting" : "No questions", "")));
}

export function exceptionsPage(container) {
  const reload = () => exceptionsPage(container);
  return withStates(container, () => api("/api/policy/admin/exceptions"), (data) => h("div", { class: "stack" },
    pageHeader("Policy exceptions", "Approve or reject requests to depart from a policy. Approved exceptions always expire."),
    data.exceptions.length ? data.exceptions.map((item) => {
      const note = h("textarea", { id: `note-${item.id}`, rows: "2", maxlength: "1000" });
      const expires = h("input", { id: `expires-${item.id}`, type: "date", value: nextMonth() });
      const decide = (decision) => async () => {
        try {
          await api(`/api/policy/admin/exceptions/${item.id}/decision`, { method: "POST", body: { decision, note: note.value, expiresOn: expires.value } });
          toast(`Exception ${decision}.`);
          reload();
        } catch (error) {
          toast(error.message, "error");
        }
      };
      const statusBadge = item.status === "pending" ? badge("Pending", "info")
        : item.status === "rejected" ? badge("Rejected", "danger")
          : badge(item.active ? `Approved until ${formatDate(item.expiresAt)}` : "Expired", item.active ? "success" : "neutral");
      return h("article", { class: "panel" },
        h("div", { class: "timeline-head" }, h("h2", {}, h("a", { href: policyHref(item.policy.slug) }, item.policy.title)), statusBadge),
        h("p", { class: "muted small" }, `${item.requestedBy} (${item.department || "—"}) · ${formatDateTime(item.createdAt)}`),
        h("p", {}, item.justification),
        item.status === "pending" ? h("div", { class: "stack" },
          h("div", { class: "form-grid" }, field("Decision note", note, "Explain the decision and any compensating controls."), field("Expires on (if approved)", expires)),
          h("div", { class: "inline-actions" },
            h("button", { type: "button", class: "primary", on: { click: decide("approved") } }, "Approve"),
            h("button", { type: "button", class: "danger", on: { click: decide("rejected") } }, "Reject")))
          : h("p", { class: "muted" }, `${item.decidedBy || "—"}: ${item.decisionNote}`));
    }) : emptyState("No exception requests", "")));
}
