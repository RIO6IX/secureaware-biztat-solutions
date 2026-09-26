import { api, download } from "../core/api.js";
import { h, formatDate } from "../core/dom.js";
import { currentQuery } from "../core/router.js";
import { withStates, pageHeader, table, toast, progressBar } from "../core/ui.js";
import { STATUS, statusBadge } from "./common.js";

function metric(label, value) {
  return h("div", { class: "metric-card" }, h("strong", {}, String(value)), h("span", {}, label));
}

function summaryTable(rows, label) {
  return table([
    { label, key: "name" },
    { label: "Assigned", render: (row) => String(row.assigned) },
    { label: "Completed", render: (row) => h("div", { class: "stack" }, `${row.completed} (${row.completionRate}%)`, progressBar(row.completed, row.assigned, `${row.completionRate}% complete`)) },
    { label: "Overdue", render: (row) => String(row.overdue) },
    { label: "Failed", render: (row) => String(row.failed) },
    { label: "Avg attempts to pass", render: (row) => (row.averageAttempts === null ? "—" : String(row.averageAttempts)) }
  ], rows, { caption: `Completion by ${label.toLowerCase()}` });
}

export function reportsPage(container) {
  const params = currentQuery();
  const query = new URLSearchParams();
  for (const key of ["courseId", "department", "status"]) if (params.get(key)) query.set(key, params.get(key));
  return withStates(container, () => api(`/api/training/admin/reports?${query}`), (data) => {
    const form = h("form", { class: "filters", role: "search" },
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Course"), h("select", { name: "courseId", id: "report-course" }, h("option", { value: "" }, "All courses"),
        data.options.courses.map((course) => h("option", { value: String(course.id), selected: String(course.id) === params.get("courseId") }, course.title)))),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Department"), h("select", { name: "department", id: "report-department" }, h("option", { value: "" }, "All departments"),
        data.options.departments.map((name) => h("option", { value: name, selected: name === params.get("department") }, name)))),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Status"), h("select", { name: "status", id: "report-status" }, h("option", { value: "" }, "Any status"),
        data.options.statuses.map((value) => h("option", { value, selected: value === params.get("status") }, STATUS[value][0])))),
      h("button", { type: "submit" }, "Apply filters"));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const next = new URLSearchParams();
      for (const [key, value] of new FormData(form)) if (value) next.set(key, value);
      location.hash = `#/training/admin/reports${next.toString() ? `?${next}` : ""}`;
    });

    return h("div", { class: "stack" },
      pageHeader("Training evidence", "Completion, pass rates and overdue training, ready for ISO/IEC 27001 A.6.3 and NIST CSF PR.AT evidence.", [
        h("button", { type: "button", class: "primary", on: { click: () => download(`/api/training/admin/reports.csv?${query}`, "training-evidence.csv").then(() => toast("Evidence exported. The export has been recorded in the audit log.")).catch((error) => toast(error.message, "error")) } }, "Export CSV")
      ]),
      form,
      h("div", { class: "metric-grid" },
        metric("Learners", data.summary.learners),
        metric("Assignments", data.summary.assignments),
        metric("Completion", `${data.summary.completionRate}%`),
        metric("Quiz pass rate", `${data.summary.passRate}%`),
        metric("Avg attempts to pass", data.summary.averageAttempts ?? "—"),
        metric("Overdue", data.summary.overdue)),
      h("section", { class: "panel" }, h("h2", {}, "By course"), summaryTable(data.byCourse, "Course")),
      h("section", { class: "panel" }, h("h2", {}, "By department"), summaryTable(data.byDepartment, "Department")),
      h("section", { class: "panel" }, h("h2", {}, `Overdue (${data.overdue.length})`),
        table([
          { label: "Person", key: "employee" }, { label: "Department", key: "department" }, { label: "Course", key: "course" },
          { label: "Due", render: (row) => formatDate(row.due_date) }, { label: "Status", render: (row) => statusBadge(row.status) }
        ], data.overdue, { caption: "Overdue training", empty: "Nothing is overdue" })),
      h("section", { class: "panel" }, h("h2", {}, `Evidence by user (${data.rows.length})`),
        table([
          { label: "Person", key: "employee" }, { label: "Department", key: "department" }, { label: "Course", key: "course" },
          { label: "Status", render: (row) => statusBadge(row.status) },
          { label: "Best score", render: (row) => (row.best_score === "" ? "—" : `${row.best_score}%`) },
          { label: "Attempts", render: (row) => String(row.attempts_used) },
          { label: "Completed", render: (row) => (row.passed_at ? formatDate(row.passed_at) : "—") }
        ], data.rows, { caption: "Evidence by user", empty: "No records match the filters" })));
  });
}
