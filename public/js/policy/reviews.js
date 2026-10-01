import { api } from "../core/api.js";
import { h, formatDateTime } from "../core/dom.js";
import { withStates, pageHeader, toast, field, emptyState } from "../core/ui.js";
import { decisionBadge, versionBadge, versionHref } from "./common.js";

function decisionForm(item, reload) {
  const comment = h("textarea", { id: `review-comment-${item.reviewId}`, rows: "2", maxlength: "2000" });
  const decide = (decision) => async () => {
    try {
      const result = await api(`/api/policy/reviews/${item.version.id}/decision`, { method: "POST", body: { decision, comment: comment.value } });
      toast(result.versionStatus === "approved" ? "Approved. Every reviewer has now approved, so the author can publish."
        : decision === "approved" ? "Approval recorded." : "Changes requested. The author has been notified.");
      reload();
    } catch (error) {
      toast(error.message, "error");
    }
  };
  return h("div", { class: "stack" },
    field("Comment", comment, "Required when you request changes. The author sees it."),
    h("div", { class: "inline-actions" },
      h("button", { type: "button", class: "primary", on: { click: decide("approved") } }, "Approve"),
      h("button", { type: "button", on: { click: decide("changes_requested") } }, "Request changes")));
}

export function reviewsPage(container) {
  const reload = () => reviewsPage(container);
  return withStates(container, () => api("/api/policy/reviews"), (data) => {
    const open = data.reviews.filter((item) => item.actionable);
    const done = data.reviews.filter((item) => !item.actionable);
    const card = (item) => h("article", { class: "panel review-card" },
      h("div", { class: "timeline-head" },
        h("h2", {}, h("a", { href: versionHref(item.policy.slug, item.version.label) }, `${item.policy.title} v${item.version.label}`)),
        versionBadge(item.version.status), h("span", { class: "chip" }, `You review as ${item.group}`)),
      h("p", { class: "muted small" }, `Author: ${item.version.author || "—"} · submitted ${formatDateTime(item.version.submittedAt)}`),
      h("p", {}, h("strong", {}, "Change summary: "), item.version.changeSummary),
      item.otherReviews.length ? h("p", { class: "small" }, "Other reviewers: ", item.otherReviews.map((review) => h("span", { class: "reviewer-chip" }, `${review.displayName} (${review.group}) `, decisionBadge(review.decision)))) : null,
      item.actionable ? decisionForm(item, reload) : h("p", {}, "Your decision: ", decisionBadge(item.decision), item.comment ? ` “${item.comment}”` : ""));
    return h("div", { class: "stack" },
      pageHeader("Policy reviews", "Policies need approval from reviewers in at least two groups, such as IT and Management, before they are published."),
      h("h2", {}, "Waiting for you"),
      open.length ? open.map(card) : emptyState("No reviews waiting", "When an author asks you to review a policy, it will appear here."),
      done.length ? [h("h2", { class: "section-gap" }, "Earlier reviews"), done.map(card)] : null);
  });
}
