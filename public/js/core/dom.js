// DOM builder. All text goes through text nodes or attributes, so strings from the API are
// never parsed as HTML. There is deliberately no innerHTML anywhere in the client.

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set(["svg", "g", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "text", "tspan", "title", "desc", "defs", "linearGradient", "stop", "clipPath"]);

function append(parent, child) {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) {
    child.forEach((item) => append(parent, item));
    return;
  }
  parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
}

export function h(tag, attrs = {}, ...children) {
  const isSvg = SVG_TAGS.has(tag);
  const element = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") element.setAttribute("class", Array.isArray(value) ? value.filter(Boolean).join(" ") : value);
    else if (key === "text") element.textContent = value;
    else if (key === "on") for (const [event, handler] of Object.entries(value)) element.addEventListener(event, handler);
    else if (key === "dataset") Object.assign(element.dataset, value);
    else if (key === "value" && !isSvg) element.value = value;
    else if (key === "checked" || key === "disabled" || key === "selected" || key === "hidden" || key === "required" || key === "multiple") {
      if (isSvg) element.setAttribute(key, "");
      else element[key] = Boolean(value);
    } else if (key === "href" && !isSafeHref(value)) continue;
    else element.setAttribute(key, value === true ? "" : String(value));
  }
  append(element, children);
  return element;
}

// Only same-page hashes, relative app paths and http(s) links may become href values.
export function isSafeHref(value) {
  const text = String(value).trim();
  if (text.startsWith("#") || text.startsWith("/")) return !text.startsWith("//");
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function mount(target, ...children) {
  target.replaceChildren();
  append(target, children);
  return target;
}

export function externalLink(href, label) {
  return h("a", { href, target: "_blank", rel: "noopener noreferrer" }, label, h("span", { class: "sr-only" }, " (opens in a new tab)"));
}

let idCounter = 0;
export function uid(prefix = "id") {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
