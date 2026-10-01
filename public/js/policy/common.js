import { h, formatDate } from "../core/dom.js";
import { badge } from "../core/ui.js";
import { renderMarkdown, renderInline } from "../core/markdown.js";

export const ADMIN_ROLES = ["Security/HR Admin", "System Admin"];
export const MANAGER_ROLES = ["Department Manager", ...ADMIN_ROLES];

export const STATUS = {
  pending: ["Action required", "info"],
  needs_reack: ["Re-acknowledge", "warning"],
  overdue: ["Overdue", "danger"],
  complete: ["Acknowledged", "success"],
  exempt: ["Exception approved", "neutral"],
  optional: ["For information", "neutral"]
};

export const VERSION_STATUS = {
  draft: ["Draft", "neutral"],
  in_review: ["In review", "info"],
  approved: ["Approved – ready to publish", "success"],
  published: ["Published", "success"],
  superseded: ["Superseded", "neutral"],
  archived: ["Archived", "neutral"]
};

export const DECISION = {
  pending: ["Pending", "info"],
  approved: ["Approved", "success"],
  changes_requested: ["Changes requested", "warning"]
};

export function statusBadge(status) {
  const [label, tone] = STATUS[status] || [status, "neutral"];
  return badge(label, tone);
}

export function versionBadge(status) {
  const [label, tone] = VERSION_STATUS[status] || [status, "neutral"];
  return badge(label, tone);
}

export function decisionBadge(decision) {
  const [label, tone] = DECISION[decision] || [decision, "neutral"];
  return badge(label, tone);
}

export function dueLabel(state) {
  if (!state?.dueDate || ["complete", "exempt", "optional"].includes(state.status)) return null;
  const overdue = state.status === "overdue";
  return h("span", { class: ["due", overdue ? "due-overdue" : ""] }, overdue ? "Was due " : "Due ", formatDate(state.dueDate));
}

export const policyHref = (slug) => `#/policies/${encodeURIComponent(slug)}`;
export const versionHref = (slug, label) => `#/policies/${encodeURIComponent(slug)}/v/${encodeURIComponent(label)}`;
export const historyHref = (slug) => `#/policies/${encodeURIComponent(slug)}/history`;
export const compareHref = (slug, from, to) => `#/policies/${encodeURIComponent(slug)}/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
export const editorHref = (id) => `#/policies/admin/versions/${id}`;

function tableBlock(lines) {
  const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  const [head, , ...rows] = lines;
  return h("div", { class: "table-wrap" }, h("table", {},
    h("thead", {}, h("tr", {}, cells(head).map((cell) => h("th", { scope: "col" }, renderInline(cell))))),
    h("tbody", {}, rows.map((row) => h("tr", {}, cells(row).map((cell) => h("td", {}, renderInline(cell))))))));
}

// Policy renderer: the shared safe markdown renderer (DOM nodes only, no HTML parsing) plus
// simple pipe tables and ids on section headings for the table of contents.
export function renderPolicy(source) {
  const fragment = document.createDocumentFragment();
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  let buffer = [];
  const flush = () => {
    if (buffer.length) fragment.append(renderMarkdown(buffer.join("\n")));
    buffer = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s*\|.*\|\s*$/.test(lines[index]) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[index + 1] || "")) {
      flush();
      const block = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) block.push(lines[index++]);
      index -= 1;
      fragment.append(tableBlock(block));
    } else {
      buffer.push(lines[index]);
    }
  }
  flush();
  const toc = [];
  fragment.querySelectorAll("h2").forEach((heading, position) => {
    heading.id = `policy-section-${position + 1}`;
    heading.setAttribute("tabindex", "-1");
    toc.push({ id: heading.id, text: heading.textContent });
  });
  return { fragment, toc };
}

export function versionLabelLine(version) {
  return `Version ${version.label}${version.effectiveDate ? ` · effective ${formatDate(version.effectiveDate)}` : ""}`;
}
