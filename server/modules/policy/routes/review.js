import { id as idValue, oneOf, text } from "../validate.js";

// Reviewers are the users recorded on a version's review list, whatever their role. That is
// how a non-IT manager can approve a policy alongside IT.
export default function registerReview({ route, store, foundation }) {
  const db = foundation.db;

  route("GET", "/reviews", (ctx) => {
    const rows = db.prepare(`SELECT r.id AS review_id, r.reviewer_group, r.decision, r.comment, r.decided_at,
        v.id AS version_id, v.version_label, v.status, v.change_summary, v.submitted_at, v.created_by,
        p.slug, p.title, p.category, u.display_name AS author
      FROM policy_reviews r JOIN policy_versions v ON v.id = r.version_id JOIN policies p ON p.id = v.policy_id
      LEFT JOIN users u ON u.id = v.created_by
      WHERE r.reviewer_user_id = ? ORDER BY CASE WHEN r.decision = 'pending' AND v.status = 'in_review' THEN 0 ELSE 1 END, v.submitted_at DESC LIMIT 200`).all(ctx.user.id);
    return ctx.send(200, {
      reviews: rows.map((row) => ({
        reviewId: row.review_id,
        group: row.reviewer_group,
        decision: row.decision,
        comment: row.comment,
        decidedAt: row.decided_at,
        actionable: row.decision === "pending" && row.status === "in_review",
        policy: { slug: row.slug, title: row.title, category: row.category },
        version: { id: row.version_id, label: row.version_label, status: row.status, changeSummary: row.change_summary, submittedAt: row.submitted_at, author: row.author },
        otherReviews: store.q.reviews.all(row.version_id).filter((review) => review.id !== row.review_id)
          .map((review) => ({ displayName: review.display_name, group: review.reviewer_group, decision: review.decision, comment: review.comment }))
      }))
    });
  });

  route("POST", "/reviews/:versionId/decision", async (ctx) => {
    const version = store.q.versionById.get(idValue(ctx.params.versionId, "version id"));
    if (!version) return ctx.send(404, { message: "Policy version not found" });
    const policy = store.q.policyById.get(version.policy_id);
    // Separation of duties: whoever wrote a version can never approve it.
    if (version.created_by === ctx.user.id) {
      ctx.audit("POLICY_SOD_BLOCKED", `${policy.slug} v${version.version_label}`);
      return ctx.send(403, { message: "You wrote this version, so you cannot review it (separation of duties)." });
    }
    const review = db.prepare("SELECT * FROM policy_reviews WHERE version_id = ? AND reviewer_user_id = ?").get(version.id, ctx.user.id);
    if (!review) return ctx.send(403, { message: "You are not a reviewer for this version." });
    if (version.status !== "in_review") return ctx.send(409, { message: "This version is not waiting for review." });
    if (review.decision !== "pending") return ctx.send(409, { message: "You have already recorded your decision." });
    const body = await ctx.body();
    const decision = oneOf(body.decision, "Decision", ["approved", "changes_requested"]);
    const comment = text(body.comment ?? "", "Comment", { min: decision === "changes_requested" ? 10 : 0, max: 2000, required: decision === "changes_requested" });
    const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    let outcome = "in_review";
    try {
      db.prepare("UPDATE policy_reviews SET decision = ?, comment = ?, decided_at = ? WHERE id = ?").run(decision, comment, now, review.id);
      if (decision === "changes_requested") {
        // Back to the author. Other reviewers will review the corrected text from scratch.
        outcome = "draft";
        db.prepare("UPDATE policy_versions SET status = 'draft', updated_at = ? WHERE id = ?").run(now, version.id);
      } else if (db.prepare("SELECT COUNT(*) AS n FROM policy_reviews WHERE version_id = ? AND decision <> 'approved'").get(version.id).n === 0) {
        outcome = "approved";
        db.prepare("UPDATE policy_versions SET status = 'approved', updated_at = ? WHERE id = ?").run(now, version.id);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    ctx.audit(decision === "approved" ? "POLICY_REVIEW_APPROVED" : "POLICY_REVIEW_CHANGES_REQUESTED", `${policy.slug} v${version.version_label} (${review.reviewer_group})`);
    if (version.created_by) {
      const title = outcome === "approved" ? `Ready to publish: ${policy.title} v${version.version_label}`
        : outcome === "draft" ? `Changes requested: ${policy.title} v${version.version_label}`
          : `Review recorded: ${policy.title} v${version.version_label}`;
      foundation.notify(version.created_by, "policy", title, `${ctx.user.display_name} (${review.reviewer_group}) ${decision === "approved" ? "approved" : "requested changes"}.${comment ? ` "${comment}"` : ""}`,
        `#/policies/admin/versions/${version.id}`);
    }
    return ctx.send(200, { decision, versionStatus: outcome });
  });
}
