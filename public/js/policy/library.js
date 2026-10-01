import { api } from "../core/api.js";
import { h, mount, formatDate } from "../core/dom.js";
import { loading, errorState, pageHeader, table, badge, emptyState } from "../core/ui.js";
import { versionBadge, historyHref, policyHref, editorHref } from "./common.js";

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function libraryPage(container) {
  const filters = { status: "", category: "", owner: "", reviewDue: false };
  const results = h("div", { "aria-live": "polite" });
  const statusSelect = h("select", { id: "lib-status" }, h("option", { value: "" }, "Any status"),
    ["published", "draft", "in_review", "approved", "archived"].map((value) => h("option", { value }, value.replace("_", " "))));
  const categorySelect = h("select", { id: "lib-category" }, h("option", { value: "" }, "All categories"));
  const ownerSelect = h("select", { id: "lib-owner" }, h("option", { value: "" }, "Any owner"));
  const reviewDue = h("input", { type: "checkbox", id: "lib-review" });
  let data = null;

  function draw() {
    const horizon = addDays(30);
    const rows = data.policies
      .filter((row) => !filters.status || row.status === filters.status || row.working?.status === filters.status)
      .filter((row) => !filters.category || row.category === filters.category)
      .filter((row) => !filters.owner || String(row.ownerId) === filters.owner)
      .filter((row) => !filters.reviewDue || (row.nextReviewDate && row.nextReviewDate <= horizon && !row.archived));
    mount(results, rows.length ? table([
      { label: "Policy", render: (row) => h("div", {}, h("a", { href: historyHref(row.slug) }, h("strong", {}, row.title)), h("div", { class: "muted small" }, row.category)) },
      { label: "Current", render: (row) => row.current ? h("a", { href: policyHref(row.slug) }, `v${row.current.label}`) : "—" },
      { label: "Status", render: (row) => h("div", { class: "chip-row" }, row.archived ? badge("Archived", "neutral") : row.current ? versionBadge("published") : null,
        row.working ? h("a", { href: editorHref(row.working.id) }, versionBadge(row.working.status), ` v${row.working.label}`) : null) },
      { label: "Acknowledged", render: (row) => row.ackRate === null ? "—" : h("span", {}, `${row.ackRate}% `, h("span", { class: "muted small" }, `(${row.acknowledged}/${row.recipients})`)) },
      { label: "Next review", render: (row) => row.nextReviewDate ? h("span", { class: row.nextReviewDate < new Date().toISOString().slice(0, 10) ? "due due-overdue" : "" }, formatDate(row.nextReviewDate)) : "—" },
      { label: "Owner", key: "owner" }
    ], rows, { caption: "Policy library" }) : emptyState("No policies match", "Clear the filters to see every policy."));
  }

  async function load() {
    mount(results, loading("Loading the policy library…"));
    try {
      data = await api("/api/policy/admin/policies");
      data.categories.forEach((category) => categorySelect.append(h("option", { value: category }, category)));
      data.owners.forEach((owner) => ownerSelect.append(h("option", { value: String(owner.id) }, owner.displayName)));
      draw();
    } catch (error) {
      mount(results, errorState(error, load));
    }
  }

  statusSelect.addEventListener("change", () => { filters.status = statusSelect.value; draw(); });
  categorySelect.addEventListener("change", () => { filters.category = categorySelect.value; draw(); });
  ownerSelect.addEventListener("change", () => { filters.owner = ownerSelect.value; draw(); });
  reviewDue.addEventListener("change", () => { filters.reviewDue = reviewDue.checked; draw(); });

  mount(container,
    pageHeader("Policy library", "Every Biztat security policy, its current version, acknowledgement rate and review date.",
      [h("a", { class: "button primary", href: "#/policies/admin/new" }, "New policy"), h("a", { class: "button", href: "#/policies/admin/calendar" }, "Review calendar")]),
    h("div", { class: "filters" },
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Status"), statusSelect),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Category"), categorySelect),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Owner"), ownerSelect),
      h("label", { class: "checkbox" }, reviewDue, h("span", {}, "Review due in 30 days"))),
    results);
  await load();
}
