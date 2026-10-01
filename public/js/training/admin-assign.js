import { api } from "../core/api.js";
import { h, mount, formatDate } from "../core/dom.js";
import { currentQuery } from "../core/router.js";
import { withStates, pageHeader, table, badge, toast, field, confirmDialog, emptyState } from "../core/ui.js";

export function assignmentsPage(container) {
  const source = ["manual", "matrix", "all"].includes(currentQuery().get("source")) ? currentQuery().get("source") : "manual";
  const reload = () => assignmentsPage(container);
  return withStates(container, () => api(`/api/training/admin/assignments?source=${source}`), (data) => {
    const targetType = h("select", { id: "assign-type", name: "targetType" }, [["department", "Department"], ["role", "Role"], ["user", "Individual user"]].map(([value, label]) => h("option", { value }, label)));
    const targetSlot = h("div", {});
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const preview = h("div", { "aria-live": "polite" });
    let targetInput;

    function drawTarget() {
      if (targetType.value === "department") targetInput = h("select", { id: "assign-target", name: "targetValue" }, data.departments.map((value) => h("option", { value }, value)));
      else if (targetType.value === "role") targetInput = h("select", { id: "assign-target", name: "targetValue" }, data.roles.map((value) => h("option", { value }, value)));
      else targetInput = h("input", { id: "assign-target", name: "targetValue", placeholder: "username, e.g. dev.demo", autocomplete: "off", maxlength: "80" });
      mount(targetSlot, field(targetType.value === "user" ? "Username" : targetType.value === "role" ? "Role" : "Department", targetInput));
      mount(preview);
    }
    targetType.addEventListener("change", drawTarget);
    drawTarget();

    const form = h("form", { class: "form-grid" },
      field("Course", h("select", { id: "assign-course", name: "courseId" }, data.courses.map((course) => h("option", { value: String(course.id) }, course.title)))),
      field("Assign to", targetType),
      targetSlot,
      field("Due date", h("input", { id: "assign-due", name: "dueDate", type: "date", value: due, min: new Date().toISOString().slice(0, 10), required: true })),
      h("label", { class: "checkbox" }, h("input", { type: "checkbox", name: "mandatory", checked: true }), h("span", {}, "Mandatory")),
      h("div", { class: "wide" }, h("button", { type: "submit", class: "primary" }, "Preview recipients")),
      h("div", { class: "wide" }, preview));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = new FormData(form);
      const body = { courseId: Number(values.get("courseId")), targetType: targetType.value, targetValue: String(values.get("targetValue") || "").trim(), dueDate: values.get("dueDate"), mandatory: values.get("mandatory") === "on" };
      try {
        const result = await api("/api/training/admin/assignments/preview", { method: "POST", body: { courseId: body.courseId, targetType: body.targetType, targetValue: body.targetValue } });
        mount(preview, h("div", { class: "panel" },
          h("h2", {}, `${result.recipients.length} people will receive "${result.course.title}"`),
          result.recipients.length ? table([
            { label: "Name", key: "displayName" }, { label: "Role", key: "role" }, { label: "Department", key: "department" }
          ], result.recipients, { caption: "Recipients" }) : emptyState("Nobody matches this target yet", "Future members of this group will still receive it."),
          h("div", { class: "inline-actions section-gap" },
            h("button", { type: "button", class: "primary", on: { click: async () => {
              try {
                const done = await api("/api/training/admin/assignments", { method: "POST", body });
                toast(`Assigned to ${done.recipients} people. They have been notified.`);
                reload();
              } catch (error) {
                toast(error.message, "error");
              }
            } } }, "Confirm assignment"),
            h("button", { type: "button", on: { click: () => mount(preview) } }, "Cancel"))));
      } catch (error) {
        toast(error.message, "error");
      }
    });

    const filter = h("div", { class: "tabs", role: "tablist", "aria-label": "Assignment source" },
      [["manual", "Manual"], ["matrix", "From matrix"], ["all", "All"]].map(([key, label]) => h("a", { class: "tab button", role: "tab", "aria-selected": String(source === key), href: `#/training/admin/assignments?source=${key}` }, label)));

    return h("div", { class: "stack" },
      pageHeader("Training assignments", "Assign published courses to a department, a role or one person. Mandatory role-based training is also assigned automatically by the Training Needs Matrix.",
        h("a", { class: "button", href: "#/training/admin/matrix" }, "Training Needs Matrix")),
      h("section", { class: "panel" }, h("h2", {}, "New assignment"), data.courses.length ? form : emptyState("No published courses", "Publish a course in the course builder first.")),
      h("section", { class: "panel" }, h("h2", {}, "Existing assignments"), filter,
        table([
          { label: "Course", render: (row) => row.course.title },
          { label: "Assigned to", render: (row) => `${row.targetType}: ${row.target}` },
          { label: "Due", render: (row) => formatDate(row.dueDate) },
          { label: "Type", render: (row) => (row.mandatory ? badge("Mandatory", "info") : badge("Optional", "neutral")) },
          { label: "Source", render: (row) => row.assignedBy },
          { label: "Actions", render: (row) => h("button", { type: "button", on: { click: async () => {
            const ok = await confirmDialog({ title: "Remove assignment?", body: h("p", {}, `${row.course.title} → ${row.target}. Completed training stays on record.`), confirmLabel: "Remove", tone: "danger" });
            if (!ok) return;
            try {
              await api(`/api/training/admin/assignments/${row.id}`, { method: "DELETE" });
              toast("Assignment removed.");
              reload();
            } catch (error) {
              toast(error.message, "error");
            }
          } } }, "Remove") }
        ], data.assignments, { caption: "Assignments", empty: "No assignments in this view" })));
  });
}
