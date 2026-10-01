// Read-side queries and the compliance status calculation for the policy module.
import crypto from "node:crypto";

export const STATUS_VALUES = ["complete", "pending", "overdue", "needs_reack", "exempt", "optional"];
const WORDS_PER_MINUTE = 200;

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(days, from = new Date()) {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function sha256(text) {
  return crypto.createHash("sha256").update(String(text), "utf8").digest("hex");
}

export function wordCount(text) {
  return String(text || "").split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(text) {
  return Math.max(1, Math.round(wordCount(text) / WORDS_PER_MINUTE));
}

// The server will not accept "reached the end" sooner than this. It is roughly a third of
// the normal reading time (skimming speed), between 15 seconds and 3 minutes.
// POLICY_MIN_READ_SCALE=0 switches it off for automated tests.
export function minReadSeconds(text) {
  const scale = Number(process.env.POLICY_MIN_READ_SCALE ?? 1);
  const seconds = Math.min(180, Math.max(15, Math.round((wordCount(text) / WORDS_PER_MINUTE) * 60 * 0.33)));
  return Math.max(0, Math.round(seconds * (Number.isFinite(scale) ? scale : 1)));
}

// The statement is built on the server from its own record, so the browser cannot change
// what the employee is recorded as agreeing to.
export function attestationStatement(policyTitle, versionLabel) {
  return `I have read, understood and agree to comply with ${policyTitle} version ${versionLabel}.`;
}

const RECEIPT_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function newReceiptCode() {
  const bytes = crypto.randomBytes(10);
  let output = "";
  let value = 0;
  let bits = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += RECEIPT_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return `PA-${output.match(/.{4}/g).join("-")}`;
}
export const RECEIPT_PATTERN = /^PA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

// Browser family only. The raw user-agent string and the IP address are not stored.
export function userAgentFamily(header) {
  const ua = String(header || "");
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  if (/node|undici/i.test(ua)) return "Automated client";
  return "Other";
}

export function createStore(db) {
  const q = {
    policyBySlug: db.prepare("SELECT * FROM policies WHERE slug = ?"),
    policyById: db.prepare("SELECT * FROM policies WHERE id = ?"),
    allPolicies: db.prepare("SELECT * FROM policies ORDER BY title"),
    liveCurrent: db.prepare(`SELECT p.*, v.id AS v_id FROM policies p JOIN policy_versions v ON v.id = p.current_version_id
      WHERE p.archived_at IS NULL AND v.status = 'published' ORDER BY p.title`),
    versionById: db.prepare("SELECT * FROM policy_versions WHERE id = ?"),
    versionByLabel: db.prepare("SELECT * FROM policy_versions WHERE policy_id = ? AND version_label = ?"),
    versions: db.prepare("SELECT * FROM policy_versions WHERE policy_id = ? ORDER BY id"),
    publishedVersions: db.prepare("SELECT * FROM policy_versions WHERE policy_id = ? AND published_at IS NOT NULL ORDER BY published_at, id"),
    reviews: db.prepare(`SELECT r.*, u.display_name, u.department FROM policy_reviews r JOIN users u ON u.id = r.reviewer_user_id
      WHERE r.version_id = ? ORDER BY r.id`),
    userById: db.prepare("SELECT id, username, display_name, role, department, created_at FROM users WHERE id = ? AND active = 1"),
    activeUsers: db.prepare("SELECT id, username, display_name, role, department, created_at FROM users WHERE active = 1 ORDER BY display_name"),
    userAssignments: db.prepare(`SELECT * FROM policy_assignments
      WHERE (target_type = 'department' AND target_value = ?) OR (target_type = 'role' AND target_value = ?) OR (target_type = 'user' AND target_value = ?)`),
    assignmentsForPolicy: db.prepare("SELECT * FROM policy_assignments WHERE policy_id = ? ORDER BY created_at"),
    userAcks: db.prepare(`SELECT a.*, v.policy_id, v.version_label, v.published_at FROM policy_acknowledgements a
      JOIN policy_versions v ON v.id = a.version_id WHERE a.user_id = ?`),
    ackFor: db.prepare("SELECT * FROM policy_acknowledgements WHERE user_id = ? AND version_id = ?"),
    readEvent: db.prepare("SELECT * FROM policy_read_events WHERE user_id = ? AND version_id = ?"),
    activeException: db.prepare(`SELECT * FROM policy_exceptions WHERE policy_id = ? AND requested_by = ? AND status = 'approved' AND expires_at > ?
      ORDER BY expires_at DESC LIMIT 1`),
    ackCountForVersion: db.prepare("SELECT COUNT(*) AS n FROM policy_acknowledgements WHERE version_id = ?")
  };

  function assignmentsFor(user) {
    return q.userAssignments.all(user.department, user.role, String(user.id));
  }

  function matchesAssignment(user, assignment) {
    if (assignment.target_type === "department") return user.department === assignment.target_value;
    if (assignment.target_type === "role") return user.role === assignment.target_value;
    return String(user.id) === assignment.target_value;
  }

  function currentVersion(policy) {
    if (!policy?.current_version_id || policy.archived_at) return null;
    const version = q.versionById.get(policy.current_version_id);
    return version?.status === "published" ? version : null;
  }

  // The most recent published version that required everyone to acknowledge again. An
  // acknowledgement of this version or anything published after it still counts.
  function reackBaseline(policy, current) {
    const published = q.publishedVersions.all(policy.id).filter((version) => version.published_at <= current.published_at);
    let baseline = published[0] || current;
    for (const version of published) if (version.requires_reacknowledgement) baseline = version;
    return baseline;
  }

  // Compliance status for one user and one policy. Pure data in, plain object out, so the
  // same rule drives the inbox, the manager view, the evidence report and the tests.
  function statusFor(user, policy, { assignments = assignmentsFor(user), acks = q.userAcks.all(user.id), now = new Date() } = {}) {
    const current = currentVersion(policy);
    if (!current) return null;
    const matching = assignments.filter((assignment) => assignment.policy_id === policy.id);
    const assigned = matching.length > 0;
    if (!assigned && policy.visibility !== "all") return null;
    const baseline = reackBaseline(policy, current);
    const policyAcks = acks.filter((ack) => ack.policy_id === policy.id);
    const currentAck = policyAcks.find((ack) => ack.version_id === current.id) || null;
    const validAck = currentAck || policyAcks
      .filter((ack) => ack.published_at && ack.published_at >= baseline.published_at)
      .sort((x, y) => y.acknowledged_at.localeCompare(x.acknowledged_at))[0] || null;
    const olderAck = !validAck && policyAcks.length > 0;
    let dueDate = assigned ? matching.map((assignment) => assignment.due_date).sort()[0] : null;
    if (assigned && olderAck) {
      const reackDue = addDays(Math.min(...matching.map((assignment) => assignment.due_in_days)), new Date(baseline.published_at));
      if (reackDue > dueDate) dueDate = reackDue;
    }
    const exception = q.activeException.get(policy.id, user.id, now.toISOString()) || null;
    let status;
    if (validAck) status = "complete";
    else if (exception) status = "exempt";
    else if (!assigned) status = "optional";
    else if (dueDate < now.toISOString().slice(0, 10)) status = "overdue";
    else if (olderAck) status = "needs_reack";
    else status = "pending";
    return {
      assigned,
      status,
      needsReacknowledgement: olderAck,
      dueDate,
      currentVersionId: current.id,
      versionLabel: current.version_label,
      acknowledgement: validAck ? { receiptCode: validAck.receipt_code, versionLabel: validAck.version_label, acknowledgedAt: validAck.acknowledged_at } : null,
      exceptionExpiresAt: exception?.expires_at ?? null
    };
  }

  // Every live policy relevant to the user (assigned, or published to everyone) with status.
  function inbox(user) {
    const assignments = assignmentsFor(user);
    const acks = q.userAcks.all(user.id);
    return q.liveCurrent.all()
      .map((policy) => ({ policy, state: statusFor(user, policy, { assignments, acks }) }))
      .filter((entry) => entry.state);
  }

  // Assigned policies only: what compliance reporting counts.
  function assignedStates(user) {
    return inbox(user).filter((entry) => entry.state.assigned);
  }

  // Can this user read this version? Admins can read everything; reviewers can read the
  // versions they review; everyone else only the current published version of a policy
  // that is assigned to them or visible to all.
  function canRead(user, policy, version, isAdmin) {
    if (!policy || !version || version.policy_id !== policy.id) return false;
    if (isAdmin) return true;
    if (db.prepare("SELECT 1 FROM policy_reviews WHERE version_id = ? AND reviewer_user_id = ?").get(version.id, user.id)) return true;
    const current = currentVersion(policy);
    if (!current || current.id !== version.id) return false;
    return policy.visibility === "all" || assignmentsFor(user).some((assignment) => assignment.policy_id === policy.id);
  }

  function recipientsOf(policy) {
    const assignments = q.assignmentsForPolicy.all(policy.id);
    return q.activeUsers.all().filter((user) => assignments.some((assignment) => matchesAssignment(user, assignment)));
  }

  return { q, assignmentsFor, matchesAssignment, currentVersion, statusFor, inbox, assignedStates, canRead, recipientsOf };
}
