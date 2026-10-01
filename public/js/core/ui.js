// Shared UI pieces: toasts, loading/empty/error states, badges, progress and dialogs.
import { h, mount } from "./dom.js";

export function toast(message, type = "success") {
  let region = document.getElementById("toast-region");
  if (!region) {
    region = h("div", { id: "toast-region", class: "toast-region", role: "status", "aria-live": "polite" });
    document.body.append(region);
  }
  const item = h("div", { class: `toast toast-${type}` },
    h("span", { class: "toast-icon", "aria-hidden": "true" }, type === "error" ? "!" : "✓"),
    h("span", {}, message),
    h("button", { class: "toast-close", type: "button", "aria-label": "Dismiss message", on: { click: () => item.remove() } }, "×"));
  region.append(item);
  setTimeout(() => item.remove(), type === "error" ? 8000 : 5000);
}

export function loading(label = "Loading…") {
  return h("div", { class: "state state-loading", role: "status", "aria-live": "polite" }, h("span", { class: "spinner", "aria-hidden": "true" }), h("span", {}, label));
}

export function emptyState(title, detail = "", action = null) {
  return h("div", { class: "state state-empty" }, h("p", { class: "state-title" }, title), detail ? h("p", { class: "muted" }, detail) : null, action);
}

export function errorState(error, retry) {
  return h("div", { class: "state state-error", role: "alert" },
    h("p", { class: "state-title" }, error?.status === 403 ? "You do not have access to this page" : error?.status === 404 ? "We could not find that page" : "Something went wrong"),
    h("p", { class: "muted" }, error?.message || "Please try again."),
    retry ? h("button", { type: "button", on: { click: retry } }, "Try again") : null);
}

// Renders an async page with loading and error states in one place.
export async function withStates(container, load, render) {
  mount(container, loading());
  try {
    const data = await load();
    mount(container, render(data));
  } catch (error) {
    if (error?.status === 401) return;
    mount(container, errorState(error, () => withStates(container, load, render)));
  }
}

export function badge(text, tone = "neutral") {
  return h("span", { class: `badge badge-${tone}` }, text);
}

// Native <progress> keeps the bar accessible without inline styles (the CSP blocks them).
export function progressBar(value, max, label) {
  return h("progress", { class: "progress", value: String(value), max: String(Math.max(max, 1)), "aria-label": label }, `${value} of ${max}`);
}

// Circular progress drawn with SVG attributes rather than CSS width, for the same CSP reason.
export function progressRing(done, total, label) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const ratio = total ? Math.min(done / total, 1) : 0;
  return h("div", { class: "ring", role: "img", "aria-label": label || `${done} of ${total} lessons complete` },
    h("svg", { viewBox: "0 0 48 48", width: "48", height: "48", "aria-hidden": "true" },
      h("circle", { cx: "24", cy: "24", r: String(radius), class: "ring-track", fill: "none", "stroke-width": "5" }),
      ratio > 0 ? h("circle", { cx: "24", cy: "24", r: String(radius), class: "ring-value", fill: "none", "stroke-width": "5", "stroke-linecap": "round",
        "stroke-dasharray": `${(circumference * ratio).toFixed(2)} ${circumference.toFixed(2)}`, transform: "rotate(-90 24 24)" }) : null),
    h("span", { class: "ring-label", "aria-hidden": "true" }, `${done}/${total}`));
}

export function pageHeader(title, subtitle = "", actions = null, crumbs = null) {
  return h("header", { class: "page-header" },
    crumbs ? h("nav", { class: "breadcrumbs", "aria-label": "Breadcrumb" }, h("ol", {}, crumbs.map(([label, href]) => h("li", {}, href ? h("a", { href }, label) : h("span", { "aria-current": "page" }, label))))) : null,
    h("div", { class: "page-header-row" },
      h("div", {}, h("h1", { tabindex: "-1", class: "page-title" }, title), subtitle ? h("p", { class: "page-subtitle" }, subtitle) : null),
      actions ? h("div", { class: "page-actions" }, actions) : null));
}

export function confirmDialog({ title, body, confirmLabel = "Confirm", tone = "primary" }) {
  return new Promise((resolve) => {
    const dialog = h("dialog", { class: "dialog", "aria-labelledby": "dialog-title" },
      h("h2", { id: "dialog-title" }, title),
      h("div", { class: "dialog-body" }, body),
      h("div", { class: "dialog-actions" },
        h("button", { type: "button", on: { click: () => close(false) } }, "Cancel"),
        h("button", { type: "button", class: tone, on: { click: () => close(true) } }, confirmLabel)));
    function close(value) {
      dialog.close();
      dialog.remove();
      resolve(value);
    }
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close(false);
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

export function field(label, control, hint = "") {
  const hintId = hint ? `${control.id || control.name}-hint` : null;
  if (hintId) control.setAttribute("aria-describedby", hintId);
  return h("label", { class: "field" }, h("span", { class: "field-label" }, label), control, hint ? h("span", { class: "field-hint", id: hintId }, hint) : null);
}

export function table(columns, rows, { caption, empty = "No records" } = {}) {
  if (!rows.length) return emptyState(empty);
  return h("div", { class: "table-wrap" },
    h("table", {},
      caption ? h("caption", { class: "sr-only" }, caption) : null,
      h("thead", {}, h("tr", {}, columns.map((column) => h("th", { scope: "col" }, column.label)))),
      h("tbody", {}, rows.map((row) => h("tr", {}, columns.map((column) => h("td", { "data-label": column.label }, column.render ? column.render(row) : row[column.key])))))));
}
