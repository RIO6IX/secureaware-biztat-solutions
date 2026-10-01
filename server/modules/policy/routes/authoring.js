import { ADMIN_ROLES, CATEGORIES, REVIEWER_GROUPS, VISIBILITY } from "../schema.js";
import { addDays, readingMinutes, sha256, today } from "../store.js";
import { lineDiff } from "../diff.js";
import { bool, compareVersions, fail, id as idValue, isoDate, oneOf, queryText, slug as slugValue, text, versionLabel } from "../validate.js";

const admin = { roles: ADMIN_ROLES };
const BODY_LIMIT = 256 * 1024;
const EDITABLE = ["draft"];

export function suggestLabels(label) {
  const [major, minor] = label.split(".").map(Number);
  return { minor: `${major}.${minor + 1}`, major: `${major + 1}.0` };
}

export default function registerAuthoring({ route, store, foundation }) {
  const db = foundation.db;
  const userName = (id) => (id ? store.q.userById.get(id)?.display_name : null) || "—";

  function reviewsView(versionId) {
    return store.q.reviews.all(versionId).map((row) => ({
      id: row.id, reviewer: { id: row.reviewer_user_id, displayName: row.display_name, department: row.department },
      group: row.reviewer_group, decision: row.decision, comment: row.comment, decidedAt: row.decided_at
    }));
  }

  function versionView(version) {
    return {
      id: version.id,
      label: version.version_label,
      status: version.status,
      summary: version.summary,
      bodyMarkdown: version.body_markdown,
      changeSummary: version.change_summary,
      requiresReacknowledgement: Boolean(version.requires_reacknowledgement),
      effectiveDate: version.effective_date,
      nextReviewDate: version.next_review_date,
      contentSha256: version.content_sha256,
      createdBy: userName(version.created_by),
      createdById: version.created_by,
      createdAt: version.created_at,
      updatedAt: version.updated_at,
      submittedAt: version.submitted_at,
      publishedAt: version.published_at,
      publishedBy: version.published_by ? userName(version.published_by) : null,
      supersededAt: version.superseded_at,
      reviews: reviewsView(version.id)
    };
  }

  function policyOr404(ctx) {
    const policy = store.q.policyBySlug.get(slugValue(ctx.params.slug, "policy"));
    if (!policy) ctx.send(404, { message: "Policy not found" });
    return policy;
  }

  function versionOr404(ctx) {
    const version = store.q.versionById.get(idValue(ctx.params.id, "version id"));
    if (!version) ctx.send(404, { message: "Policy version not found" });
    return version;
  }

  function optionalDate(value, name) {
    return value === undefined || value === null || value === "" ? null : isoDate(value, name);
  }

  function ownerId(value) {
    if (value === undefined || value === null || value === "") return null;
    const owner = store.q.userById.get(idValue(value, "Owner"));
    if (!owner || !ADMIN_ROLES.includes(owner.role)) fail("The owner must be a Security/HR Admin or System Admin");
    return owner.id;
  }

  // Library: every policy with its current version, newest draft, acknowledgement rate and review date.
  route("GET", "/admin/policies", (ctx) => {
    const rows = store.q.allPolicies.all().map((policy) => {
      const current = store.currentVersion(policy);
      const versions = store.q.versions.all(policy.id);
      const working = versions.filter((version) => ["draft", "in_review", "approved"].includes(version.status)).at(-1) || null;
      const recipients = current ? store.recipientsOf(policy) : [];
      const complete = recipients.filter((user) => store.statusFor(user, policy)?.status === "complete").length;
      return {
        id: policy.id,
        slug: policy.slug,
        title: policy.title,
        category: policy.category,
        visibility: policy.visibility,
        owner: userName(policy.owner_user_id),
        ownerId: policy.owner_user_id,
        archived: Boolean(policy.archived_at),
        current: current ? { id: current.id, label: current.version_label, publishedAt: current.published_at, nextReviewDate: current.next_review_date, readingMinutes: readingMinutes(current.body_markdown) } : null,
        working: working ? { id: working.id, label: working.version_label, status: working.status } : null,
        status: policy.archived_at ? "archived" : current ? "published" : working?.status || "draft",
        recipients: recipients.length,
        acknowledged: complete,
        ackRate: recipients.length ? Math.round((complete / recipients.length) * 100) : null,
        nextReviewDate: current?.next_review_date || working && store.q.versionById.get(working.id).next_review_date || null
      };
    });
    return ctx.send(200, {
      policies: rows,
      categories: CATEGORIES,
      owners: db.prepare("SELECT id, display_name FROM users WHERE active = 1 AND role IN ('Security/HR Admin','System Admin') ORDER BY display_name").all()
        .map((row) => ({ id: row.id, displayName: row.display_name }))
    });
  }, admin);

  route("POST", "/admin/policies", async (ctx) => {
    const body = await ctx.body();
    const title = text(body.title, "Title", { min: 4, max: 120 });
    const slug = slugValue(body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60), "Slug");
    if (["admin", "team", "reviews", "research", "receipts", "my"].includes(slug)) fail("That slug is reserved. Choose another.");
    if (store.q.policyBySlug.get(slug)) return ctx.send(409, { message: "A policy with that slug already exists" });
    const category = oneOf(body.category, "Category", CATEGORIES);
    const visibility = oneOf(body.visibility ?? "assigned", "Visibility", VISIBILITY);
    const owner = ownerId(body.ownerId) ?? ctx.user.id;
    const summary = text(body.summary, "Summary", { min: 10, max: 400 });
    const markdown = text(body.bodyMarkdown, "Policy text", { min: 50, max: 100_000 });
    const label = body.versionLabel === undefined ? "1.0" : versionLabel(body.versionLabel);
    const effectiveDate = optionalDate(body.effectiveDate, "Effective date");
    const nextReviewDate = optionalDate(body.nextReviewDate, "Next review date") || addDays(365);
    const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    let versionId;
    try {
      const { lastInsertRowid: policyId } = db.prepare("INSERT INTO policies (slug,title,category,owner_user_id,visibility,created_at) VALUES (?,?,?,?,?,?)")
        .run(slug, title, category, owner, visibility, now);
      versionId = Number(db.prepare(`INSERT INTO policy_versions (policy_id,version_label,status,summary,body_markdown,change_summary,requires_reacknowledgement,effective_date,next_review_date,content_sha256,created_by,created_at,updated_at)
        VALUES (?,?,'draft',?,?,'First version.',1,?,?,?,?,?,?)`).run(policyId, label, summary, markdown, effectiveDate, nextReviewDate, sha256(markdown), ctx.user.id, now, now).lastInsertRowid);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    ctx.audit("POLICY_CREATED", `${slug} v${label} (draft)`);
    return ctx.send(201, { slug, version: versionView(store.q.versionById.get(versionId)) });
  }, { ...admin, bodyLimit: BODY_LIMIT });

  route("GET", "/admin/versions/:id", (ctx) => {
    const version = versionOr404(ctx);
    if (!version) return;
    const policy = store.q.policyById.get(version.policy_id);
    return ctx.send(200, {
      policy: { id: policy.id, slug: policy.slug, title: policy.title, category: policy.category, visibility: policy.visibility, ownerId: policy.owner_user_id, owner: userName(policy.owner_user_id) },
      version: versionView(version),
      editable: EDITABLE.includes(version.status),
      categories: CATEGORIES,
      reviewerGroups: REVIEWER_GROUPS,
      candidates: store.q.activeUsers.all().filter((user) => user.id !== version.created_by)
        .map((user) => ({ id: user.id, displayName: user.display_name, role: user.role, department: user.department }))
    });
  }, admin);

  // Only drafts can change. A published (or superseded, archived, in-review, approved) version
  // is evidence that people may have acknowledged, so its text is fixed: 409 and a pointer to
  // "Create new version".
  route("PUT", "/admin/versions/:id", async (ctx) => {
    const version = versionOr404(ctx);
    if (!version) return;
    if (!EDITABLE.includes(version.status)) {
      ctx.audit("POLICY_EDIT_BLOCKED", `version ${version.id} is ${version.status}`);
      return ctx.send(409, {
        message: version.status === "in_review" || version.status === "approved"
          ? "This version is in review. Ask a reviewer to request changes before editing it."
          : "Published and retired versions cannot be changed. Use Create new version instead.",
        action: "create_new_version"
      });
    }
    const body = await ctx.body();
    const policy = store.q.policyById.get(version.policy_id);
    const summary = text(body.summary, "Summary", { min: 10, max: 400 });
    const markdown = text(body.bodyMarkdown, "Policy text", { min: 50, max: 100_000 });
    const changeSummary = text(body.changeSummary ?? version.change_summary, "Change summary", { min: 5, max: 1000 });
    const requiresReack = body.requiresReacknowledgement === undefined ? Boolean(version.requires_reacknowledgement) : bool(body.requiresReacknowledgement, "Re-acknowledgement");
    const effectiveDate = optionalDate(body.effectiveDate, "Effective date");
    const nextReviewDate = optionalDate(body.nextReviewDate, "Next review date") || version.next_review_date;
    db.prepare(`UPDATE policy_versions SET summary = ?, body_markdown = ?, change_summary = ?, requires_reacknowledgement = ?, effective_date = ?, next_review_date = ?,
      content_sha256 = ?, updated_at = ? WHERE id = ? AND status = 'draft'`)
      .run(summary, markdown, changeSummary, requiresReack ? 1 : 0, effectiveDate, nextReviewDate, sha256(markdown), new Date().toISOString(), version.id);
    // Policy-level fields can change only while the policy has never been published.
    if (!policy.current_version_id) {
      const category = body.category === undefined ? policy.category : oneOf(body.category, "Category", CATEGORIES);
      const visibility = body.visibility === undefined ? policy.visibility : oneOf(body.visibility, "Visibility", VISIBILITY);
      const owner = ownerId(body.ownerId) ?? policy.owner_user_id;
      db.prepare("UPDATE policies SET category = ?, visibility = ?, owner_user_id = ? WHERE id = ?").run(category, visibility, owner, policy.id);
    }
    ctx.audit("POLICY_DRAFT_EDITED", `${policy.slug} v${version.version_label}`);
    return ctx.send(200, { version: versionView(store.q.versionById.get(version.id)) });
  }, { ...admin, bodyLimit: BODY_LIMIT });

  // Create new version: copies the current published text into a new draft.
  route("POST", "/admin/policies/:slug/versions", async (ctx) => {
    const policy = policyOr404(ctx);
    if (!policy) return;
    if (policy.archived_at) return ctx.send(409, { message: "This policy is archived" });
    const current = store.currentVersion(policy);
    if (!current) return ctx.send(409, { message: "Publish the first version before creating a new one" });
    const open = store.q.versions.all(policy.id).find((version) => ["draft", "in_review", "approved"].includes(version.status));
    if (open) return ctx.send(409, { message: `Version ${open.version_label} is already being prepared. Finish or publish it first.`, versionId: open.id });
    const body = await ctx.body();
    const label = versionLabel(body.versionLabel);
    if (compareVersions(label, current.version_label) <= 0) fail(`The new version must be higher than ${current.version_label}`);
    if (store.q.versionByLabel.get(policy.id, label)) fail("That version number already exists");
    const changeSummary = text(body.changeSummary, "Change summary", { min: 10, max: 1000 });
    const requiresReack = bool(body.requiresReacknowledgement, "Re-acknowledgement");
    const now = new Date().toISOString();
    const { lastInsertRowid } = db.prepare(`INSERT INTO policy_versions (policy_id,version_label,status,summary,body_markdown,change_summary,requires_reacknowledgement,effective_date,next_review_date,content_sha256,created_by,created_at,updated_at)
      VALUES (?,?,'draft',?,?,?,?,NULL,?,?,?,?,?)`)
      .run(policy.id, label, current.summary, current.body_markdown, changeSummary, requiresReack ? 1 : 0, addDays(365), current.content_sha256, ctx.user.id, now, now);
    ctx.audit("POLICY_VERSION_CREATED", `${policy.slug} v${label} from v${current.version_label}`);
    return ctx.send(201, { version: versionView(store.q.versionById.get(Number(lastInsertRowid))) });
  }, admin);

  // Submit for review: at least two reviewers from at least two different groups, never the
  // author. This is how IT and non-IT staff both sign off a policy.
  route("POST", "/admin/versions/:id/submit", async (ctx) => {
    const version = versionOr404(ctx);
    if (!version) return;
    if (version.status !== "draft") return ctx.send(409, { message: "Only a draft can be submitted for review" });
    const body = await ctx.body();
    if (!Array.isArray(body.reviewers) || body.reviewers.length < 2 || body.reviewers.length > 6) fail("Choose between two and six reviewers");
    const reviewers = body.reviewers.map((entry, index) => {
      if (!entry || typeof entry !== "object") fail(`Reviewer ${index + 1} is invalid`);
      const reviewer = store.q.userById.get(idValue(entry.userId, "Reviewer"));
      if (!reviewer) fail("A reviewer was not found");
      if (reviewer.id === version.created_by) fail("The author cannot review their own version (separation of duties)");
      return { reviewer, group: oneOf(entry.group, "Reviewer group", REVIEWER_GROUPS) };
    });
    if (new Set(reviewers.map((entry) => entry.reviewer.id)).size !== reviewers.length) fail("Each reviewer can be chosen once");
    if (new Set(reviewers.map((entry) => entry.group)).size < 2) fail("Choose reviewers from at least two groups, for example IT and HR or Management");
    const policy = store.q.policyById.get(version.policy_id);
    const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("DELETE FROM policy_reviews WHERE version_id = ?").run(version.id);
      for (const entry of reviewers) {
        db.prepare("INSERT INTO policy_reviews (version_id,reviewer_user_id,reviewer_group) VALUES (?,?,?)").run(version.id, entry.reviewer.id, entry.group);
      }
      db.prepare("UPDATE policy_versions SET status = 'in_review', submitted_at = ?, updated_at = ? WHERE id = ?").run(now, now, version.id);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    for (const entry of reviewers) {
      foundation.notify(entry.reviewer.id, "policy", `Review requested: ${policy.title} v${version.version_label}`,
        `${ctx.user.display_name} asked you to review this policy as the ${entry.group} reviewer.`, "#/policies/reviews");
    }
    ctx.audit("POLICY_SUBMITTED_FOR_REVIEW", `${policy.slug} v${version.version_label} to ${reviewers.map((entry) => `${entry.group}:${entry.reviewer.id}`).join(", ")}`);
    return ctx.send(200, { version: versionView(store.q.versionById.get(version.id)) });
  }, admin);

  route("POST", "/admin/versions/:id/publish", (ctx) => {
    const version = versionOr404(ctx);
    if (!version) return;
    const policy = store.q.policyById.get(version.policy_id);
    if (policy.archived_at) return ctx.send(409, { message: "This policy is archived" });
    const reviews = store.q.reviews.all(version.id);
    const allApproved = reviews.length >= 2 && reviews.every((review) => review.decision === "approved");
    if (version.status !== "approved" || !allApproved) {
      ctx.audit("POLICY_PUBLISH_BLOCKED", `${policy.slug} v${version.version_label}: ${version.status}`);
      return ctx.send(409, { message: "Every reviewer must approve this version before it can be published" });
    }
    const previous = store.currentVersion(policy);
    const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      if (previous) db.prepare("UPDATE policy_versions SET status = 'superseded', superseded_at = ?, updated_at = ? WHERE id = ?").run(now, now, previous.id);
      db.prepare("UPDATE policy_versions SET status = 'published', published_at = ?, published_by = ?, effective_date = COALESCE(effective_date, ?), updated_at = ? WHERE id = ?")
        .run(now, ctx.user.id, today(), now, version.id);
      db.prepare("UPDATE policies SET current_version_id = ? WHERE id = ?").run(version.id, policy.id);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    if (previous) ctx.audit("POLICY_VERSION_SUPERSEDED", `${policy.slug} v${previous.version_label}`);
    ctx.audit("POLICY_PUBLISHED", `${policy.slug} v${version.version_label}`);
    const recipients = store.recipientsOf(policy);
    const reack = previous && version.requires_reacknowledgement;
    for (const user of recipients) {
      foundation.notify(user.id, "policy", reack ? `Please acknowledge again: ${policy.title} v${version.version_label}` : `Policy updated: ${policy.title} v${version.version_label}`,
        reack ? `A new version has been published. Read what changed and acknowledge it.` : `A new version has been published.`, `#/policies/${policy.slug}`);
    }
    if (version.created_by && version.created_by !== ctx.user.id) {
      foundation.notify(version.created_by, "policy", `Published: ${policy.title} v${version.version_label}`, "Your version is now live.", `#/policies/${policy.slug}`);
    }
    return ctx.send(200, { version: versionView(store.q.versionById.get(version.id)), notified: recipients.length, reacknowledgementRequired: Boolean(reack) });
  }, admin);

  route("POST", "/admin/policies/:slug/archive", (ctx) => {
    const policy = policyOr404(ctx);
    if (!policy) return;
    if (policy.archived_at) return ctx.send(409, { message: "This policy is already archived" });
    const now = new Date().toISOString();
    db.prepare("UPDATE policy_versions SET status = 'archived', superseded_at = COALESCE(superseded_at, ?), updated_at = ? WHERE policy_id = ? AND status IN ('published','draft','in_review','approved')")
      .run(now, now, policy.id);
    db.prepare("UPDATE policies SET archived_at = ? WHERE id = ?").run(now, policy.id);
    ctx.audit("POLICY_ARCHIVED", policy.slug);
    return ctx.send(200, { ok: true });
  }, admin);

  // Version history timeline with authors, reviewers and dates.
  route("GET", "/admin/policies/:slug/history", (ctx) => {
    const policy = policyOr404(ctx);
    if (!policy) return;
    const versions = store.q.versions.all(policy.id).sort((a, b) => compareVersions(b.version_label, a.version_label));
    const current = store.currentVersion(policy);
    return ctx.send(200, {
      policy: { id: policy.id, slug: policy.slug, title: policy.title, category: policy.category, owner: userName(policy.owner_user_id), archived: Boolean(policy.archived_at) },
      currentVersionId: current?.id ?? null,
      suggestions: current ? suggestLabels(current.version_label) : null,
      versions: versions.map((version) => ({ ...versionView(version), bodyMarkdown: undefined, acknowledgements: store.q.ackCountForVersion.get(version.id).n }))
    });
  }, admin);

  route("GET", "/admin/policies/:slug/compare", (ctx) => {
    const policy = policyOr404(ctx);
    if (!policy) return;
    const from = store.q.versionByLabel.get(policy.id, versionLabel(queryText(ctx.query, "from", 8) || "", "from"));
    const to = store.q.versionByLabel.get(policy.id, versionLabel(queryText(ctx.query, "to", 8) || "", "to"));
    if (!from || !to) return ctx.send(404, { message: "Version not found" });
    const diff = lineDiff(from.body_markdown, to.body_markdown);
    return ctx.send(200, {
      policy: { slug: policy.slug, title: policy.title },
      from: { label: from.version_label, status: from.status, contentSha256: from.content_sha256 },
      to: { label: to.version_label, status: to.status, contentSha256: to.content_sha256, changeSummary: to.change_summary },
      versions: store.q.versions.all(policy.id).map((version) => version.version_label).sort(compareVersions),
      ...diff
    });
  }, admin);
}
