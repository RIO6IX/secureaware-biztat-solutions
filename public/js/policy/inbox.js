import { api } from "../core/api.js";
import { h, mount, debounce } from "../core/dom.js";
import { currentQuery } from "../core/router.js";
import { loading, errorState, emptyState, pageHeader } from "../core/ui.js";
import { statusBadge, dueLabel, policyHref } from "./common.js";
import { policyIcon } from "./icons.js";

const TABS = [
  ["action", "Action required", (item) => ["pending", "needs_reack"].includes(item.status)],
  ["overdue", "Overdue", (item) => item.status === "overdue"],
  ["acknowledged", "Acknowledged", (item) => item.status === "complete" || item.status === "exempt"],
  ["all", "All company policies", () => true]
];

export function privacyNotice() {
  return h("details", { class: "privacy-notice" },
    h("summary", {}, "What we record when you acknowledge a policy"),
    h("ul", {},
      h("li", {}, "What: your name, the policy and version, the exact statement you agreed to, the time, a SHA-256 fingerprint of the text you were shown, when you opened and finished reading it, and your browser family (for example \"Chrome\"). We do not store your IP address or full browser details."),
      h("li", {}, "Why: Biztat must be able to show clients and auditors that staff have read and accepted its security policies (ISO/IEC 27001 Annex A 5.1)."),
      h("li", {}, "Who can see it: you, the Security/HR and System administrators, and your own department manager (status only, not your questions)."),
      h("li", {}, "How long: acknowledgement evidence is kept for 6 years after a policy version is replaced, then deleted automatically."),
      h("li", {}, h("a", { href: "#/policies/receipts" }, "See or download everything recorded about you"))));
}

function policyCard(item) {
  const reack = item.status === "needs_reack" || item.needsReacknowledgement;
  return h("article", { class: ["policy-card", `policy-card-${item.status}`] },
    h("div", { class: "policy-card-icon", "aria-hidden": "true" }, policyIcon(item.category)),
    h("div", { class: "policy-card-body" },
      h("div", { class: "chip-row" },
        h("span", { class: "chip" }, item.category),
        h("span", { class: "chip" }, `v${item.versionLabel}`),
        reack ? h("span", { class: "chip chip-strong" }, "Updated") : null),
      h("h2", { class: "course-card-title" }, h("a", { href: policyHref(item.slug), class: "stretched-link" }, item.title)),
      h("p", { class: "course-card-summary" }, item.summary),
      h("p", { class: "meta" }, `${item.readingMinutes} min read`),
      h("div", { class: "course-card-footer" },
        h("div", { class: "course-card-status" }, statusBadge(item.status), dueLabel(item)))));
}

export async function inboxPage(container) {
  const query = currentQuery();
  const filters = {
    tab: TABS.some(([key]) => key === query.get("tab")) ? query.get("tab") : "action",
    q: query.get("q") || "",
    category: query.get("category") || ""
  };
  const results = h("div", { class: "results", "aria-live": "polite" });
  const tabList = h("div", { class: "tabs", role: "tablist", "aria-label": "Policy lists" });
  const categorySelect = h("select", { id: "policy-category", name: "category" }, h("option", { value: "" }, "All categories"));
  const search = h("input", { id: "policy-search", type: "search", placeholder: "Search policies", value: filters.q, autocomplete: "off" });
  let data = null;

  function syncHash() {
    const params = new URLSearchParams({ tab: filters.tab });
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    history.replaceState(null, "", `#/policies?${params}`);
  }

  function draw() {
    syncHash();
    const counts = Object.fromEntries(TABS.map(([key, , test]) => [key, data.policies.filter(test).length]));
    mount(tabList, TABS.map(([key, label]) => h("button", {
      type: "button", role: "tab", class: "tab", "aria-selected": String(filters.tab === key), tabindex: filters.tab === key ? "0" : "-1",
      on: { click: () => { filters.tab = key; draw(); }, keydown: onTabKey }
    }, label, h("span", { class: "tab-count" }, String(counts[key])))));
    const [, , test] = TABS.find(([key]) => key === filters.tab);
    const needle = filters.q.toLowerCase();
    const rows = data.policies.filter(test)
      .filter((item) => !filters.category || item.category === filters.category)
      .filter((item) => !needle || `${item.title} ${item.summary}`.toLowerCase().includes(needle))
      .sort((a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")));
    mount(results, rows.length
      ? h("div", { class: "course-grid" }, rows.map(policyCard))
      : emptyState(filters.tab === "action" ? "Nothing needs your attention" : "No policies match",
        filters.tab === "action" ? "You are up to date. New or updated policies will appear here." : "Try clearing the search or category filter."));
  }

  function onTabKey(event) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const index = TABS.findIndex(([key]) => key === filters.tab);
    filters.tab = TABS[(index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
    draw();
    tabList.querySelector('[aria-selected="true"]')?.focus();
  }

  async function load() {
    mount(results, loading("Loading your policies…"));
    try {
      data = await api("/api/policy/policies");
      data.categories.forEach((category) => categorySelect.append(h("option", { value: category, selected: filters.category === category }, category)));
      draw();
    } catch (error) {
      mount(results, errorState(error, load));
    }
  }

  search.addEventListener("input", debounce(() => { filters.q = search.value.trim(); if (data) draw(); }, 200));
  categorySelect.addEventListener("change", () => { filters.category = categorySelect.value; if (data) draw(); });

  mount(container,
    pageHeader("My policies", "Read and acknowledge the security policies that apply to you.",
      h("a", { class: "button", href: "#/policies/receipts" }, "My acknowledgements")),
    privacyNotice(),
    tabList,
    h("div", { class: "filters", role: "search" },
      h("label", { class: "field grow" }, h("span", { class: "field-label" }, "Search"), search),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Category"), categorySelect)),
    results);
  await load();
}
