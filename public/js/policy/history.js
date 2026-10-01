import { api } from "../core/api.js";
import { h, mount, formatDateTime } from "../core/dom.js";
import { currentQuery, navigate } from "../core/router.js";
import { withStates, pageHeader, toast, field, confirmDialog, emptyState } from "../core/ui.js";
import { versionBadge, decisionBadge, versionHref, compareHref, editorHref, historyHref, policyHref } from "./common.js";

function newVersionForm(history) {
  const { minor, major } = history.suggestions;
  const label = h("input", { id: "nv-label", name: "versionLabel", value: minor, required: true, pattern: "\\d+\\.\\d+", maxlength: "7" });
  const kind = h("select", { id: "nv-kind" },
    h("option", { value: "minor" }, `Minor – wording or clarity (${minor})`),
    h("option", { value: "major" }, `Major – new or changed obligations (${major})`));
  const reack = h("input", { type: "checkbox", id: "nv-reack", checked: false });
  kind.addEventListener("change", () => {
    label.value = kind.value === "major" ? major : minor;
    reack.checked = kind.value === "major";
  });
  const change = h("textarea", { id: "nv-change", name: "changeSummary", rows: "3", required: true, maxlength: "1000" });
  const form = h("form", { class: "stack" },
    h("div", { class: "form-grid" }, field("Type of change", kind), field("Version number", label)),
    field("Change summary", change, "Employees see this as \"What changed in this version\"."),
    h("label", { class: "checkbox" }, reack, h("span", {}, "Everyone must acknowledge this version again")),
    h("button", { class: "primary", type: "submit" }, "Create draft from current version"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const result = await api(`/api/policy/admin/policies/${encodeURIComponent(history.policy.slug)}/versions`, {
        method: "POST", body: { versionLabel: label.value.trim(), changeSummary: change.value, requiresReacknowledgement: reack.checked }
      });
      toast(`Draft v${result.version.label} created.`);
      navigate(editorHref(result.version.id).slice(1));
    } catch (error) {
      toast(error.message, "error");
      if (error.body?.versionId) navigate(editorHref(error.body.versionId).slice(1));
    }
  });
  return h("details", { class: "panel" }, h("summary", {}, h("strong", {}, "Create new version")), form);
}

export function historyPage(container, params) {
  return withStates(container, () => api(`/api/policy/admin/policies/${encodeURIComponent(params.slug)}/history`), (history) => {
    const { policy, versions } = history;
    const published = versions.filter((version) => version.publishedAt);
    const archive = h("button", { type: "button", class: "danger", on: { click: async () => {
      if (!await confirmDialog({ title: `Archive ${policy.title}?`, body: h("p", {}, "The policy is withdrawn from everyone's inbox. Its versions and acknowledgement evidence are kept."), confirmLabel: "Archive", tone: "danger" })) return;
      try {
        await api(`/api/policy/admin/policies/${encodeURIComponent(policy.slug)}/archive`, { method: "POST", body: {} });
        toast("Policy archived.");
        historyPage(container, params);
      } catch (error) {
        toast(error.message, "error");
      }
    } } }, "Archive policy");
    return h("div", { class: "stack" },
      pageHeader(`${policy.title}: version history`, `${policy.category} · owner ${policy.owner}`,
        [history.currentVersionId ? h("a", { class: "button", href: policyHref(policy.slug) }, "Open current version") : null,
          published.length >= 2 ? h("a", { class: "button", href: compareHref(policy.slug, published.at(-2).label, published.at(-1).label) }, "Compare latest two") : null,
          policy.archived ? null : archive],
        [["Policy library", "#/policies/admin"], [policy.title, null]]),
      history.suggestions && !policy.archived ? newVersionForm(history) : null,
      h("ol", { class: "timeline" }, versions.map((version) => h("li", { class: ["timeline-item", `timeline-${version.status}`] },
        h("div", { class: "timeline-head" },
          h("h2", {}, h("a", { href: ["draft", "in_review", "approved"].includes(version.status) ? editorHref(version.id) : versionHref(policy.slug, version.label) }, `Version ${version.label}`)),
          versionBadge(version.status),
          version.requiresReacknowledgement ? h("span", { class: "chip" }, "Re-acknowledgement required") : h("span", { class: "chip" }, "Minor change")),
        h("p", {}, version.changeSummary),
        h("dl", { class: "facts" },
          h("dt", {}, "Author"), h("dd", {}, `${version.createdBy}, ${formatDateTime(version.createdAt)}`),
          version.reviews.length ? [h("dt", {}, "Reviewers"), h("dd", {}, version.reviews.map((review) => h("span", { class: "reviewer-chip" }, `${review.reviewer.displayName} (${review.group}) `, decisionBadge(review.decision))))] : null,
          version.publishedAt ? [h("dt", {}, "Published"), h("dd", {}, `${formatDateTime(version.publishedAt)} by ${version.publishedBy}`)] : null,
          version.supersededAt ? [h("dt", {}, version.status === "archived" ? "Archived" : "Superseded"), h("dd", {}, formatDateTime(version.supersededAt))] : null,
          h("dt", {}, "Acknowledgements"), h("dd", {}, String(version.acknowledgements)),
          h("dt", {}, "SHA-256"), h("dd", {}, h("code", { class: "hash" }, version.contentSha256)))))));
  });
}

export async function comparePage(container, params) {
  const query = currentQuery();
  const from = query.get("from") || "";
  const to = query.get("to") || "";
  const mode = query.get("view") === "inline" ? "inline" : "side";
  return withStates(container, () => api(`/api/policy/admin/policies/${encodeURIComponent(params.slug)}/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`), (data) => {
    const pick = (name, value) => h("select", { id: `cmp-${name}`, on: { change: (event) => {
      const next = { from, to, [name]: event.target.value };
      navigate(`/policies/${encodeURIComponent(params.slug)}/compare?from=${encodeURIComponent(next.from)}&to=${encodeURIComponent(next.to)}&view=${mode}`);
    } } }, data.versions.map((label) => h("option", { value: label, selected: label === value }, `v${label}`)));
    const toggle = h("a", { class: "button", href: `${compareHref(params.slug, from, to)}&view=${mode === "side" ? "inline" : "side"}` }, mode === "side" ? "Inline view" : "Side-by-side view");
    // Every line is a text node, so nothing in a policy can become markup.
    const sign = { same: " ", added: "+", removed: "−" };
    const label = { same: "", added: "Added: ", removed: "Removed: " };
    const inline = h("ol", { class: "diff diff-inline" }, data.ops.map((op) => h("li", { class: `diff-${op.type}` },
      h("span", { class: "diff-sign", "aria-hidden": "true" }, sign[op.type]), h("span", { class: "sr-only" }, label[op.type]), op.text || " ")));
    const left = [];
    const right = [];
    for (const op of data.ops) {
      if (op.type !== "added") left.push(h("li", { class: `diff-${op.type}` }, h("span", { class: "sr-only" }, label[op.type]), op.text || " "));
      if (op.type !== "removed") right.push(h("li", { class: `diff-${op.type}` }, h("span", { class: "sr-only" }, label[op.type]), op.text || " "));
    }
    const side = h("div", { class: "diff-side" },
      h("section", {}, h("h2", {}, `v${data.from.label} `, versionBadge(data.from.status)), h("ol", { class: "diff" }, left)),
      h("section", {}, h("h2", {}, `v${data.to.label} `, versionBadge(data.to.status)), h("ol", { class: "diff" }, right)));
    return h("div", { class: "stack" },
      pageHeader(`Compare ${data.policy.title}`, `${data.stats.added} lines added, ${data.stats.removed} removed, ${data.stats.unchanged} unchanged.`, toggle,
        [["Policy library", "#/policies/admin"], [data.policy.title, historyHref(params.slug)], ["Compare", null]]),
      h("div", { class: "filters" },
        h("label", { class: "field" }, h("span", { class: "field-label" }, "From"), pick("from", data.from.label)),
        h("label", { class: "field" }, h("span", { class: "field-label" }, "To"), pick("to", data.to.label))),
      data.to.changeSummary ? h("aside", { class: "callout callout-note", role: "note" }, h("p", { class: "callout-title" }, `Change summary for v${data.to.label}`), h("p", {}, data.to.changeSummary)) : null,
      data.ops.length ? h("div", { class: "panel" }, mode === "side" ? side : inline) : emptyState("These versions are identical"));
  });
}
