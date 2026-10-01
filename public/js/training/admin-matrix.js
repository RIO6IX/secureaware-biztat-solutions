// Training Needs Matrix editor: rows are audiences (everyone, each role, each department),
// columns are courses. A ticked cell means "mandatory for this audience".
import { api } from "../core/api.js";
import { h } from "../core/dom.js";
import { withStates, pageHeader, toast, badge } from "../core/ui.js";

const key = (role, department) => `${role}|${department ?? ""}`;

export function matrixPage(container) {
  return withStates(container, () => api("/api/training/admin/matrix"), (data) => {
    const audiences = [
      { role: "*", department: null, label: "All staff", hint: "Every role in every department" },
      ...data.roles.map((role) => ({ role, department: null, label: role, hint: "Role" })),
      ...data.departments.map((department) => ({ role: "*", department, label: `${department} department`, hint: "Department" }))
    ];
    const cells = new Map();
    const dueDays = new Map();
    for (const requirement of data.requirements) {
      cells.set(`${key(requirement.role, requirement.department)}#${requirement.courseId}`, true);
      dueDays.set(key(requirement.role, requirement.department), requirement.dueInDays);
    }

    const grid = h("table", { class: "matrix" },
      h("caption", { class: "sr-only" }, "Training Needs Matrix: audiences by courses"),
      h("thead", {}, h("tr", {},
        h("th", { scope: "col" }, "Audience"),
        data.courses.map((course) => h("th", { scope: "col" }, course.title, course.status === "draft" ? h("span", { class: "sr-only" }, " (draft)") : null, course.status === "draft" ? h("div", {}, badge("draft", "warning")) : null)),
        h("th", { scope: "col" }, "Due within (days)"))),
      h("tbody", {}, audiences.map((audience) => {
        const rowKey = key(audience.role, audience.department);
        return h("tr", {},
          h("th", { scope: "row" }, h("strong", {}, audience.label), h("div", { class: "muted small" }, audience.hint)),
          data.courses.map((course) => h("td", { "data-label": course.title },
            h("input", { type: "checkbox", "aria-label": `${course.title} mandatory for ${audience.label}`, checked: Boolean(cells.get(`${rowKey}#${course.id}`)),
              on: { change: (event) => cells.set(`${rowKey}#${course.id}`, event.target.checked) } }))),
          h("td", { "data-label": "Due within (days)" },
            h("input", { type: "number", min: "1", max: "365", value: String(dueDays.get(rowKey) ?? 30), "aria-label": `Due within days for ${audience.label}`,
              on: { input: (event) => dueDays.set(rowKey, Number(event.target.value)) } })));
      })));

    async function save() {
      const requirements = [];
      for (const audience of audiences) {
        const rowKey = key(audience.role, audience.department);
        for (const course of data.courses) {
          if (cells.get(`${rowKey}#${course.id}`)) requirements.push({ role: audience.role, department: audience.department, courseId: course.id, dueInDays: dueDays.get(rowKey) ?? 30 });
        }
      }
      try {
        const result = await api("/api/training/admin/matrix", { method: "PUT", body: { requirements } });
        toast(`Matrix saved: ${result.created} new assignments, ${result.removed} removed.`);
      } catch (error) {
        toast(error.message, "error");
      }
    }

    return h("div", { class: "stack" },
      pageHeader("Training Needs Matrix", "Maps every user type to the training it must complete. Saving applies the matrix straight away; it is also applied whenever someone signs in, so new starters and role or department changes are covered automatically.",
        [h("a", { class: "button", href: "#/training/admin/assignments" }, "Assignments"), h("button", { type: "button", class: "primary", on: { click: save } }, "Save matrix")]),
      h("section", { class: "panel" },
        h("p", { class: "muted" }, "Awareness for everyone plus role-based training for specialised roles, following NIST SP 800-50 Rev. 1 and NIST CSF 2.0 PR.AT-01/PR.AT-02. Draft courses are assigned once they are published."),
        h("div", { class: "matrix-wrap table-wrap" }, grid)));
  });
}
