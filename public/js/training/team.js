import { api } from "../core/api.js";
import { h, mount, formatDate } from "../core/dom.js";
import { currentQuery } from "../core/router.js";
import { withStates, pageHeader, toast, emptyState, loading, errorState, table } from "../core/ui.js";
import { statusBadge } from "./common.js";
import { currentUser } from "../core/shell.js";

function metric(label, value) {
  return h("div", { class: "metric-card" }, h("strong", {}, String(value)), h("span", {}, label));
}

export function teamPage(container) {
  const department = currentQuery().get("department") || "";
  const query = department ? `?department=${encodeURIComponent(department)}` : "";
  return withStates(container, () => api(`/api/training/team${query}`), (data) => {
    const detail = h("div", { "aria-live": "polite" });

    async function remind(member, course, button) {
      button.disabled = true;
      try {
        await api("/api/training/team/reminders", { method: "POST", body: { targetUserId: member.user.id, courseId: course.courseId } });
        toast(`Reminder sent to ${member.user.displayName}.`);
        button.textContent = "Reminded";
      } catch (error) {
        toast(error.message, "error");
        button.disabled = false;
      }
    }

    async function showHistory(member) {
      mount(detail, loading());
      try {
        const history = await api(`/api/training/team/users/${member.user.id}`);
        mount(detail, h("section", { class: "panel" },
          h("h2", {}, `${history.user.displayName}: attempt history`),
          table([
            { label: "Course", render: (row) => row.course.title },
            { label: "Attempt", render: (row) => String(row.attemptNumber) },
            { label: "Result", render: (row) => (row.status === "submitted" ? statusBadge(row.passed ? "passed" : "failed_retake") : row.status) },
            { label: "Score", render: (row) => (row.score === null ? "—" : `${row.score}%`) },
            { label: "Date", render: (row) => formatDate(row.submittedAt || row.startedAt) },
            // Answer-level reviews are private to the learner and admins.
            ...(data.canChooseDepartment ? [{ label: "Review", render: (row) => (row.status === "submitted" ? h("a", { href: `#/training/attempts/${row.id}` }, "Open") : "—") }] : [])
          ], history.attempts, { caption: "Attempt history", empty: "No attempts yet" })));
        detail.scrollIntoView({ block: "start" });
      } catch (error) {
        mount(detail, errorState(error));
      }
    }

    const needsAttention = (course) => ["overdue", "failed_retake", "failed_locked"].includes(course.status);
    const rows = data.members.flatMap((member) => member.courses.map((course) => ({ member, course })));
    const attention = rows.filter(({ course }) => needsAttention(course));

    const departmentPicker = data.canChooseDepartment ? h("label", { class: "field" }, h("span", { class: "field-label" }, "Department"),
      h("select", { id: "team-department", on: { change: (event) => { location.hash = `#/training/team${event.target.value ? `?department=${encodeURIComponent(event.target.value)}` : ""}`; } } },
        h("option", { value: "" }, "All departments"),
        data.departments.map((name) => h("option", { value: name, selected: name === department }, name)))) : null;

    const courseTable = (list) => table([
      { label: "Person", render: ({ member }) => h("button", { type: "button", class: "subtle", on: { click: () => showHistory(member) } }, member.user.displayName) },
      { label: "Course", render: ({ course }) => course.title },
      { label: "Status", render: ({ course }) => statusBadge(course.status) },
      { label: "Due", render: ({ course }) => (course.dueDate ? formatDate(course.dueDate) : "—") },
      { label: "Progress", render: ({ course }) => `${course.lessonsCompleted}/${course.lessonsTotal} lessons · ${course.attemptsUsed} attempt(s)` },
      { label: "Action", render: ({ member, course }) => (course.status === "passed" || member.user.id === currentUser().id ? "—"
        : h("button", { type: "button", on: { click: (event) => remind(member, course, event.currentTarget) } }, "Send reminder")) }
    ], list, { caption: "Team training" });

    return h("div", { class: "stack" },
      pageHeader("Team training", `${data.department}. You see only people in ${data.canChooseDepartment ? "the selected department" : "your own department"}; individual answers are never shown to managers.`, departmentPicker),
      h("div", { class: "metric-grid" },
        metric("People", data.summary.members),
        metric("Completion", `${data.summary.completionRate}%`),
        metric("Overdue", data.summary.overdue),
        metric("Failed, needs support", data.summary.failed)),
      h("section", { class: "panel" }, h("h2", {}, "Needs attention"),
        attention.length ? courseTable(attention) : emptyState("Nobody is overdue or failing", "Great work – everyone is on track.")),
      h("section", { class: "panel" }, h("h2", {}, "All assigned training"), rows.length ? courseTable(rows) : emptyState("No training assigned to this team yet")),
      detail);
  });
}
