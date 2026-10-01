import { policies, assignmentSeed } from "./content/index.js";
import { addDays, attestationStatement, newReceiptCode, sha256 } from "./store.js";

const DAY = 86_400_000;
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();

// Seeds each policy once, keyed by slug, so edits made through the app survive restarts.
// Published history (approvals, supersession) is recreated with realistic dates.
export function seedPolicies(db) {
  const userId = (username) => db.prepare("SELECT id FROM users WHERE username = ?").get(username)?.id ?? null;
  const author = userId("security.admin");
  const itReviewer = userId("system.admin");
  const mgmtReviewer = userId("manager.demo");
  const pendingReviewer = userId("manager.consulting") ?? mgmtReviewer;
  let seeded = 0;
  for (const policy of policies) {
    if (db.prepare("SELECT 1 FROM policies WHERE slug = ?").get(policy.slug)) continue;
    db.exec("BEGIN");
    try {
      const firstPublished = policy.versions[0].publishedDaysAgo ?? 7;
      const { lastInsertRowid: policyId } = db.prepare("INSERT INTO policies (slug,title,category,owner_user_id,visibility,created_at) VALUES (?,?,?,?,?,?)")
        .run(policy.slug, policy.title, policy.category, author, policy.visibility, daysAgo(firstPublished + 14));
      let previousId = null;
      for (const version of policy.versions) {
        const created = daysAgo((version.publishedDaysAgo ?? 3) + 10);
        const published = version.inReview ? null : daysAgo(version.publishedDaysAgo);
        const status = version.inReview ? "in_review" : "published";
        const { lastInsertRowid: versionId } = db.prepare(`INSERT INTO policy_versions
          (policy_id,version_label,status,summary,body_markdown,change_summary,requires_reacknowledgement,effective_date,next_review_date,content_sha256,created_by,created_at,updated_at,submitted_at,published_at,published_by)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(policyId, version.label, status, version.summary, version.body, version.changeSummary, version.requiresReack === false ? 0 : 1,
            published ? published.slice(0, 10) : null, addDays(policy.reviewDays), sha256(version.body), author, created, created,
            daysAgo((version.publishedDaysAgo ?? 3) + 5), published, published ? author : null);
        const reviewers = version.inReview
          ? [[itReviewer, "IT", "approved", "Technical controls are realistic for our device management tooling."], [pendingReviewer, "Management", "pending", ""]]
          : [[itReviewer, "IT", "approved", "Approved. Technically accurate and enforceable."], [mgmtReviewer, "Management", "approved", "Approved. Clear for non-technical staff."]];
        for (const [reviewer, group, decision, comment] of reviewers) {
          if (!reviewer) continue;
          db.prepare("INSERT OR IGNORE INTO policy_reviews (version_id,reviewer_user_id,reviewer_group,decision,comment,decided_at) VALUES (?,?,?,?,?,?)")
            .run(versionId, reviewer, group, decision, comment, decision === "pending" ? null : daysAgo((version.publishedDaysAgo ?? 3) + 2));
        }
        if (published) {
          if (previousId) db.prepare("UPDATE policy_versions SET status = 'superseded', superseded_at = ? WHERE id = ?").run(published, previousId);
          db.prepare("UPDATE policies SET current_version_id = ? WHERE id = ?").run(versionId, policyId);
          previousId = versionId;
        }
      }
      for (const entry of assignmentSeed.filter((item) => item.slug === policy.slug)) {
        // Assigned in the last few weeks so the demo shows a mix of pending and overdue work.
        const assignedAt = daysAgo(Math.min(firstPublished, entry.targetType === "department" ? 24 : 18));
        db.prepare(`INSERT OR IGNORE INTO policy_assignments (policy_id,target_type,target_value,due_in_days,due_date,assigned_by,created_at)
          VALUES (?,?,?,?,?,?,?)`).run(policyId, entry.targetType, entry.targetValue, entry.dueInDays, addDays(entry.dueInDays, new Date(assignedAt)), author, assignedAt);
      }
      db.exec("COMMIT");
      seeded += 1;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return seeded;
}

// Fictional acknowledgements, a question and an exception so the evidence and manager views
// have history on a fresh install. Applied once; disabled with SECUREAWARE_DEMO_DATA=off.
export function seedPolicyDemoActivity(db) {
  if (process.env.SECUREAWARE_DEMO_DATA === "off" || (process.env.NODE_ENV === "production" && process.env.SECUREAWARE_DEMO_DATA !== "on")) return;
  if (db.prepare("SELECT 1 FROM policy_meta WHERE key = 'demo:activity'").get()) return;
  const user = (username) => db.prepare("SELECT id, display_name FROM users WHERE username = ?").get(username);
  const version = (slug, label) => db.prepare(`SELECT v.*, p.title FROM policy_versions v JOIN policies p ON p.id = v.policy_id
    WHERE p.slug = ? AND v.version_label = ?`).get(slug, label);
  const ack = (username, slug, label, days, browser = "Chrome") => {
    const person = user(username);
    const target = version(slug, label);
    if (!person || !target) return;
    db.prepare(`INSERT OR IGNORE INTO policy_acknowledgements (receipt_code,user_id,version_id,statement_text,typed_full_name,content_sha256,acknowledged_at,user_agent_family)
      VALUES (?,?,?,?,?,?,?,?)`).run(newReceiptCode(), person.id, target.id, attestationStatement(target.title, label), person.display_name, target.content_sha256, daysAgo(days), browser);
    db.prepare("INSERT OR IGNORE INTO policy_read_events (user_id,version_id,first_opened_at,reached_end_at,seconds_open) VALUES (?,?,?,?,?)")
      .run(person.id, target.id, daysAgo(days), daysAgo(days), 240 + days);
  };
  db.exec("BEGIN");
  try {
    // employee.demo acknowledged AUP 1.0, so 1.1 shows "Needs re-acknowledgement".
    ack("employee.demo", "acceptable-use", "1.0", 150);
    ack("employee.demo", "information-security-policy", "1.0", 100);
    ack("manager.demo", "acceptable-use", "1.1", 6, "Edge");
    ack("manager.demo", "information-security-policy", "1.0", 90, "Edge");
    ack("manager.demo", "password-authentication", "1.0", 60, "Edge");
    ack("manager.demo", "incident-reporting", "1.0", 70, "Edge");
    ack("consultant.demo", "acceptable-use", "1.1", 4, "Firefox");
    ack("consultant.demo", "information-security-policy", "1.0", 80, "Firefox");
    ack("consultant.demo", "password-authentication", "1.0", 50, "Firefox");
    ack("consultant.demo", "data-classification", "1.0", 30, "Firefox");
    ack("dev.demo", "acceptable-use", "1.0", 120);
    ack("dev.demo", "incident-reporting", "1.0", 75);
    ack("manager.consulting", "acceptable-use", "1.1", 3, "Safari");
    ack("manager.consulting", "remote-hybrid-work", "1.0", 120, "Safari");
    const asker = user("consultant.demo");
    const aup = version("acceptable-use", "1.1");
    if (asker && aup) {
      db.prepare("INSERT INTO policy_questions (version_id,asked_by,question,answer,answered_by,created_at,answered_at) VALUES (?,?,?,?,?,?,?)")
        .run(aup.id, asker.id, "Can I use the AI meeting-notes feature in our video calls with clients?",
          "Only if the client agrees and the tool is on IT's approved list for Confidential information. Ask IT before switching it on.",
          user("security.admin")?.id ?? null, daysAgo(5), daysAgo(4));
    }
    const developer = user("dev.demo");
    const remote = db.prepare("SELECT id FROM policies WHERE slug = 'remote-hybrid-work'").get();
    if (developer && remote) {
      db.prepare("INSERT INTO policy_exceptions (policy_id,requested_by,justification,status,created_at) VALUES (?,?,?,'pending',?)")
        .run(remote.id, developer.id, "Client site in Kandy blocks our VPN. I need to use the client's guest network for two weeks while the firewall rule is approved.", daysAgo(1));
    }
    db.prepare("INSERT OR IGNORE INTO policy_meta (key, value) VALUES ('demo:activity', ?)").run(new Date().toISOString());
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
