import { api } from "../core/api.js";
import { h, formatDate } from "../core/dom.js";
import { currentQuery } from "../core/router.js";
import { withStates, pageHeader, toast, emptyState } from "../core/ui.js";
import { currentUser } from "../core/shell.js";
import { statusBadge } from "./common.js";

export function teamPage(container) {
  const department = currentQuery().get("department") || "";
  return withStates(container, () => api(`/api/policy/team${department ? `?department=${encodeURIComponent(department)}` : ""}`), (data) => {
    const remind = (member, item) => async (event) => {
      event.target.disabled = true;
      try {
        await api("/api/policy/team/reminders", { method: "POST", body: { targetUserId: member.user.id, policySlug: item.slug } });
        toast(`Reminder sent to ${member.user.displayName}.`);
      } catch (error) {
        toast(error.message, "error");
        event.target.disabled = false;
      }
    };
    const picker = data.canChooseDepartment ? h("label", { class: "field" }, h("span", { class: "field-label" }, "Department"),
      h("select", { id: "team-dept", on: { change: (event) => { location.hash = event.target.value ? `#/policies/team?department=${encodeURIComponent(event.target.value)}` : "#/policies/team"; } } },
        h("option", { value: "" }, "All departments"), data.departments.map((item) => h("option", { value: item, selected: item === department }, item)))) : null;
    const { totals } = data;
    return h("div", { class: "stack" },
      pageHeader("Team policy compliance", data.canChooseDepartment ? `${data.department}. Policy status per person.` : `${data.department}. You see policy status for your own department only.`),
      picker ? h("div", { class: "filters" }, picker) : null,
      h("div", { class: "metric-grid" },
        h("div", { class: "metric-card" }, h("strong", {}, totals.rate === null ? "—" : `${totals.rate}%`), h("span", {}, "Compliance")),
        h("div", { class: "metric-card" }, h("strong", {}, String(totals.overdue)), h("span", {}, "Overdue")),
        h("div", { class: "metric-card" }, h("strong", {}, String(totals.needs_reack)), h("span", {}, "Need to re-acknowledge")),
        h("div", { class: "metric-card" }, h("strong", {}, String(totals.pending)), h("span", {}, "Pending"))),
      data.members.length ? data.members.map((member) => h("section", { class: "panel" },
        h("div", { class: "timeline-head" }, h("h2", {}, member.user.displayName), h("span", { class: "muted" }, `${member.user.role} · ${member.user.department}`)),
        h("div", { class: "table-wrap" }, h("table", {},
          h("caption", { class: "sr-only" }, `Policies for ${member.user.displayName}`),
          h("thead", {}, h("tr", {}, ["Policy", "Status", "Due", ""].map((label) => h("th", { scope: "col" }, label)))),
          h("tbody", {}, member.policies.map((item) => h("tr", {},
            h("td", { "data-label": "Policy" }, `${item.title} v${item.versionLabel}`),
            h("td", { "data-label": "Status" }, statusBadge(item.status)),
            h("td", { "data-label": "Due" }, formatDate(item.dueDate)),
            h("td", { "data-label": "" }, ["complete", "exempt"].includes(item.status) || member.user.id === currentUser().id ? null
              : h("button", { type: "button", class: "subtle", "aria-label": `Send ${member.user.displayName} a reminder about ${item.title}`, on: { click: remind(member, item) } }, "Send reminder"))))))))) : emptyState("No team members", ""));
  });
}
