import { ADMIN_ROLES } from "../schema.js";
import { today } from "../store.js";
import { fail, id as idValue, isoDate, oneOf, queryText, text } from "../validate.js";

const MAX_EXCEPTION_DAYS = 365;

export default function registerQueues({ route, foundation }) {
  const db = foundation.db;
  const admin = { roles: ADMIN_ROLES };

  route("GET", "/admin/questions", (ctx) => {
    const state = queryText(ctx.query, "state") || "open";
    oneOf(state, "state", ["open", "answered", "all"]);
    const rows = db.prepare(`SELECT q.*, v.version_label, p.slug, p.title, u.display_name AS asker, u.department, a.display_name AS answerer
      FROM policy_questions q JOIN policy_versions v ON v.id = q.version_id JOIN policies p ON p.id = v.policy_id
      LEFT JOIN users u ON u.id = q.asked_by LEFT JOIN users a ON a.id = q.answered_by
      WHERE (? = 'all' OR (? = 'open' AND q.answer IS NULL) OR (? = 'answered' AND q.answer IS NOT NULL))
      ORDER BY q.created_at DESC LIMIT 300`).all(state, state, state);
    return ctx.send(200, {
      questions: rows.map((row) => ({
        id: row.id, question: row.question, answer: row.answer, createdAt: row.created_at, answeredAt: row.answered_at,
        askedBy: row.asker || "Former user", department: row.department, answeredBy: row.answerer,
        policy: { slug: row.slug, title: row.title }, versionLabel: row.version_label
      }))
    });
  }, admin);

  route("POST", "/admin/questions/:id/answer", async (ctx) => {
    const question = db.prepare("SELECT q.*, p.slug, p.title FROM policy_questions q JOIN policy_versions v ON v.id = q.version_id JOIN policies p ON p.id = v.policy_id WHERE q.id = ?")
      .get(idValue(ctx.params.id, "question id"));
    if (!question) return ctx.send(404, { message: "Question not found" });
    const body = await ctx.body();
    const answer = text(body.answer, "Answer", { min: 5, max: 2000 });
    db.prepare("UPDATE policy_questions SET answer = ?, answered_by = ?, answered_at = ? WHERE id = ?").run(answer, ctx.user.id, new Date().toISOString(), question.id);
    if (question.asked_by) foundation.notify(question.asked_by, "policy", `Answer: ${question.title}`, "Your question about this policy has been answered.", `#/policies/${question.slug}`);
    ctx.audit("POLICY_QUESTION_ANSWERED", `${question.slug} question ${question.id}`);
    return ctx.send(200, { ok: true });
  }, admin);

  route("GET", "/admin/exceptions", (ctx) => {
    const rows = db.prepare(`SELECT e.*, p.slug, p.title, u.display_name AS requester, u.department, d.display_name AS decider
      FROM policy_exceptions e JOIN policies p ON p.id = e.policy_id LEFT JOIN users u ON u.id = e.requested_by LEFT JOIN users d ON d.id = e.decided_by
      ORDER BY CASE e.status WHEN 'pending' THEN 0 ELSE 1 END, e.created_at DESC LIMIT 300`).all();
    return ctx.send(200, {
      exceptions: rows.map((row) => ({
        id: row.id, justification: row.justification, status: row.status, decisionNote: row.decision_note, expiresAt: row.expires_at,
        createdAt: row.created_at, decidedAt: row.decided_at, requestedBy: row.requester || "Former user", department: row.department,
        decidedBy: row.decider, policy: { slug: row.slug, title: row.title },
        active: row.status === "approved" && row.expires_at > new Date().toISOString()
      }))
    });
  }, admin);

  route("POST", "/admin/exceptions/:id/decision", async (ctx) => {
    const exception = db.prepare("SELECT e.*, p.slug, p.title FROM policy_exceptions e JOIN policies p ON p.id = e.policy_id WHERE e.id = ?")
      .get(idValue(ctx.params.id, "exception id"));
    if (!exception) return ctx.send(404, { message: "Exception request not found" });
    if (exception.status !== "pending") return ctx.send(409, { message: "This request has already been decided" });
    if (exception.requested_by === ctx.user.id) return ctx.send(403, { message: "You cannot decide your own exception request (separation of duties)." });
    const body = await ctx.body();
    const decision = oneOf(body.decision, "Decision", ["approved", "rejected"]);
    const note = text(body.note, "Decision note", { min: 5, max: 1000 });
    let expiresAt = null;
    if (decision === "approved") {
      const date = isoDate(body.expiresOn, "Expiry date");
      const latest = new Date(Date.now() + MAX_EXCEPTION_DAYS * 86_400_000).toISOString().slice(0, 10);
      if (date <= today() || date > latest) fail(`The expiry date must be after today and within ${MAX_EXCEPTION_DAYS} days`);
      expiresAt = `${date}T23:59:59.000Z`;
    }
    db.prepare("UPDATE policy_exceptions SET status = ?, decided_by = ?, decision_note = ?, expires_at = ?, decided_at = ? WHERE id = ?")
      .run(decision, ctx.user.id, note, expiresAt, new Date().toISOString(), exception.id);
    if (exception.requested_by) {
      foundation.notify(exception.requested_by, "policy", `Exception ${decision}: ${exception.title}`,
        decision === "approved" ? `Approved until ${expiresAt.slice(0, 10)}. ${note}` : note, `#/policies/${exception.slug}`);
    }
    ctx.audit(decision === "approved" ? "POLICY_EXCEPTION_APPROVED" : "POLICY_EXCEPTION_REJECTED", `${exception.slug} exception ${exception.id}${expiresAt ? ` until ${expiresAt.slice(0, 10)}` : ""}`);
    return ctx.send(200, { ok: true });
  }, admin);
}
