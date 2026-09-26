import { api } from "../core/api.js";
import { h, formatDate, formatDateTime } from "../core/dom.js";
import { withStates, pageHeader, table, emptyState } from "../core/ui.js";
import { statusBadge, courseHref, nextStep } from "./common.js";

function metric(label, value) {
  return h("div", { class: "metric-card" }, h("strong", {}, String(value)), h("span", {}, label));
}

function attemptResult(row) {
  if (row.status === "submitted") return statusBadge(row.passed ? "passed" : "failed_retake");
  return row.status === "expired" ? "Expired" : "In progress";
}

export function myLearningPage(container, params, extraActions = () => null) {
  return withStates(container, () => api("/api/training/me"), (data) => h("div", { class: "stack" },
    pageHeader("My learning", "Your assigned courses, attempt history and certificates.", extraActions()),
    h("div", { class: "metric-grid" },
      metric("Assigned", data.summary.assigned),
      metric("In progress", data.summary.inProgress),
      metric("Overdue", data.summary.overdue),
      metric("Completed", data.summary.completed)),
    h("section", { class: "panel" }, h("h2", {}, "Courses"),
      data.courses.length ? table([
        { label: "Course", render: (row) => h("a", { href: courseHref(row.slug) }, row.title) },
        { label: "Status", render: (row) => statusBadge(row.state.status) },
        { label: "Progress", render: (row) => `${row.state.lessonsCompleted}/${row.state.lessonsTotal} lessons` },
        { label: "Due", render: (row) => (row.state.dueDate ? formatDate(row.state.dueDate) : "—") },
        { label: "Best score", render: (row) => (row.state.bestScore === null ? "—" : `${row.state.bestScore}%`) },
        { label: "Next step", render: (row) => {
          const step = nextStep(row.slug, row.state);
          return h("a", { class: "button", href: step.href }, step.label);
        } }
      ], data.courses, { caption: "My courses" }) : emptyState("Nothing assigned yet", "Browse the training catalogue to start a course.", h("a", { class: "button", href: "#/training?tab=all" }, "Browse courses"))),
    h("section", { class: "panel" }, h("h2", {}, "Attempt history"),
      table([
        { label: "Course", render: (row) => row.course.title },
        { label: "Attempt", render: (row) => String(row.attemptNumber) },
        { label: "Started", render: (row) => formatDateTime(row.startedAt) },
        { label: "Result", render: attemptResult },
        { label: "Score", render: (row) => (row.score === null ? "—" : `${row.score}%`) },
        { label: "Review", render: (row) => (row.status === "submitted" ? h("a", { href: `#/training/attempts/${row.id}` }, "Review") : "—") }
      ], data.attempts, { caption: "Attempt history", empty: "No quiz attempts yet" })),
    h("section", { class: "panel" }, h("h2", {}, "Certificates"),
      table([
        { label: "Course", render: (row) => row.course.title },
        { label: "Issued", render: (row) => formatDate(row.issuedAt) },
        { label: "Code", render: (row) => h("code", {}, row.code) },
        { label: "Certificate", render: (row) => h("a", { href: `#/training/certificates/${row.code}` }, "View") }
      ], data.certificates, { caption: "Certificates", empty: "Pass a course quiz to earn a certificate" }))));
}
