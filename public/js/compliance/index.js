// Compliance dashboard and reports (Member 4), on the shared shell. Charts are inline SVG built
// with the DOM builder, so they work under the strict CSP.
import { api, download } from "../core/api.js";
import { h, mount, formatDate, formatDateTime } from "../core/dom.js";
import { currentQuery, navigate } from "../core/router.js";
import { withStates, pageHeader, table, badge, toast, progressBar, emptyState } from "../core/ui.js";

const VIEW_ROLES = ["Department Manager", "Security/HR Admin", "System Admin"];
const REPORTS = [["executive", "Executive summary"], ["policy", "Policy acknowledgement"], ["training", "Training and quiz"], ["risk", "Employee risk review"]];

function lineChart(points) {
  const width = 560;
  const height = 200;
  const pad = 32;
  const x = (index) => pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1);
  const y = (value) => height - pad - (value / 100) * (height - pad * 2);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  return h("svg", { viewBox: `0 0 ${width} ${height}`, class: "chart", role: "img", "aria-label": `Compliance trend: ${points.map((point) => `${point.label} ${point.value}%`).join(", ")}` },
    [0, 50, 100].map((value) => [h("line", { x1: String(pad), x2: String(width - pad), y1: String(y(value)), y2: String(y(value)), class: "chart-grid" }),
      h("text", { x: "4", y: String(y(value) + 4), class: "chart-axis" }, `${value}%`)]),
    h("path", { d: path, class: "chart-line", fill: "none" }),
    points.map((point, index) => [h("circle", { cx: String(x(index)), cy: String(y(point.value)), r: "4", class: "chart-dot" }, h("title", {}, `${point.label}: ${point.value}%`)),
      h("text", { x: String(x(index)), y: String(height - 8), class: "chart-axis", "text-anchor": "middle" }, point.label)]));
}

function donut(risks) {
  const total = risks.low + risks.medium + risks.high || 1;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const slices = [["high", risks.high], ["medium", risks.medium], ["low", risks.low]].map(([key, value]) => {
    const length = (value / total) * circumference;
    const slice = h("circle", { cx: "70", cy: "70", r: String(radius), fill: "none", "stroke-width": "18", class: `donut-${key}`,
      "stroke-dasharray": `${length.toFixed(2)} ${(circumference - length).toFixed(2)}`, "stroke-dashoffset": String((-offset).toFixed(2)), transform: "rotate(-90 70 70)" });
    offset += length;
    return slice;
  });
  return h("div", { class: "donut-wrap" },
    h("svg", { viewBox: "0 0 140 140", width: "140", height: "140", role: "img", "aria-label": `Risk: ${risks.high} high, ${risks.medium} medium, ${risks.low} low` },
      h("circle", { cx: "70", cy: "70", r: String(radius), fill: "none", "stroke-width": "18", class: "donut-track" }), slices,
      h("text", { x: "70", y: "76", "text-anchor": "middle", class: "donut-total" }, String(risks.low + risks.medium + risks.high))),
    h("ul", { class: "legend" },
      h("li", {}, h("span", { class: "swatch donut-high-swatch", "aria-hidden": "true" }), `High risk: ${risks.high}`),
      h("li", {}, h("span", { class: "swatch donut-medium-swatch", "aria-hidden": "true" }), `Medium: ${risks.medium}`),
      h("li", {}, h("span", { class: "swatch donut-low-swatch", "aria-hidden": "true" }), `Low: ${risks.low}`)));
}

const metric = (value, label, detail) => h("div", { class: "metric-card" }, h("strong", {}, value), h("span", {}, label), detail ? h("span", { class: "small muted" }, detail) : null);

function dashboardPage(container) {
  const query = currentQuery();
  const department = query.get("department") || "All";
  const period = ["30", "60", "90"].includes(query.get("period")) ? query.get("period") : "30";
  return withStates(container, () => api(`/api/compliance/dashboard?department=${encodeURIComponent(department)}&period=${period}`), (data) => {
    const go = (next) => navigate(`/compliance?department=${encodeURIComponent(next.department)}&period=${next.period}`);
    const deptSelect = h("select", { id: "dash-dept", disabled: !data.filters.canChooseDepartment, on: { change: (event) => go({ department: event.target.value, period }) } },
      data.filters.departments.map((name) => h("option", { value: name, selected: name === data.filters.department }, name === "All" ? "All departments" : name)));
    const periodSelect = h("select", { id: "dash-period", on: { change: (event) => go({ department: data.filters.department, period: event.target.value }) } },
      ["30", "60", "90"].map((value) => h("option", { value, selected: value === period }, `Last ${value} days`)));
    const { summary } = data;
    const remind = (item) => async (event) => {
      event.target.disabled = true;
      try {
        await api("/api/compliance/reminders", { method: "POST", body: { userId: item.user.id, kind: item.kind, slug: item.slug } });
        toast(`Reminder sent to ${item.user.displayName}.`);
      } catch (error) {
        event.target.disabled = false;
        toast(error.message, "error");
      }
    };
    return h("div", { class: "stack" },
      pageHeader("Compliance dashboard", `${data.filters.department === "All" ? "All departments" : data.filters.department}. Calculated live from policy acknowledgements, training completion and quiz results.`,
        h("a", { class: "button", href: "#/compliance/reports" }, "Reports")),
      h("div", { class: "filters" },
        h("label", { class: "field" }, h("span", { class: "field-label" }, "Department"), deptSelect),
        h("label", { class: "field" }, h("span", { class: "field-label" }, "Period"), periodSelect)),
      h("div", { class: "metric-grid" },
        metric(`${summary.overallRate}%`, "Overall compliance", "Average of the three rates"),
        metric(`${summary.policyRate}%`, "Policy acknowledgement"),
        metric(`${summary.trainingRate}%`, "Training completion"),
        metric(`${summary.quizPassRate}%`, "Quiz pass rate", "Of submitted attempts"),
        metric(String(summary.overdueCount), "Overdue items"),
        metric(String(summary.highRiskCount), "High-risk employees", `of ${summary.employees}`)),
      h("div", { class: "dash-grid" },
        h("section", { class: "panel" }, h("h2", {}, "Compliance trend"), lineChart(data.trend),
          h("p", { class: "small muted" }, "Share of currently assigned policies and courses completed by each date.")),
        h("section", { class: "panel" }, h("h2", {}, "Employee risk"), donut(data.risks),
          h("p", { class: "small muted" }, "High: policy < 80%, training < 70% or quiz < 70%. Medium: anything below 100% or quiz < 80%."))),
      h("section", { class: "panel" }, h("h2", {}, "By department"),
        table([
          { label: "Department", key: "name" },
          { label: "Employees", render: (row) => String(row.employees) },
          { label: "Policy", render: (row) => `${row.policyRate}%` },
          { label: "Training", render: (row) => `${row.trainingRate}%` },
          { label: "Quiz pass", render: (row) => `${row.quizPassRate}%` },
          { label: "Overall", render: (row) => h("div", { class: "rate-cell" }, progressBar(row.overallRate, 100, `${row.overallRate}% overall`), h("span", {}, `${row.overallRate}%`)) }
        ], data.departments, { caption: "Compliance by department" })),
      h("section", { class: "panel" }, h("h2", {}, "Overdue items"),
        data.overdue.length ? table([
          { label: "Employee", render: (row) => `${row.user.displayName} (${row.user.department})` },
          { label: "Item", render: (row) => h("span", {}, badge(row.category, row.category === "Policy" ? "info" : "neutral"), " ", row.title) },
          { label: "Overdue", render: (row) => h("span", {}, badge(`${row.daysOverdue} days`, row.severity === "high" ? "danger" : row.severity === "medium" ? "warning" : "neutral"), ` since ${formatDate(row.dueDate)}`) },
          { label: "", render: (row) => h("button", { type: "button", class: "subtle", "aria-label": `Remind ${row.user.displayName} about ${row.title}`, on: { click: remind(row) } }, "Send reminder") }
        ], data.overdue, { caption: "Overdue items" }) : emptyState("Nothing is overdue", "")),
      data.activity.length ? h("section", { class: "panel" }, h("h2", {}, "Recent activity"),
        h("ul", { class: "plain-list" }, data.activity.map((item) => h("li", {}, h("strong", {}, item.action), ` · ${item.target} · ${item.actor} · `, h("span", { class: "muted small" }, formatDateTime(item.createdAt)))))) : null,
      h("p", { class: "small muted" }, `Last updated ${formatDateTime(data.lastUpdated)}`));
  });
}

function reportsPage(container) {
  const query = currentQuery();
  const type = REPORTS.some(([key]) => key === query.get("type")) ? query.get("type") : "executive";
  const department = query.get("department") || "All";
  const params = `type=${type}&department=${encodeURIComponent(department)}`;
  return withStates(container, () => Promise.all([api(`/api/compliance/reports?${params}`), api("/api/compliance/dashboard?period=30")]), ([report, dash]) => {
    const go = (next) => navigate(`/compliance/reports?type=${next.type}&department=${encodeURIComponent(next.department)}`);
    const typeSelect = h("select", { id: "rep-type", on: { change: (event) => go({ type: event.target.value, department }) } },
      REPORTS.map(([key, label]) => h("option", { value: key, selected: key === type }, label)));
    const deptSelect = h("select", { id: "rep-dept", disabled: !dash.filters.canChooseDepartment, on: { change: (event) => go({ type, department: event.target.value }) } },
      dash.filters.departments.map((name) => h("option", { value: name, selected: name === report.department }, name === "All" ? "All departments" : name)));
    const columns = report.rows.length ? Object.keys(report.rows[0]).map((key) => ({ label: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), render: (row) => String(row[key]) })) : [];
    return h("div", { class: "stack" },
      pageHeader(report.title, `${report.department === "All" ? "All departments" : report.department} · generated ${formatDateTime(report.generatedAt)}`,
        h("button", { type: "button", on: { click: () => download(`/api/compliance/reports.csv?${params}`, `secureaware-${type}-report.csv`).catch((error) => toast(error.message, "error")) } }, "Export CSV"),
        [["Dashboard", "#/compliance"], ["Reports", null]]),
      h("div", { class: "filters" },
        h("label", { class: "field" }, h("span", { class: "field-label" }, "Report"), typeSelect),
        h("label", { class: "field" }, h("span", { class: "field-label" }, "Department"), deptSelect)),
      h("section", { class: "panel" }, report.rows.length ? table(columns, report.rows, { caption: report.title }) : emptyState("No data for this selection", "")));
  });
}

export default {
  register({ route, nav }) {
    nav({ section: "Overview", label: "Compliance dashboard", href: "#/compliance", icon: "◔", roles: VIEW_ROLES, card: "Live compliance, risk and overdue items." });
    nav({ section: "Overview", label: "Reports", href: "#/compliance/reports", icon: "▤", roles: VIEW_ROLES });
    route("/compliance", dashboardPage, { title: "Compliance dashboard", roles: VIEW_ROLES });
    route("/compliance/reports", reportsPage, { title: "Reports", roles: VIEW_ROLES });
  }
};
