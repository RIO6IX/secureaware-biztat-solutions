import { api } from "../core/api.js";
import { h, mount, formatDate, formatDateTime } from "../core/dom.js";
import { navigate } from "../core/router.js";
import { loading, errorState, pageHeader, toast, badge, field } from "../core/ui.js";
import { hasRole } from "../core/shell.js";
import { ADMIN_ROLES, renderPolicy, statusBadge, versionBadge, dueLabel, compareHref, historyHref } from "./common.js";

export async function readerPage(container, params) {
  const url = params.label
    ? `/api/policy/policies/${encodeURIComponent(params.slug)}/versions/${encodeURIComponent(params.label)}`
    : `/api/policy/policies/${encodeURIComponent(params.slug)}`;
  mount(container, loading("Opening policy…"));
  let data;
  try {
    data = await api(url);
  } catch (error) {
    mount(container, errorState(error, () => readerPage(container, params)));
    return;
  }
  const { policy, version, state, reading } = data;
  const isAdmin = hasRole(ADMIN_ROLES);
  const canAck = data.canAcknowledge;
  const { fragment, toc } = renderPolicy(version.bodyMarkdown);

  const progress = h("progress", { class: "progress reading-progress", value: "0", max: "100", "aria-label": "Reading progress" });
  const liveStatus = h("p", { class: "read-status", role: "status", "aria-live": "polite" });
  const article = h("article", { class: "policy-document lesson-body", "aria-label": `${policy.title} version ${version.label}` }, fragment);
  const sentinel = h("div", { class: "read-sentinel", "aria-hidden": "true" });
  let reachedEnd = reading.reachedEnd;

  // Acknowledgement panel: disabled until the server confirms the reader reached the end.
  const nameInput = h("input", { id: "ack-name", name: "typedFullName", autocomplete: "name", required: true, maxlength: "120" });
  const attest = h("input", { id: "ack-attest", type: "checkbox", name: "attest" });
  const ackError = h("p", { class: "form-error", role: "alert", hidden: true });
  const ackFieldset = h("fieldset", { class: "ack-fieldset", disabled: !reachedEnd },
    h("legend", {}, "Acknowledge this policy"),
    h("label", { class: "checkbox ack-statement" }, attest, h("span", {}, data.attestation || "")),
    field("Type your full name to sign", nameInput, "It must match the name on your account."),
    ackError,
    h("button", { class: "primary", type: "submit" }, "Acknowledge version ", version.label));
  const ackForm = h("form", { class: "ack-panel panel", novalidate: true }, ackFieldset);
  ackForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    ackError.hidden = true;
    try {
      const result = await api(`/api/policy/policies/${encodeURIComponent(policy.slug)}/acknowledge`, {
        method: "POST", body: { versionId: version.id, attest: attest.checked, typedFullName: nameInput.value }
      });
      toast(result.existing ? "You had already acknowledged this version." : "Acknowledgement recorded.");
      navigate(`/policies/receipts/${result.receipt.receiptCode}`);
    } catch (error) {
      ackError.textContent = error.message;
      ackError.hidden = false;
    }
  });

  function lockMessage() {
    return reachedEnd ? "You have read to the end. You can now acknowledge this policy." : "Scroll to the end of the policy to unlock the acknowledgement.";
  }

  let retryTimer = null;
  async function reportEnd() {
    if (reachedEnd || !document.body.contains(article)) return;
    try {
      await api(`/api/policy/versions/${version.id}/read`, { method: "POST", body: { event: "end" } });
      reachedEnd = true;
      ackFieldset.disabled = false;
      liveStatus.textContent = lockMessage();
    } catch (error) {
      if (error.status === 409 && error.body?.secondsRemaining) {
        liveStatus.textContent = `Please keep reading. The acknowledgement unlocks in about ${error.body.secondsRemaining} seconds.`;
        clearTimeout(retryTimer);
        retryTimer = setTimeout(endSeen, Math.min(error.body.secondsRemaining, 60) * 1000 + 300);
      } else if (error.status !== 401) {
        liveStatus.textContent = error.message;
      }
    }
  }

  function onScroll() {
    if (!document.body.contains(article)) {
      window.removeEventListener("scroll", onScroll);
      return;
    }
    const rect = article.getBoundingClientRect();
    const total = Math.max(rect.height - window.innerHeight * 0.6, 1);
    progress.value = String(Math.max(0, Math.min(100, Math.round(((-rect.top + window.innerHeight * 0.2) / total) * 100))));
    // Fallback for browsers where IntersectionObserver is unavailable or paused.
    if (canAck && !reachedEnd && sentinel.getBoundingClientRect().top <= window.innerHeight) endSeen();
  }

  let endPending = false;
  function endSeen() {
    if (endPending) return;
    endPending = true;
    reportEnd().finally(() => { endPending = false; });
  }

  const tocNav = toc.length ? h("nav", { class: "policy-toc panel", "aria-label": "Table of contents" },
    h("h2", {}, "Contents"),
    h("ol", {}, toc.map((entry) => h("li", {}, h("button", { type: "button", class: "link-button", on: { click: () => {
      const target = document.getElementById(entry.id);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus({ preventScroll: true });
    } } }, entry.text.replace(/^\d+\.\s*/, "")))))) : null;

  const changeCallout = state?.needsReacknowledgement || (version.previousLabel && version.changeSummary && canAck)
    ? h("aside", { class: "callout callout-warning change-callout", role: "note" },
      h("p", { class: "callout-title" }, h("span", { class: "callout-icon", "aria-hidden": "true" }, "!"), `What changed in version ${version.label}`),
      h("p", {}, version.changeSummary),
      isAdmin && version.previousLabel ? h("p", {}, h("a", { href: compareHref(policy.slug, version.previousLabel, version.label) }, `Compare with version ${version.previousLabel}`)) : null)
    : null;

  const preview = !version.isCurrent
    ? h("aside", { class: "callout callout-note", role: "note" },
      h("p", { class: "callout-title" }, h("span", { class: "callout-icon", "aria-hidden": "true" }, "i"), "You are viewing a version that is not the current published policy"),
      h("p", {}, "Status: ", versionBadge(version.status), ". It cannot be acknowledged."))
    : null;

  const receiptLink = state?.acknowledgement
    ? h("p", { class: "completed-note" }, `You acknowledged version ${state.acknowledgement.versionLabel} on ${formatDateTime(state.acknowledgement.acknowledgedAt)}. `,
      h("a", { href: `#/policies/receipts/${state.acknowledgement.receiptCode}` }, "View receipt"))
    : null;

  mount(container, h("div", { class: "policy-reader" },
    pageHeader(policy.title, version.summary,
      [
        h("button", { type: "button", class: "no-print", on: { click: () => window.print() } }, "Print or save as PDF"),
        isAdmin ? h("a", { class: "button no-print", href: historyHref(policy.slug) }, "Version history") : null
      ],
      [["My policies", "#/policies"], [policy.title, null]]),
    h("div", { class: "reader-meta" },
      h("span", { class: "chip" }, policy.category),
      h("span", {}, `Version ${version.label}`),
      version.effectiveDate ? h("span", {}, `Effective ${formatDate(version.effectiveDate)}`) : null,
      h("span", {}, `Owner: ${policy.owner}`),
      h("span", {}, `${version.readingMinutes} min read`),
      state ? statusBadge(state.status) : null,
      dueLabel(state)),
    h("div", { class: "reading-bar no-print" }, progress),
    preview,
    changeCallout,
    h("div", { class: "reader-layout" },
      tocNav,
      h("div", { class: "reader-main" },
        article,
        sentinel,
        h("p", { class: "doc-fingerprint small muted" }, "Document fingerprint (SHA-256): ", h("code", {}, version.contentSha256)),
        receiptLink,
        canAck ? h("div", { class: "no-print" }, liveStatus, ackForm) : null,
        version.isCurrent ? questionsSection(data, policy) : null,
        version.isCurrent && state ? exceptionSection(data, policy) : null))));

  if (canAck) {
    liveStatus.textContent = lockMessage();
    api(`/api/policy/versions/${version.id}/read`, { method: "POST", body: { event: "open" } }).catch(() => null);
    if (!reachedEnd) {
      const observer = new IntersectionObserver((entries) => {
        if (!document.body.contains(sentinel)) return observer.disconnect();
        if (entries.some((entry) => entry.isIntersecting)) endSeen();
        return undefined;
      });
      observer.observe(sentinel);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function questionsSection(data, policy) {
  const textarea = h("textarea", { id: "policy-question", name: "question", rows: "3", maxlength: "1000", required: true });
  const form = h("form", { class: "stack" },
    field("Ask the policy owner", textarea, "Questions go to the policy owner. Answers are shared below without your name."),
    h("button", { type: "submit" }, "Send question"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api(`/api/policy/policies/${encodeURIComponent(policy.slug)}/questions`, { method: "POST", body: { question: textarea.value } });
      toast("Question sent to the policy owner.");
      form.reset();
    } catch (error) {
      toast(error.message, "error");
    }
  });
  return h("section", { class: "panel no-print", "aria-labelledby": "qa-title" },
    h("h2", { id: "qa-title" }, "Questions and answers"),
    data.questions.length ? h("dl", { class: "qa-list" }, data.questions.map((item) => [
      h("dt", {}, item.question, " ", h("span", { class: "muted small" }, `(v${item.versionLabel})`)),
      h("dd", {}, item.answer)])) : h("p", { class: "muted" }, "No questions have been answered yet."),
    data.myQuestions.length ? h("div", {}, h("h3", {}, "Your questions"), h("ul", { class: "plain-list" }, data.myQuestions.map((item) => h("li", {},
      h("strong", {}, item.question), " ", item.answer ? badge("Answered", "success") : badge("Waiting for an answer", "info"))))) : null,
    form);
}

function exceptionSection(data, policy) {
  const textarea = h("textarea", { id: "policy-exception", name: "justification", rows: "3", maxlength: "2000", required: true });
  const form = h("form", { class: "stack" },
    field("Business justification", textarea, "Explain why you cannot follow the policy, for how long, and what you will do instead."),
    h("button", { type: "submit" }, "Request exception"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api(`/api/policy/policies/${encodeURIComponent(policy.slug)}/exceptions`, { method: "POST", body: { justification: textarea.value } });
      toast("Exception request sent.");
      form.reset();
    } catch (error) {
      toast(error.message, "error");
    }
  });
  return h("details", { class: "panel no-print exception-panel" },
    h("summary", {}, "Request an exception"),
    data.myExceptions.length ? h("ul", { class: "plain-list" }, data.myExceptions.map((item) => h("li", {},
      badge(item.status === "approved" ? `Approved until ${formatDate(item.expiresAt)}` : item.status === "rejected" ? "Rejected" : "Pending", item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : "info"),
      " ", item.justification, item.decisionNote ? h("span", { class: "muted" }, ` – ${item.decisionNote}`) : null))) : null,
    form);
}
