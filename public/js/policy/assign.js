import { api } from "../core/api.js";
import { h, mount, formatDate } from "../core/dom.js";
import { withStates, pageHeader, toast, field, table, confirmDialog, badge } from "../core/ui.js";

export function assignPage(container) {
  const reload = () => assignPage(container);
  return withStates(container, () => api("/api/policy/admin/assignments"), (data) => {
    const policy = h("select", { id: "as-policy", name: "policySlug", required: true }, data.policies.map((item) => h("option", { value: item.slug }, item.title)));
    const targetType = h("select", { id: "as-type", name: "targetType" },
      h("option", { value: "department" }, "Department"), h("option", { value: "role" }, "Role"), h("option", { value: "user" }, "Individual user"));
    const valueHolder = h("div");
    const dueInDays = h("input", { id: "as-due", name: "dueInDays", type: "number", min: "1", max: "365", value: "14", required: true });
    const previewBox = h("div", { "aria-live": "polite" });
    let targetValue;
    function drawTarget() {
      if (targetType.value === "department") targetValue = h("select", { id: "as-value" }, data.departments.map((item) => h("option", { value: item }, item)));
      else if (targetType.value === "role") targetValue = h("select", { id: "as-value" }, data.roles.map((item) => h("option", { value: item }, item)));
      else targetValue = h("input", { id: "as-value", placeholder: "username, for example employee.demo", autocomplete: "off" });
      mount(valueHolder, field(targetType.value === "user" ? "Username" : "Target", targetValue));
      mount(previewBox);
    }
    targetType.addEventListener("change", drawTarget);
    drawTarget();
    const payload = () => ({ policySlug: policy.value, targetType: targetType.value, targetValue: targetValue.value.trim(), dueInDays: Number(dueInDays.value) });

    const confirmButton = h("button", { type: "button", class: "primary", disabled: true, on: { click: async () => {
      try {
        const result = await api("/api/policy/admin/assignments", { method: "POST", body: payload() });
        toast(`Assigned to ${result.recipients} people, due ${formatDate(result.dueDate)}.`);
        reload();
      } catch (error) {
        toast(error.message, "error");
      }
    } } }, "Confirm assignment");
    const previewButton = h("button", { type: "button", on: { click: async () => {
      try {
        const result = await api("/api/policy/admin/assignments/preview", { method: "POST", body: payload() });
        mount(previewBox, h("div", { class: "panel" },
          h("p", {}, h("strong", {}, `${result.recipients.length} people`), ` will be asked to acknowledge ${result.policy.title}:`),
          table([
            { label: "Name", key: "displayName" }, { label: "Role", key: "role" }, { label: "Department", key: "department" },
            { label: "", render: (row) => row.alreadyAssigned ? badge("Already assigned", "neutral") : badge("New", "info") }
          ], result.recipients, { caption: "Recipients", empty: "Nobody matches this target." })));
        confirmButton.disabled = result.recipients.length === 0;
      } catch (error) {
        confirmButton.disabled = true;
        toast(error.message, "error");
      }
    } } }, "Preview recipients");
    [policy, targetType, dueInDays].forEach((control) => control.addEventListener("change", () => { confirmButton.disabled = true; }));
    valueHolder.addEventListener("input", () => { confirmButton.disabled = true; });
    valueHolder.addEventListener("change", () => { confirmButton.disabled = true; });

    return h("div", { class: "stack" },
      pageHeader("Policy assignments", "Assign a published policy to a department, role or person. Only policies with a published version can be assigned."),
      h("section", { class: "panel" },
        h("h2", {}, "New assignment"),
        h("div", { class: "form-grid" }, field("Policy", policy), field("Assign to", targetType), valueHolder, field("Days to acknowledge", dueInDays)),
        h("div", { class: "inline-actions" }, previewButton, confirmButton),
        previewBox),
      h("section", { class: "panel" },
        h("h2", {}, "Current assignments"),
        table([
          { label: "Policy", render: (row) => row.policy.title },
          { label: "Target", render: (row) => `${row.targetType}: ${row.target}` },
          { label: "Due", render: (row) => `${formatDate(row.dueDate)} (${row.dueInDays} days)` },
          { label: "Assigned by", key: "assignedBy" },
          { label: "", render: (row) => h("button", { type: "button", class: "subtle", "aria-label": `Remove assignment of ${row.policy.title} to ${row.target}`, on: { click: async () => {
            if (!await confirmDialog({ title: "Remove assignment?", body: h("p", {}, `${row.policy.title} will no longer be required for ${row.target}. Existing acknowledgements are kept.`), confirmLabel: "Remove", tone: "danger" })) return;
            try {
              await api(`/api/policy/admin/assignments/${row.id}`, { method: "DELETE" });
              toast("Assignment removed.");
              reload();
            } catch (error) {
              toast(error.message, "error");
            }
          } } }, "Remove") }
        ], data.assignments, { caption: "Policy assignments", empty: "No assignments yet." })));
  });
}
