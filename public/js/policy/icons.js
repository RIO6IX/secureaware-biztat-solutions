// Original inline SVG icons for policy categories (no remote images: the CSP is default-src 'self').
import { h } from "../core/dom.js";

const PATHS = {
  "Governance": ["M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z", "m8.5 12 2.5 2.5 4.5-5"],
  "Acceptable Use": ["M3 5h18v11H3z", "M8 20h8", "M12 16v4"],
  "Access Control": ["M7 11V8a5 5 0 0 1 10 0v3", "M5 11h14v10H5z", "M12 15v3"],
  "Data Protection": ["M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z", "M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6", "M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"],
  "Remote Work": ["M3 11 12 4l9 7", "M5 10v10h14V10", "M10 20v-5h4v5"],
  "Incident Management": ["M12 3 2 20h20L12 3Z", "M12 10v4", "M12 17h.01"],
  "Physical Security": ["M4 20V8l8-5 8 5v12", "M9 20v-6h6v6", "M2 20h20"],
  "Devices": ["M7 2h10v20H7z", "M11 18h2"]
};

export function policyIcon(category, size = 28) {
  const paths = PATHS[category] || PATHS.Governance;
  return h("svg", { viewBox: "0 0 24 24", width: String(size), height: String(size), fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
    paths.map((d) => h("path", { d })));
}
