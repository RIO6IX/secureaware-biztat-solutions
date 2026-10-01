import { ADMIN_ROLES } from "../schema.js";
import { attestationStatement, minReadSeconds, newReceiptCode, readingMinutes, RECEIPT_PATTERN, userAgentFamily } from "../store.js";
import { bool, fail, id as idValue, oneOf, slug as slugValue, text, versionLabel } from "../validate.js";

export function receiptView(row) {
  return {
    receiptCode: row.receipt_code,
    policy: { slug: row.slug, title: row.title },
    versionLabel: row.version_label,
    statement: row.statement_text,
    typedFullName: row.typed_full_name,
    contentSha256: row.content_sha256,
    acknowledgedAt: row.acknowledged_at,
    browser: row.user_agent_family,
    employee: { displayName: row.display_name, department: row.department }
  };
}

export const RECEIPT_SELECT = `SELECT a.*, v.version_label, p.slug, p.title, u.display_name, u.department
  FROM policy_acknowledgements a JOIN policy_versions v ON v.id = a.version_id JOIN policies p ON p.id = v.policy_id JOIN users u ON u.id = a.user_id`;

function normaliseName(value) {
  return String(value).normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export default function registerEmployee({ route, store, foundation }) {
  const db = foundation.db;
  const isAdmin = (user) => foundation.hasRole(user, ADMIN_ROLES);
  const ownerName = (policy) => (policy.owner_user_id ? store.q.userById.get(policy.owner_user_id)?.display_name : null) || "Information Security";

  function inboxItem({ policy, state }) {
    const version = store.q.versionById.get(state.currentVersionId);
    return {
      slug: policy.slug,
      title: policy.title,
      category: policy.category,
      visibility: policy.visibility,
      versionLabel: version.version_label,
      summary: version.summary,
      effectiveDate: version.effective_date,
      readingMinutes: readingMinutes(version.body_markdown),
      ...state
    };
  }

  route("GET", "/policies", (ctx) => {
    const items = store.inbox(ctx.user).map(inboxItem);
    return ctx.send(200, {
      policies: items,
      categories: [...new Set(items.map((item) => item.category))].sort(),
      counts: {
        actionRequired: items.filter((item) => ["pending", "needs_reack"].includes(item.status)).length,
        overdue: items.filter((item) => item.status === "overdue").length,
        acknowledged: items.filter((item) => item.status === "complete").length,
        all: items.length
      }
    });
  });

  // Reader. Without a version label it opens the current published version; a label lets
  // admins and reviewers open drafts and older versions (store.canRead decides).
  function openVersion(ctx) {
    const policy = store.q.policyBySlug.get(slugValue(ctx.params.slug, "policy"));
    if (!policy) return { error: 404 };
    const version = ctx.params.label
      ? store.q.versionByLabel.get(policy.id, versionLabel(ctx.params.label))
      : store.currentVersion(policy);
    if (!store.canRead(ctx.user, policy, version, isAdmin(ctx.user))) return { error: 404 };
    return { policy, version };
  }

  function readerPayload(ctx, policy, version) {
    const current = store.currentVersion(policy);
    const state = store.statusFor(ctx.user, policy);
    const read = store.q.readEvent.get(ctx.user.id, version.id);
    const isCurrent = current?.id === version.id;
    const previous = db.prepare(`SELECT version_label FROM policy_versions WHERE policy_id = ? AND published_at IS NOT NULL AND published_at < COALESCE(?, '9999')
      ORDER BY published_at DESC LIMIT 1`).get(policy.id, version.published_at);
    return {
      policy: { id: policy.id, slug: policy.slug, title: policy.title, category: policy.category, owner: ownerName(policy), visibility: policy.visibility, archived: Boolean(policy.archived_at) },
      version: {
        id: version.id,
        label: version.version_label,
        status: version.status,
        summary: version.summary,
        bodyMarkdown: version.body_markdown,
        changeSummary: version.change_summary,
        requiresReacknowledgement: Boolean(version.requires_reacknowledgement),
        previousLabel: previous?.version_label ?? null,
        effectiveDate: version.effective_date,
        nextReviewDate: version.next_review_date,
        publishedAt: version.published_at,
        contentSha256: version.content_sha256,
        readingMinutes: readingMinutes(version.body_markdown),
        isCurrent
      },
      state,
      reading: {
        firstOpenedAt: read?.first_opened_at ?? null,
        reachedEnd: Boolean(read?.reached_end_at),
        minReadSeconds: minReadSeconds(version.body_markdown)
      },
      attestation: isCurrent && state ? attestationStatement(policy.title, version.version_label) : null,
      canAcknowledge: Boolean(isCurrent && state && !state.acknowledgement),
      questions: db.prepare(`SELECT q.id, q.question, q.answer, q.answered_at, v.version_label FROM policy_questions q JOIN policy_versions v ON v.id = q.version_id
        WHERE v.policy_id = ? AND q.answer IS NOT NULL ORDER BY q.answered_at DESC LIMIT 50`).all(policy.id)
        .map((row) => ({ id: row.id, question: row.question, answer: row.answer, versionLabel: row.version_label, answeredAt: row.answered_at })),
      myQuestions: db.prepare(`SELECT q.id, q.question, q.answer, q.created_at, q.answered_at FROM policy_questions q JOIN policy_versions v ON v.id = q.version_id
        WHERE v.policy_id = ? AND q.asked_by = ? ORDER BY q.id DESC`).all(policy.id, ctx.user.id)
        .map((row) => ({ id: row.id, question: row.question, answer: row.answer, createdAt: row.created_at, answeredAt: row.answered_at })),
      myExceptions: db.prepare("SELECT id, justification, status, decision_note, expires_at, created_at FROM policy_exceptions WHERE policy_id = ? AND requested_by = ? ORDER BY id DESC")
        .all(policy.id, ctx.user.id)
        .map((row) => ({ id: row.id, justification: row.justification, status: row.status, decisionNote: row.decision_note, expiresAt: row.expires_at, createdAt: row.created_at }))
    };
  }

  route("GET", "/policies/:slug", (ctx) => {
    const opened = openVersion(ctx);
    if (opened.error) return ctx.send(404, { message: "Policy not found" });
    return ctx.send(200, readerPayload(ctx, opened.policy, opened.version));
  });

  route("GET", "/policies/:slug/versions/:label", (ctx) => {
    const opened = openVersion(ctx);
    if (opened.error) return ctx.send(404, { message: "Policy version not found" });
    return ctx.send(200, readerPayload(ctx, opened.policy, opened.version));
  });

  // Read tracking. "open" records the first time the reader was opened; "end" is accepted
  // only after the minimum reading time, so the end of the document cannot be faked by
  // calling the API straight away.
  route("POST", "/versions/:id/read", async (ctx) => {
    const body = await ctx.body();
    const event = oneOf(body.event, "event", ["open", "end"]);
    const version = store.q.versionById.get(idValue(ctx.params.id, "version id"));
    const policy = version ? store.q.policyById.get(version.policy_id) : null;
    if (!store.canRead(ctx.user, policy, version, isAdmin(ctx.user))) return ctx.send(404, { message: "Policy version not found" });
    const now = new Date();
    db.prepare("INSERT OR IGNORE INTO policy_read_events (user_id,version_id,first_opened_at) VALUES (?,?,?)").run(ctx.user.id, version.id, now.toISOString());
    const read = store.q.readEvent.get(ctx.user.id, version.id);
    if (event === "open") return ctx.send(200, { reachedEnd: Boolean(read.reached_end_at), minReadSeconds: minReadSeconds(version.body_markdown) });
    if (read.reached_end_at) return ctx.send(200, { reachedEnd: true });
    const seconds = Math.floor((now.getTime() - new Date(read.first_opened_at).getTime()) / 1000);
    const needed = minReadSeconds(version.body_markdown);
    if (seconds < needed) {
      return ctx.send(409, { message: `Please take time to read the whole policy. The acknowledgement opens after about ${needed} seconds of reading.`, secondsRemaining: needed - seconds });
    }
    db.prepare("UPDATE policy_read_events SET reached_end_at = ?, seconds_open = ? WHERE user_id = ? AND version_id = ?").run(now.toISOString(), seconds, ctx.user.id, version.id);
    ctx.audit("POLICY_READ_COMPLETED", `${policy.slug} v${version.version_label}`);
    return ctx.send(200, { reachedEnd: true });
  });

  route("POST", "/policies/:slug/acknowledge", async (ctx) => {
    const body = await ctx.body();
    const policy = store.q.policyBySlug.get(slugValue(ctx.params.slug, "policy"));
    const current = store.currentVersion(policy);
    if (!policy || !current) return ctx.send(404, { message: "Policy not found" });
    const versionId = idValue(body.versionId, "versionId");
    const attest = bool(body.attest, "Attestation");
    const typed = text(body.typedFullName, "Full name", { min: 2, max: 120 });
    const state = store.statusFor(ctx.user, policy);
    if (!state) {
      ctx.audit("POLICY_ACK_REJECTED", `${policy.slug}: not assigned`);
      return ctx.send(403, { message: "This policy is not assigned to you." });
    }
    if (versionId !== current.id) {
      const shown = store.q.versionById.get(versionId);
      return ctx.send(400, { message: shown?.policy_id === policy.id
        ? `Version ${shown.version_label} has been replaced. Please read and acknowledge version ${current.version_label}.`
        : "That version does not belong to this policy." });
    }
    const existing = store.q.ackFor.get(ctx.user.id, current.id);
    if (existing) return ctx.send(200, { receipt: receiptView(db.prepare(`${RECEIPT_SELECT} WHERE a.id = ?`).get(existing.id)), existing: true });
    const read = store.q.readEvent.get(ctx.user.id, current.id);
    if (!read?.reached_end_at) {
      ctx.audit("POLICY_ACK_REJECTED", `${policy.slug}: not read to the end`);
      return ctx.send(403, { message: "Read the policy to the end before acknowledging it." });
    }
    if (!attest) fail("Tick the box to confirm you have read and agree to comply with the policy.");
    if (normaliseName(typed) !== normaliseName(ctx.user.display_name)) fail("The name you typed does not match the name on your account.");
    // Version, statement and hash all come from the server's own record.
    const code = newReceiptCode();
    db.prepare(`INSERT INTO policy_acknowledgements (receipt_code,user_id,version_id,statement_text,typed_full_name,content_sha256,acknowledged_at,user_agent_family)
      VALUES (?,?,?,?,?,?,?,?)`).run(code, ctx.user.id, current.id, attestationStatement(policy.title, current.version_label), typed,
      current.content_sha256, new Date().toISOString(), userAgentFamily(ctx.request.headers["user-agent"]));
    ctx.audit("POLICY_ACKNOWLEDGED", `${policy.slug} v${current.version_label} receipt ${code}`);
    return ctx.send(201, { receipt: receiptView(db.prepare(`${RECEIPT_SELECT} WHERE a.receipt_code = ?`).get(code)), existing: false });
  });

  // Receipts are personal: the holder and admins only. Anyone else gets the same 404 as a
  // code that does not exist.
  route("GET", "/receipts/:code", (ctx) => {
    const code = String(ctx.params.code || "").toUpperCase();
    if (!RECEIPT_PATTERN.test(code)) return ctx.send(404, { message: "Receipt not found" });
    const row = db.prepare(`${RECEIPT_SELECT} WHERE a.receipt_code = ?`).get(code);
    if (!row || (row.user_id !== ctx.user.id && !isAdmin(ctx.user))) return ctx.send(404, { message: "Receipt not found" });
    return ctx.send(200, { receipt: receiptView(row) });
  });

  route("GET", "/me/acknowledgements", (ctx) => ctx.send(200, {
    acknowledgements: db.prepare(`${RECEIPT_SELECT} WHERE a.user_id = ? ORDER BY a.acknowledged_at DESC`).all(ctx.user.id).map(receiptView)
  }));

  // Data subject access: an employee can download everything recorded about their acknowledgements.
  route("GET", "/me/acknowledgements.csv", (ctx) => {
    const rows = db.prepare(`${RECEIPT_SELECT} WHERE a.user_id = ? ORDER BY a.acknowledged_at DESC`).all(ctx.user.id).map((row) => ({
      receipt_code: row.receipt_code, policy: row.title, version: row.version_label, acknowledged_at: row.acknowledged_at,
      statement: row.statement_text, typed_full_name: row.typed_full_name, content_sha256: row.content_sha256, browser: row.user_agent_family
    }));
    ctx.audit("POLICY_PERSONAL_EXPORT", `${rows.length} acknowledgements`);
    return foundation.sendCsv(ctx.response, rows, ["receipt_code", "policy", "version", "acknowledged_at", "statement", "typed_full_name", "content_sha256", "browser"], "my-policy-acknowledgements.csv");
  });

  route("POST", "/policies/:slug/questions", async (ctx) => {
    const body = await ctx.body();
    const policy = store.q.policyBySlug.get(slugValue(ctx.params.slug, "policy"));
    const current = store.currentVersion(policy);
    if (!current || !store.canRead(ctx.user, policy, current, isAdmin(ctx.user))) return ctx.send(404, { message: "Policy not found" });
    const question = text(body.question, "Question", { min: 10, max: 1000 });
    const { lastInsertRowid } = db.prepare("INSERT INTO policy_questions (version_id,asked_by,question,created_at) VALUES (?,?,?,?)")
      .run(current.id, ctx.user.id, question, new Date().toISOString());
    if (policy.owner_user_id && policy.owner_user_id !== ctx.user.id) {
      foundation.notify(policy.owner_user_id, "policy", `Question about ${policy.title}`, "An employee asked for clarification. Answer it in the questions queue.", "#/policies/admin/questions");
    }
    ctx.audit("POLICY_QUESTION_ASKED", `${policy.slug} question ${lastInsertRowid}`);
    return ctx.send(201, { id: Number(lastInsertRowid) });
  });

  route("POST", "/policies/:slug/exceptions", async (ctx) => {
    const body = await ctx.body();
    const policy = store.q.policyBySlug.get(slugValue(ctx.params.slug, "policy"));
    const current = store.currentVersion(policy);
    if (!current || !store.canRead(ctx.user, policy, current, isAdmin(ctx.user))) return ctx.send(404, { message: "Policy not found" });
    const justification = text(body.justification, "Justification", { min: 20, max: 2000 });
    if (db.prepare("SELECT 1 FROM policy_exceptions WHERE policy_id = ? AND requested_by = ? AND status = 'pending'").get(policy.id, ctx.user.id)) {
      return ctx.send(409, { message: "You already have a pending exception request for this policy." });
    }
    const { lastInsertRowid } = db.prepare("INSERT INTO policy_exceptions (policy_id,requested_by,justification,created_at) VALUES (?,?,?,?)")
      .run(policy.id, ctx.user.id, justification, new Date().toISOString());
    if (policy.owner_user_id && policy.owner_user_id !== ctx.user.id) {
      foundation.notify(policy.owner_user_id, "policy", `Exception requested: ${policy.title}`, "An employee asked for an exception. Review it in the exceptions queue.", "#/policies/admin/exceptions");
    }
    ctx.audit("POLICY_EXCEPTION_REQUESTED", `${policy.slug} exception ${lastInsertRowid}`);
    return ctx.send(201, { id: Number(lastInsertRowid) });
  });
}
