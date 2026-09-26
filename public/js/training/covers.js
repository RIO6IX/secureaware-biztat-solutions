// Original course cover illustrations, drawn with SVG elements built through the DOM
// (no remote images, no HTML parsing, CSP-safe). Colours use presentation attributes.
import { h } from "../core/dom.js";

const palette = {
  phishing: ["#e0ecff", "#1d4ed8", "#f59e0b"],
  passwords: ["#e7f6ec", "#15803d", "#0f172a"],
  data: ["#f3e8ff", "#7c3aed", "#0f172a"],
  remote: ["#e0f2fe", "#0369a1", "#f59e0b"],
  incident: ["#fee2e2", "#b91c1c", "#0f172a"],
  code: ["#ecfeff", "#0e7490", "#0f172a"],
  shield: ["#eef2ff", "#4338ca", "#0f172a"]
};

const art = {
  phishing: ([, main, accent]) => [
    h("rect", { x: "70", y: "52", width: "150", height: "100", rx: "12", fill: "#ffffff", stroke: main, "stroke-width": "6" }),
    h("path", { d: "M76 60 145 112 214 60", fill: "none", stroke: main, "stroke-width": "6", "stroke-linejoin": "round" }),
    h("path", { d: "M262 30v62a22 22 0 1 1-22-22", fill: "none", stroke: "#0f172a", "stroke-width": "7", "stroke-linecap": "round" }),
    h("path", { d: "M262 30v-8", stroke: "#0f172a", "stroke-width": "7", "stroke-linecap": "round" }),
    h("circle", { cx: "238", cy: "150", r: "18", fill: accent }),
    h("rect", { x: "235", y: "138", width: "6", height: "14", rx: "3", fill: "#0f172a" }),
    h("circle", { cx: "238", cy: "158", r: "3.5", fill: "#0f172a" })
  ],
  passwords: ([, main, dark]) => [
    h("rect", { x: "105", y: "82", width: "110", height: "86", rx: "14", fill: main }),
    h("path", { d: "M130 82V62a30 30 0 0 1 60 0v20", fill: "none", stroke: dark, "stroke-width": "10" }),
    h("circle", { cx: "160", cy: "118", r: "12", fill: "#ffffff" }),
    h("rect", { x: "155", y: "122", width: "10", height: "24", rx: "4", fill: "#ffffff" }),
    ...[0, 1, 2, 3].map((index) => h("circle", { cx: String(235 + index * 18), cy: "60", r: "6", fill: dark })),
    h("rect", { x: "225", y: "80", width: "80", height: "10", rx: "5", fill: main, opacity: "0.5" })
  ],
  data: ([, main, dark]) => [
    h("path", { d: "M70 60h55l14 16h96a8 8 0 0 1 8 8v78a8 8 0 0 1-8 8H70a8 8 0 0 1-8-8V68a8 8 0 0 1 8-8Z", fill: main, opacity: "0.9" }),
    h("path", { d: "M250 70l40 14v30c0 26-18 42-40 50-22-8-40-24-40-50V84Z", fill: "#ffffff", stroke: dark, "stroke-width": "6", "stroke-linejoin": "round" }),
    h("path", { d: "m234 116 12 12 22-24", fill: "none", stroke: main, "stroke-width": "7", "stroke-linecap": "round", "stroke-linejoin": "round" })
  ],
  remote: ([, main, accent]) => [
    h("rect", { x: "70", y: "62", width: "140", height: "88", rx: "8", fill: "#ffffff", stroke: main, "stroke-width": "6" }),
    h("path", { d: "M52 160h176", stroke: main, "stroke-width": "8", "stroke-linecap": "round" }),
    h("path", { d: "M250 108a50 50 0 0 1 60 0M262 124a28 28 0 0 1 36 0", fill: "none", stroke: "#0f172a", "stroke-width": "6", "stroke-linecap": "round" }),
    h("circle", { cx: "280", cy: "142", r: "7", fill: "#0f172a" }),
    h("rect", { x: "118", y: "90", width: "44", height: "34", rx: "6", fill: accent }),
    h("path", { d: "M126 90v-8a14 14 0 0 1 28 0v8", fill: "none", stroke: "#0f172a", "stroke-width": "5" })
  ],
  incident: ([, main, dark]) => [
    h("path", { d: "M160 40 250 170H70Z", fill: main, stroke: dark, "stroke-width": "6", "stroke-linejoin": "round" }),
    h("rect", { x: "153", y: "86", width: "14", height: "46", rx: "7", fill: "#ffffff" }),
    h("circle", { cx: "160", cy: "150", r: "8", fill: "#ffffff" }),
    h("path", { d: "M262 70l22-16M270 100h26M262 130l22 16", stroke: dark, "stroke-width": "6", "stroke-linecap": "round" })
  ],
  code: ([, main, dark]) => [
    h("rect", { x: "60", y: "50", width: "170", height: "120", rx: "12", fill: "#0f172a" }),
    h("path", { d: "m100 94-20 16 20 16M150 94l20 16-20 16M136 88l-16 44", fill: "none", stroke: "#67e8f9", "stroke-width": "6", "stroke-linecap": "round", "stroke-linejoin": "round" }),
    h("path", { d: "M265 66l36 12v28c0 24-16 38-36 46-20-8-36-22-36-46V78Z", fill: main, stroke: dark, "stroke-width": "5", "stroke-linejoin": "round" }),
    h("path", { d: "m251 108 10 10 20-22", fill: "none", stroke: "#ffffff", "stroke-width": "6", "stroke-linecap": "round", "stroke-linejoin": "round" })
  ],
  shield: ([, main]) => [
    h("path", { d: "M160 40l70 24v44c0 40-30 64-70 76-40-12-70-36-70-76V64Z", fill: main }),
    h("path", { d: "m132 110 20 20 38-40", fill: "none", stroke: "#ffffff", "stroke-width": "9", "stroke-linecap": "round", "stroke-linejoin": "round" })
  ]
};

export const COVER_KEYS = Object.keys(art);

export function cover(key, title = "") {
  const name = art[key] ? key : "shield";
  const colours = palette[name];
  return h("svg", { class: "cover-art", viewBox: "0 0 320 200", role: "img", "aria-label": title ? `Illustration for ${title}` : "Course illustration", preserveAspectRatio: "xMidYMid slice" },
    h("rect", { width: "320", height: "200", fill: colours[0] }),
    h("circle", { cx: "40", cy: "180", r: "60", fill: colours[1], opacity: "0.08" }),
    h("circle", { cx: "300", cy: "20", r: "50", fill: colours[1], opacity: "0.1" }),
    art[name](colours));
}
