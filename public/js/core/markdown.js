// Safe markdown renderer. It builds DOM nodes directly and never parses HTML, so any
// markup typed into a lesson shows up as literal text. Allowed output elements:
// h2, h3, p, ul, ol, li, strong, em, code, a (http/https only), blockquote and callout asides.
import { h, isSafeHref } from "./dom.js";

const CALLOUTS = {
  WARNING: { label: "Warning sign", icon: "!" },
  DO: { label: "Do this", icon: "✓" },
  DONT: { label: "Don't do this", icon: "✕" },
  EXAMPLE: { label: "Real-world example", icon: "›" },
  NOTE: { label: "Note", icon: "i" },
  STAT: { label: "Evidence", icon: "%" }
};

const INLINE = [
  { type: "code", regex: /`([^`]+)`/ },
  { type: "strong", regex: /\*\*([^*]+)\*\*/ },
  { type: "em", regex: /(?:^|(?<=[\s(]))_([^_]+)_(?=$|[\s).,;:!?])/ },
  { type: "em", regex: /(?:^|(?<=[\s(]))\*([^*\s][^*]*)\*(?=$|[\s).,;:!?])/ },
  { type: "link", regex: /\[([^\]]+)\]\(([^)\s]+)\)/ }
];

export function renderInline(text) {
  const nodes = [];
  let rest = text;
  while (rest) {
    let best = null;
    for (const rule of INLINE) {
      const match = rule.regex.exec(rest);
      if (match && (!best || match.index < best.match.index)) best = { rule, match };
    }
    if (!best) {
      nodes.push(rest);
      break;
    }
    const { rule, match } = best;
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    if (rule.type === "code") nodes.push(h("code", {}, match[1]));
    else if (rule.type === "strong") nodes.push(h("strong", {}, renderInline(match[1])));
    else if (rule.type === "em") nodes.push(h("em", {}, renderInline(match[1])));
    else if (rule.type === "link") {
      const href = match[2];
      const external = /^https?:/i.test(href);
      nodes.push(isSafeHref(href) && (external || href.startsWith("#"))
        ? h("a", external ? { href, target: "_blank", rel: "noopener noreferrer" } : { href }, renderInline(match[1]))
        : match[0]);
    }
    rest = rest.slice(match.index + match[0].length);
  }
  return nodes;
}

function paragraphs(lines) {
  const blocks = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length) blocks.push(h("p", {}, renderInline(buffer.join(" "))));
    buffer = [];
  };
  for (const line of lines) {
    if (!line.trim()) flush();
    else if (/^\s*[-*]\s+/.test(line)) {
      flush();
      const last = blocks.at(-1);
      const item = h("li", {}, renderInline(line.replace(/^\s*[-*]\s+/, "")));
      if (last?.tagName === "UL") last.append(item);
      else blocks.push(h("ul", {}, item));
    } else buffer.push(line.trim());
  }
  flush();
  return blocks;
}

export function renderMarkdown(source) {
  const fragment = document.createDocumentFragment();
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  let index = 0;
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length) fragment.append(h("p", {}, renderInline(paragraph.join(" "))));
    paragraph = [];
  };

  while (index < lines.length) {
    const line = lines[index];
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      fragment.append(h(heading[1].length <= 2 ? "h2" : "h3", {}, renderInline(heading[2].trim())));
      index += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      flushParagraph();
      const ordered = /^\s*\d+\.\s+/.test(line);
      const list = h(ordered ? "ol" : "ul");
      while (index < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[index])) {
        list.append(h("li", {}, renderInline(lines[index].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, ""))));
        index += 1;
      }
      fragment.append(list);
      continue;
    }
    if (line.startsWith(">")) {
      flushParagraph();
      const quoted = [];
      while (index < lines.length && lines[index].startsWith(">")) {
        quoted.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      const callout = /^\[!([A-Z]+)\]\s*(.*)$/.exec(quoted[0] || "");
      if (callout && CALLOUTS[callout[1]]) {
        const kind = CALLOUTS[callout[1]];
        fragment.append(h("aside", { class: `callout callout-${callout[1].toLowerCase()}`, role: "note" },
          h("p", { class: "callout-title" }, h("span", { class: "callout-icon", "aria-hidden": "true" }, kind.icon), renderInline(callout[2] || kind.label)),
          paragraphs(quoted.slice(1))));
      } else {
        fragment.append(h("blockquote", {}, paragraphs(quoted)));
      }
      continue;
    }
    if (!line.trim()) flushParagraph();
    else paragraph.push(line.trim());
    index += 1;
  }
  flushParagraph();
  return fragment;
}
