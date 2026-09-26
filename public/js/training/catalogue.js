import { api } from "../core/api.js";
import { h, mount, debounce } from "../core/dom.js";
import { currentQuery } from "../core/router.js";
import { loading, errorState, emptyState, pageHeader, progressRing } from "../core/ui.js";
import { cover } from "./covers.js";
import { STATUS, statusBadge, dueLabel, courseHref, minutes } from "./common.js";
import { privacyNotice } from "./privacy.js";

const TABS = [["assigned", "My assigned training"], ["all", "All courses"], ["completed", "Completed"]];

function courseCard(course) {
  const { state } = course;
  return h("article", { class: "course-card" },
    h("div", { class: "course-cover" }, cover(course.cover, course.title)),
    h("div", { class: "course-card-body" },
      h("div", { class: "chip-row" },
        h("span", { class: "chip" }, course.category),
        state.mandatory ? h("span", { class: "chip chip-strong" }, "Mandatory") : null),
      h("h2", { class: "course-card-title" }, h("a", { href: courseHref(course.slug), class: "stretched-link" }, course.title)),
      h("p", { class: "course-card-summary" }, course.summary),
      h("p", { class: "meta" }, `${course.level} · ${minutes(course.durationMinutes)}`),
      h("div", { class: "course-card-footer" },
        progressRing(state.lessonsCompleted, state.lessonsTotal),
        h("div", { class: "course-card-status" }, statusBadge(state.status), dueLabel(state)))));
}

export async function cataloguePage(container) {
  const query = currentQuery();
  const filters = {
    tab: TABS.some(([key]) => key === query.get("tab")) ? query.get("tab") : "assigned",
    q: query.get("q") || "",
    category: query.get("category") || "",
    status: STATUS[query.get("status")] ? query.get("status") : "",
    mandatory: query.get("mandatory") === "true"
  };
  const results = h("div", { class: "results", "aria-live": "polite" });
  const tabList = h("div", { class: "tabs", role: "tablist", "aria-label": "Training lists" });
  const categorySelect = h("select", { id: "filter-category", name: "category" }, h("option", { value: "" }, "All categories"));
  const statusSelect = h("select", { id: "filter-status", name: "status" }, h("option", { value: "" }, "Any status"),
    Object.entries(STATUS).map(([value, [label]]) => h("option", { value, selected: filters.status === value }, label)));
  const search = h("input", { id: "filter-search", type: "search", placeholder: "Search courses", value: filters.q, autocomplete: "off" });
  const mandatory = h("input", { id: "filter-mandatory", type: "checkbox", checked: filters.mandatory });

  // Filters are mirrored in the hash so a filtered view can be bookmarked; replaceState
  // keeps the Back button from stepping through every keystroke.
  function syncHash() {
    const params = new URLSearchParams();
    params.set("tab", filters.tab);
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.status) params.set("status", filters.status);
    if (filters.mandatory) params.set("mandatory", "true");
    history.replaceState(null, "", `#/training?${params}`);
  }

  async function load() {
    syncHash();
    mount(results, loading("Loading courses…"));
    const params = new URLSearchParams({ tab: filters.tab });
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.status) params.set("status", filters.status);
    if (filters.mandatory) params.set("mandatory", "true");
    try {
      const data = await api(`/api/training/courses?${params}`);
      mount(tabList, TABS.map(([key, label]) => h("button", {
        type: "button", role: "tab", class: "tab", "aria-selected": String(filters.tab === key), tabindex: filters.tab === key ? "0" : "-1",
        on: { click: () => { filters.tab = key; load(); }, keydown: onTabKey }
      }, label, h("span", { class: "tab-count" }, String(data.counts[key])))));
      if (categorySelect.options.length === 1) {
        data.categories.forEach((category) => categorySelect.append(h("option", { value: category, selected: filters.category === category }, category)));
      }
      mount(results, data.courses.length
        ? h("div", { class: "course-grid" }, data.courses.map(courseCard))
        : emptyState(filters.tab === "completed" ? "No completed courses yet" : "No courses match", filters.tab === "assigned" ? "You have no outstanding assigned training. Browse All courses to learn more." : "Try clearing the search or filters."));
    } catch (error) {
      mount(results, errorState(error, load));
    }
  }

  function onTabKey(event) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const index = TABS.findIndex(([key]) => key === filters.tab);
    const next = (index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    filters.tab = TABS[next][0];
    load().then(() => tabList.querySelector('[aria-selected="true"]')?.focus());
  }

  search.addEventListener("input", debounce(() => { filters.q = search.value.trim(); load(); }, 250));
  categorySelect.addEventListener("change", () => { filters.category = categorySelect.value; load(); });
  statusSelect.addEventListener("change", () => { filters.status = statusSelect.value; load(); });
  mandatory.addEventListener("change", () => { filters.mandatory = mandatory.checked; load(); });

  mount(container,
    pageHeader("Security training", "Short, practical courses that help you protect Biztat, our clients and yourself.",
      h("a", { class: "button", href: "#/my-learning" }, "My learning")),
    privacyNotice(),
    tabList,
    h("div", { class: "filters", role: "search" },
      h("label", { class: "field grow" }, h("span", { class: "field-label" }, "Search"), search),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Category"), categorySelect),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Status"), statusSelect),
      h("label", { class: "checkbox" }, mandatory, h("span", {}, "Mandatory only"))),
    results);
  await load();
}
