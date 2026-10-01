import { api } from "../core/api.js";
import { h, mount, formatDateTime, debounce } from "../core/dom.js";
import { navigate } from "../core/router.js";
import { withStates, pageHeader, toast, field, confirmDialog } from "../core/ui.js";
import { currentUser } from "../core/shell.js";
import { renderPolicy, versionBadge, decisionBadge, historyHref, versionHref, editorHref } from "./common.js";

const CATEGORIES = ["Governance", "Acceptable Use", "Access Control", "Data Protection", "Remote Work", "Incident Management", "Physical Security", "Devices"];
const TEMPLATE = ["Purpose", "Scope", "Roles and responsibilities", "Policy statements", "Compliance and enforcement", "Exceptions", "Related documents", "Definitions", "Review cycle", "Version history"]
  .map((heading, index) => `## ${index + 1}. ${heading}\n\n`).join("");

function nextYear() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

// Markdown editor with a live, safe preview.
function markdownEditor(value, id) {
  const textarea = h("textarea", { id, name: "bodyMarkdown", rows: "22", class: "md-editor", required: true, spellcheck: "true" });
  textarea.value = value;
  const preview = h("div", { class: "md-preview policy-document lesson-body", "aria-live": "off" });
  const update = () => mount(preview, renderPolicy(textarea.value).fragment);
  textarea.addEventListener("input", debounce(update, 150));
  update();
  return { textarea, view: h("div", { class: "builder-layout" },
    field("Policy text (markdown)", textarea, "Use ## for section headings, numbered lists for policy statements and **must** / **must not** for obligations."),
    h("div", {}, h("p", { class: "field-label" }, "Preview"), preview)) };
}

export function newPolicyPage(container) {
  const user = currentUser();
  const editor = markdownEditor(TEMPLATE, "new-body");
  const form = h("form", { class: "stack" },
    h("div", { class: "form-grid" },
      field("Title", h("input", { name: "title", id: "new-title", required: true, maxlength: "120" })),
      field("Category", h("select", { name: "category", id: "new-category" }, CATEGORIES.map((category) => h("option", { value: category }, category)))),
      field("Visibility", h("select", { name: "visibility", id: "new-visibility" },
        h("option", { value: "assigned" }, "Only people it is assigned to"), h("option", { value: "all" }, "Visible to all staff"))),
      field("Effective date (optional)", h("input", { type: "date", name: "effectiveDate", id: "new-effective" })),
      field("Next review date", h("input", { type: "date", name: "nextReviewDate", id: "new-review", value: nextYear(), required: true })),
      h("label", { class: "field wide" }, h("span", { class: "field-label" }, "Summary"), h("input", { name: "summary", id: "new-summary", required: true, maxlength: "400" }))),
    editor.view,
    h("div", { class: "inline-actions" }, h("button", { class: "primary", type: "submit" }, "Save draft")));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try {
      const result = await api("/api/policy/admin/policies", { method: "POST", body: { ...values, ownerId: user.id } });
      toast("Draft saved.");
      navigate(`/policies/admin/versions/${result.version.id}`);
    } catch (error) {
      toast(error.message, "error");
    }
  });
  mount(container, pageHeader("New policy", "Start a draft. It must be reviewed by at least two groups before it can be published.", null,
    [["Policy library", "#/policies/admin"], ["New policy", null]]), h("section", { class: "panel" }, form));
}

export function editorPage(container, params) {
  return withStates(container, () => api(`/api/policy/admin/versions/${encodeURIComponent(params.id)}`), (data) => {
    const { policy, version } = data;
    const reload = () => editorPage(container, params);
    const header = pageHeader(`${policy.title} v${version.label}`, version.summary,
      [h("a", { class: "button", href: versionHref(policy.slug, version.label) }, "Open in reader"), h("a", { class: "button", href: historyHref(policy.slug) }, "Version history")],
      [["Policy library", "#/policies/admin"], [policy.title, historyHref(policy.slug)], [`v${version.label}`, null]]);
    const statusLine = h("div", { class: "reader-meta" }, versionBadge(version.status), h("span", {}, `Created by ${version.createdBy} ${formatDateTime(version.createdAt)}`),
      version.publishedAt ? h("span", {}, `Published ${formatDateTime(version.publishedAt)} by ${version.publishedBy}`) : null);
    const reviewsPanel = h("section", { class: "panel" }, h("h2", {}, "Review and approval"),
      version.reviews.length ? h("ul", { class: "review-trail" }, version.reviews.map((review) => h("li", {},
        h("strong", {}, `${review.reviewer.displayName} (${review.group})`), " ", decisionBadge(review.decision),
        review.comment ? h("p", { class: "muted" }, `“${review.comment}”`) : null,
        review.decidedAt ? h("span", { class: "small muted" }, formatDateTime(review.decidedAt)) : null))) : h("p", { class: "muted" }, "Not submitted for review yet."),
      version.status === "approved" ? h("button", { class: "primary", type: "button", on: { click: async () => {
        const ok = await confirmDialog({ title: `Publish v${version.label}?`, body: h("p", {}, version.requiresReacknowledgement
          ? "The current version will be superseded and everyone it is assigned to will be asked to acknowledge again."
          : "The current version will be superseded. Existing acknowledgements stay valid because this is marked as a minor change."), confirmLabel: "Publish" });
        if (!ok) return;
        try {
          const result = await api(`/api/policy/admin/versions/${version.id}/publish`, { method: "POST", body: {} });
          toast(`Published. ${result.notified} people notified.`);
          navigate(historyHref(policy.slug).slice(1));
        } catch (error) {
          toast(error.message, "error");
        }
      } } }, "Publish this version") : null);

    if (!data.editable) {
      return h("div", { class: "stack" }, header, statusLine,
        h("aside", { class: "callout callout-note", role: "note" },
          h("p", { class: "callout-title" }, h("span", { class: "callout-icon", "aria-hidden": "true" }, "i"),
            version.status === "in_review" || version.status === "approved" ? "This version is with reviewers" : "This version can no longer be edited"),
          h("p", {}, version.status === "in_review" || version.status === "approved"
            ? "Text is locked while it is reviewed. A reviewer can request changes, which returns it to draft."
            : "Published and retired versions are kept exactly as people acknowledged them. To change the policy, create a new version from the history page.")),
        reviewsPanel,
        h("section", { class: "panel" }, h("h2", {}, "Change summary"), h("p", {}, version.changeSummary)),
        h("section", { class: "panel policy-document lesson-body" }, renderPolicy(version.bodyMarkdown).fragment));
    }

    const editor = markdownEditor(version.bodyMarkdown, "edit-body");
    const reack = h("input", { type: "checkbox", name: "requiresReacknowledgement", id: "edit-reack", checked: version.requiresReacknowledgement });
    const form = h("form", { class: "stack" },
      h("div", { class: "form-grid" },
        h("label", { class: "field wide" }, h("span", { class: "field-label" }, "Summary"), h("input", { name: "summary", id: "edit-summary", value: version.summary, required: true, maxlength: "400" })),
        h("label", { class: "field wide" }, h("span", { class: "field-label" }, "Change summary (shown to employees)"), h("textarea", { name: "changeSummary", id: "edit-change", rows: "2", maxlength: "1000" }, version.changeSummary)),
        field("Effective date (optional)", h("input", { type: "date", name: "effectiveDate", id: "edit-effective", value: version.effectiveDate || "" })),
        field("Next review date", h("input", { type: "date", name: "nextReviewDate", id: "edit-review", value: version.nextReviewDate || nextYear() })),
        h("label", { class: "checkbox" }, reack, h("span", {}, "Everyone must acknowledge this version again"))),
      editor.view,
      h("div", { class: "inline-actions" }, h("button", { class: "primary", type: "submit" }, "Save draft")));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      try {
        await api(`/api/policy/admin/versions/${version.id}`, { method: "PUT", body: { ...values, requiresReacknowledgement: reack.checked } });
        toast("Draft saved.");
        reload();
      } catch (error) {
        toast(error.message, "error");
      }
    });

    // Reviewer picker: at least two people from at least two groups (for example IT and HR/Management).
    const rows = [0, 1, 2].map((index) => {
      const person = h("select", { id: `reviewer-${index}`, "aria-label": `Reviewer ${index + 1}` }, h("option", { value: "" }, index < 2 ? "Choose a reviewer" : "Optional third reviewer"),
        data.candidates.map((candidate) => h("option", { value: String(candidate.id) }, `${candidate.displayName} – ${candidate.role}, ${candidate.department}`)));
      const group = h("select", { id: `reviewer-group-${index}`, "aria-label": `Reviewer ${index + 1} group` }, data.reviewerGroups.map((name) => h("option", { value: name, selected: name === ["IT", "Management", "HR"][index] }, name)));
      return { person, group, view: h("div", { class: "reviewer-row" }, person, group) };
    });
    const submitButton = h("button", { type: "button", class: "primary", on: { click: async () => {
      const reviewers = rows.filter((row) => row.person.value).map((row) => ({ userId: Number(row.person.value), group: row.group.value }));
      try {
        await api(`/api/policy/admin/versions/${version.id}/submit`, { method: "POST", body: { reviewers } });
        toast("Sent for review. Reviewers have been notified.");
        reload();
      } catch (error) {
        toast(error.message, "error");
      }
    } } }, "Submit for review");

    return h("div", { class: "stack" }, header, statusLine,
      version.reviews.some((review) => review.decision === "changes_requested") ? reviewsPanel : null,
      h("section", { class: "panel" }, h("h2", {}, "Edit draft"), form),
      h("section", { class: "panel" }, h("h2", {}, "Submit for review"),
        h("p", { class: "muted" }, "Choose reviewers from at least two groups so that IT and non-IT staff both agree the policy is right. You cannot review your own version."),
        rows.map((row) => row.view), submitButton));
  });
}

export { editorHref };
