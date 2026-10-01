import { api, download } from "../core/api.js";
import { h, mount, formatDate, formatDateTime } from "../core/dom.js";
import { currentQuery } from "../core/router.js";
import { withStates, pageHeader, toast, table, progressBar } from "../core/ui.js";
import { statusBadge, historyHref } from "./common.js";

const COLUMNS = [["complete", "Complete"], ["pending", "Pending"], ["overdue", "Overdue"], ["needs_reack", "Re-acknowledge"], ["exempt", "Exception"]];

function countsColumns() {
  return COLUMNS.map(([key, label]) => ({ label, render: (row) => String(row.counts[key]) }));
}

function rateCell(row) {
  return row.rate === null ? "—" : h("div", { class: "rate-cell" }, progressBar(row.rate, 100, `${row.rate}% compliant`), h("span", {}, `${row.rate}%`));
}

export function compliancePage(container) {
  const query = currentQuery();
  const department = query.get("department") || "";
  const params = department ? `?department=${encodeURIComponent(department)}` : "";
  return withStates(container, () => Promise.all([api(`/api/policy/admin/compliance${params}`), api(`/api/policy/admin/evidence${params}`)]), ([data, evidence]) => {
    const select = h("select", { id: "cmp-dept", on: { change: (event) => {
      location.hash = event.target.value ? `#/policies/admin/compliance?department=${encodeURIComponent(event.target.value)}` : "#/policies/admin/compliance";
    } } }, h("option", { value: "" }, "All departments"), data.departments.map((item) => h("option", { value: item, selected: item === department }, item)));
    const statusFilter = h("select", { id: "cmp-status" }, h("option", { value: "" }, "Any status"), COLUMNS.map(([key, label]) => h("option", { value: key }, label)));
    const rowsHolder = h("div");
    const drawRows = () => mount(rowsHolder, table([
      { label: "Employee", render: (row) => row.user.displayName },
      { label: "Department", render: (row) => row.user.department },
      { label: "Policy", render: (row) => `${row.policy.title} v${row.versionLabel}` },
      { label: "Status", render: (row) => statusBadge(row.status) },
      { label: "Due", render: (row) => formatDate(row.dueDate) },
      { label: "Acknowledged", render: (row) => formatDateTime(row.acknowledgedAt) }
    ], data.rows.filter((row) => !statusFilter.value || row.status === statusFilter.value), { caption: "Status per employee and policy", empty: "No matching rows." }));
    statusFilter.addEventListener("change", drawRows);
    drawRows();
    const totals = data.totals;
    return h("div", { class: "stack" },
      pageHeader("Policy compliance and evidence", `${data.department}. Status is calculated from assignments, acknowledgements of the current version, deadlines and approved exceptions.`,
        h("button", { type: "button", on: { click: () => download(`/api/policy/admin/evidence.csv${params}`, "policy-acknowledgement-evidence.csv").catch((error) => toast(error.message, "error")) } }, "Export evidence (CSV)")),
      h("div", { class: "filters" }, h("label", { class: "field" }, h("span", { class: "field-label" }, "Department"), select)),
      h("div", { class: "metric-grid" },
        h("div", { class: "metric-card" }, h("strong", {}, totals.rate === null ? "—" : `${totals.rate}%`), h("span", {}, "Compliance rate")),
        h("div", { class: "metric-card" }, h("strong", {}, String(totals.complete)), h("span", {}, "Acknowledged")),
        h("div", { class: "metric-card" }, h("strong", {}, String(totals.pending + totals.needs_reack)), h("span", {}, "Waiting (incl. re-acknowledge)")),
        h("div", { class: "metric-card" }, h("strong", {}, String(totals.overdue)), h("span", {}, "Overdue"))),
      h("section", { class: "panel" }, h("h2", {}, "By policy"),
        table([{ label: "Policy", render: (row) => h("a", { href: historyHref(row.slug) }, `${row.title} v${row.versionLabel}`) }, ...countsColumns(), { label: "Rate", render: rateCell }], data.policies, { caption: "Compliance by policy" })),
      h("section", { class: "panel" }, h("h2", {}, "By department"),
        table([{ label: "Department", key: "department" }, ...countsColumns(), { label: "Rate", render: rateCell }], data.byDepartment, { caption: "Compliance by department" })),
      h("section", { class: "panel" }, h("h2", {}, "Status per employee"),
        h("div", { class: "filters" }, h("label", { class: "field" }, h("span", { class: "field-label" }, "Status"), statusFilter)), rowsHolder),
      h("section", { class: "panel" }, h("h2", {}, "Acknowledgement evidence"),
        table([
          { label: "Employee", key: "employee" },
          { label: "Policy", render: (row) => `${row.policy.title} v${row.versionLabel}` },
          { label: "Time", render: (row) => formatDateTime(row.acknowledgedAt) },
          { label: "Receipt", render: (row) => h("a", { href: `#/policies/receipts/${row.receiptCode}` }, row.receiptCode) },
          { label: "Content hash", render: (row) => h("code", { class: "hash", title: row.contentSha256 }, `${row.contentSha256.slice(0, 12)}…`) }
        ], evidence.evidence, { caption: "Acknowledgement evidence", empty: "No acknowledgements recorded yet." })));
  });
}

export function calendarPage(container) {
  return withStates(container, () => api("/api/policy/admin/calendar"), (data) => {
    const tone = { overdue: ["Review overdue", "danger"], due_soon: ["Due within 30 days", "warning"], scheduled: ["Scheduled", "success"], unscheduled: ["No date set", "neutral"] };
    const group = (state) => data.policies.filter((row) => row.state === state);
    const list = (rows) => table([
      { label: "Policy", render: (row) => h("a", { href: historyHref(row.slug) }, `${row.title} v${row.versionLabel}`) },
      { label: "Next review", render: (row) => formatDate(row.nextReviewDate) },
      { label: "Owner", key: "owner" },
      { label: "State", render: (row) => h("span", { class: `badge badge-${tone[row.state][1]}` }, tone[row.state][0]) }
    ], rows, { caption: "Policy reviews", empty: "None." });
    return h("div", { class: "stack" },
      pageHeader("Policy review calendar", "ISO/IEC 27001:2022 Annex A 5.1 expects policies to be reviewed at planned intervals and after significant changes. Start a review by creating a new version from the history page."),
      h("section", { class: "panel" }, h("h2", {}, "Overdue or due in the next 30 days"), list([...group("overdue"), ...group("due_soon")])),
      h("section", { class: "panel" }, h("h2", {}, "Later"), list([...group("scheduled"), ...group("unscheduled")])));
  });
}
