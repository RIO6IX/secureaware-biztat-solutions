import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secureaware-policy-"));
process.env.SECUREAWARE_DB = path.join(tempDir, "policy.sqlite");
process.env.SECUREAWARE_DEMO_DATA = "off";
process.env.POLICY_MIN_READ_SCALE = "0";
const { default: server } = await import("../server/index.js");
const { policies } = await import("../server/modules/policy/content/index.js");
const { migrate } = await import("../server/modules/policy/schema.js");
const { seedPolicies } = await import("../server/modules/policy/seed.js");
const { lineDiff } = await import("../server/modules/policy/diff.js");
const { createStore, minReadSeconds } = await import("../server/modules/policy/store.js");
const { purgeExpiredPolicyEvidence } = await import("../server/modules/policy/retention.js");

let base;
test.before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const PASSWORDS = {
  "employee.demo": "EmployeePass!2026",
  "manager.demo": "ManagerPass!2026",
  "security.admin": "AdminPass!2026",
  "system.admin": "SystemPass!2026",
  "dev.demo": "DeveloperPass!2026",
  "consultant.demo": "ConsultantPass!2026",
  "manager.consulting": "ConsultManagerPass!2026"
};

async function login(username) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: PASSWORDS[username] })
  });
  assert.equal(response.status, 200, `login ${username}`);
  const body = await response.json();
  const cookie = response.headers.get("set-cookie").split(";", 1)[0];
  const call = async (method, url, payload, extraHeaders = {}) => {
    const headers = { cookie, ...extraHeaders };
    if (method !== "GET" && !("x-csrf-token" in extraHeaders)) headers["x-csrf-token"] = body.csrfToken;
    if (payload !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(`${base}${url}`, { method, headers, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, body: json, text, headers: res.headers };
  };
  return { user: body.user, get: (url) => call("GET", url), post: (url, payload = {}, headers) => call("POST", url, payload, headers), put: (url, payload = {}) => call("PUT", url, payload), raw: call };
}

const sessions = {};
async function as(username) {
  sessions[username] ||= await login(username);
  return sessions[username];
}

async function readToEnd(session, slug) {
  const reader = await session.get(`/api/policy/policies/${slug}`);
  assert.equal(reader.status, 200, `open ${slug}`);
  const versionId = reader.body.version.id;
  assert.equal((await session.post(`/api/policy/versions/${versionId}/read`, { event: "open" })).status, 200);
  assert.equal((await session.post(`/api/policy/versions/${versionId}/read`, { event: "end" })).status, 200);
  return reader.body;
}

async function acknowledge(session, slug, versionId, name = session.user.displayName) {
  return session.post(`/api/policy/policies/${slug}/acknowledge`, { versionId, attest: true, typedFullName: name });
}

// Publishes a new AUP version through the full workflow and returns its label.
async function publishNewVersion(label, { requiresReacknowledgement = true } = {}) {
  const admin = await as("security.admin");
  const created = await admin.post("/api/policy/admin/policies/acceptable-use/versions", {
    versionLabel: label, changeSummary: `Test change for version ${label}.`, requiresReacknowledgement
  });
  assert.equal(created.status, 201, created.text);
  const versionId = created.body.version.id;
  const edited = await admin.put(`/api/policy/admin/versions/${versionId}`, {
    summary: created.body.version.summary,
    bodyMarkdown: `${created.body.version.bodyMarkdown}\n\nAdded in ${label}: staff must report lost badges within one hour.`,
    changeSummary: `Adds a rule on reporting lost badges (${label}).`
  });
  assert.equal(edited.status, 200, edited.text);
  const submit = await admin.post(`/api/policy/admin/versions/${versionId}/submit`, {
    reviewers: [{ userId: (await as("system.admin")).user.id, group: "IT" }, { userId: (await as("manager.demo")).user.id, group: "Management" }]
  });
  assert.equal(submit.status, 200, submit.text);
  assert.equal((await (await as("system.admin")).post(`/api/policy/reviews/${versionId}/decision`, { decision: "approved", comment: "OK" })).status, 200);
  assert.equal((await (await as("manager.demo")).post(`/api/policy/reviews/${versionId}/decision`, { decision: "approved" })).status, 200);
  const published = await admin.post(`/api/policy/admin/versions/${versionId}/publish`);
  assert.equal(published.status, 200, published.text);
  return { versionId, published: published.body };
}

test("seed content follows the professional policy structure and cites sources", () => {
  assert.ok(policies.length >= 8);
  const headings = ["Purpose", "Scope", "Roles and responsibilities", "Policy statements", "Compliance and enforcement", "Exceptions", "Related documents", "Definitions", "Review cycle", "Version history"];
  for (const policy of policies) {
    assert.ok(policy.sources.length >= 1, `${policy.slug} cites sources`);
    for (const version of policy.versions) {
      for (const heading of headings) assert.ok(version.body.includes(heading), `${policy.slug} v${version.label} has "${heading}"`);
    }
  }
  const aup = policies.find((policy) => policy.slug === "acceptable-use");
  assert.deepEqual(aup.versions.map((version) => version.label), ["1.0", "1.1"]);
  const password = policies.find((policy) => policy.slug === "password-authentication").versions[0].body;
  assert.match(password, /at least \*\*15 characters\*\*/);
  assert.match(password, /must not\*\* be changed on a fixed schedule/);
  assert.ok(policies.find((policy) => policy.slug === "byod").versions[0].inReview);
});

test("schema migration and seed are safe to run more than once", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, display_name TEXT, role TEXT, department TEXT, active INTEGER DEFAULT 1, created_at TEXT)");
  migrate(db);
  migrate(db);
  assert.equal(seedPolicies(db), policies.length);
  assert.equal(seedPolicies(db), 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM policy_versions").get().n, 9);
});

test("unauthenticated access to the policy API returns 401", async () => {
  for (const url of ["/api/policy/policies", "/api/policy/admin/policies", "/api/policy/team", "/api/policy/receipts/PA-0000-0000-0000-0000"]) {
    const response = await fetch(`${base}${url}`);
    assert.equal(response.status, 401, url);
  }
});

test("state changes without a valid CSRF token are rejected with 403", async () => {
  const employee = await as("employee.demo");
  const admin = await as("security.admin");
  const missing = await employee.raw("POST", "/api/policy/policies/acceptable-use/acknowledge", { versionId: 1, attest: true, typedFullName: "x" }, { "x-csrf-token": "" });
  assert.equal(missing.status, 403);
  const forged = await admin.raw("POST", "/api/policy/admin/policies", { title: "Forged" }, { "x-csrf-token": "forged-token" });
  assert.equal(forged.status, 403);
});

test("an employee cannot create, edit, publish or assign policies", async () => {
  const employee = await as("employee.demo");
  assert.equal((await employee.post("/api/policy/admin/policies", { title: "Rogue policy" })).status, 403);
  assert.equal((await employee.put("/api/policy/admin/versions/1", { summary: "x" })).status, 403);
  assert.equal((await employee.post("/api/policy/admin/versions/1/publish")).status, 403);
  assert.equal((await employee.post("/api/policy/admin/assignments", { policySlug: "acceptable-use", targetType: "role", targetValue: "Employee" })).status, 403);
  assert.equal((await employee.get("/api/policy/admin/evidence")).status, 403);
  assert.equal((await employee.get("/api/policy/team")).status, 403);
});

test("the inbox uses the session identity and ignores userId in the request", async () => {
  const employee = await as("employee.demo");
  const developer = await as("dev.demo");
  const own = await employee.get("/api/policy/policies");
  const spoofed = await employee.get(`/api/policy/policies?userId=${developer.user.id}`);
  assert.equal(own.status, 200);
  assert.deepEqual(spoofed.body, own.body);
  const slugs = own.body.policies.map((item) => item.slug);
  assert.ok(slugs.includes("acceptable-use"));
  assert.ok(!slugs.includes("data-classification"), "Finance employee is not assigned data classification");
  assert.ok(!slugs.includes("byod"), "draft policies never appear in the inbox");
  assert.ok(slugs.includes("clean-desk-clear-screen"), "visible-to-all policies appear");
});

test("acknowledging before reaching the end of the document returns 403", async () => {
  const employee = await as("employee.demo");
  const reader = await employee.get("/api/policy/policies/password-authentication");
  assert.equal(reader.status, 200);
  assert.equal(reader.body.reading.reachedEnd, false);
  const early = await acknowledge(employee, "password-authentication", reader.body.version.id);
  assert.equal(early.status, 403);
});

test("the server enforces a minimum reading time before accepting the end of a document", async () => {
  process.env.POLICY_MIN_READ_SCALE = "1";
  try {
    const consultant = await as("consultant.demo");
    const reader = await consultant.get("/api/policy/policies/incident-reporting");
    const versionId = reader.body.version.id;
    assert.ok(reader.body.reading.minReadSeconds >= 15);
    await consultant.post(`/api/policy/versions/${versionId}/read`, { event: "open" });
    const tooSoon = await consultant.post(`/api/policy/versions/${versionId}/read`, { event: "end" });
    assert.equal(tooSoon.status, 409);
    assert.ok(tooSoon.body.secondsRemaining > 0);
  } finally {
    process.env.POLICY_MIN_READ_SCALE = "0";
  }
  assert.equal(minReadSeconds("word ".repeat(10)), 0);
});

test("acknowledging a policy that is not assigned returns 403", async () => {
  const employee = await as("employee.demo");
  const reader = await (await as("consultant.demo")).get("/api/policy/policies/data-classification");
  assert.equal((await employee.get("/api/policy/policies/data-classification")).status, 404, "unassigned policy is hidden");
  const response = await acknowledge(employee, "data-classification", reader.body.version.id);
  assert.equal(response.status, 403);
});

test("a typed name that does not match the profile returns 400", async () => {
  const employee = await as("employee.demo");
  const reader = await readToEnd(employee, "password-authentication");
  const wrong = await acknowledge(employee, "password-authentication", reader.version.id, "Someone Else");
  assert.equal(wrong.status, 400);
  const unticked = await employee.post("/api/policy/policies/password-authentication/acknowledge", { versionId: reader.version.id, attest: false, typedFullName: employee.user.displayName });
  assert.equal(unticked.status, 400);
});

test("acknowledgement stores the server's version and content hash and is idempotent", async () => {
  const employee = await as("employee.demo");
  const reader = await readToEnd(employee, "password-authentication");
  const first = await acknowledge(employee, "password-authentication", reader.version.id, `  ${employee.user.displayName.toUpperCase()} `);
  assert.equal(first.status, 201, first.text);
  const receipt = first.body.receipt;
  assert.match(receipt.receiptCode, /^PA-/);
  assert.equal(receipt.versionLabel, "1.0");
  assert.equal(receipt.statement, "I have read, understood and agree to comply with Password and Authentication Policy version 1.0.");
  const expectedHash = crypto.createHash("sha256").update(policies.find((policy) => policy.slug === "password-authentication").versions[0].body, "utf8").digest("hex");
  assert.equal(receipt.contentSha256, expectedHash, "hash matches the exact version text");
  assert.equal(reader.version.contentSha256, expectedHash);
  const again = await acknowledge(employee, "password-authentication", reader.version.id);
  assert.equal(again.status, 200);
  assert.equal(again.body.receipt.receiptCode, receipt.receiptCode, "repeat returns the same receipt");
  const own = await employee.get(`/api/policy/receipts/${receipt.receiptCode}`);
  assert.equal(own.status, 200);
  const db = new DatabaseSync(process.env.SECUREAWARE_DB);
  const row = db.prepare("SELECT * FROM policy_acknowledgements WHERE receipt_code = ?").get(receipt.receiptCode);
  assert.equal(row.user_agent_family, "Automated client");
  assert.ok(!Object.keys(row).some((key) => /(^|_)ip(_|$)|address|user_agent$/i.test(key)), "no IP address or raw user-agent column");
  db.close();
});

test("an employee cannot read another employee's acknowledgements", async () => {
  const employee = await as("employee.demo");
  const developer = await as("dev.demo");
  const mine = await employee.get("/api/policy/me/acknowledgements");
  const code = mine.body.acknowledgements[0].receiptCode;
  assert.equal((await developer.get(`/api/policy/receipts/${code}`)).status, 404);
  assert.equal((await developer.get("/api/policy/receipts/not-a-code")).status, 404);
  const theirs = await developer.get(`/api/policy/me/acknowledgements?userId=${employee.user.id}`);
  assert.equal(theirs.body.acknowledgements.length, 0);
  assert.equal((await developer.get(`/api/policy/team/users/${employee.user.id}`)).status, 403);
  const csv = await employee.get("/api/policy/me/acknowledgements.csv");
  assert.equal(csv.status, 200);
  assert.match(csv.text, /receipt_code/);
  assert.ok(csv.text.includes(code));
});

test("a manager sees only their own department", async () => {
  const manager = await as("manager.demo");
  const team = await manager.get("/api/policy/team?department=Consulting");
  assert.equal(team.status, 200);
  assert.equal(team.body.department, "Finance");
  assert.ok(team.body.members.every((member) => member.user.department === "Finance"));
  const consultant = await as("consultant.demo");
  assert.equal((await manager.get(`/api/policy/team/users/${consultant.user.id}`)).status, 404);
  assert.equal((await manager.get("/api/policy/admin/evidence?department=Consulting")).status, 403);
  assert.equal((await manager.post("/api/policy/team/reminders", { targetUserId: consultant.user.id, policySlug: "acceptable-use" })).status, 404);
  const employee = await as("employee.demo");
  const reminder = await manager.post("/api/policy/team/reminders", { targetUserId: employee.user.id, policySlug: "acceptable-use" });
  assert.equal(reminder.status, 201);
  assert.equal((await manager.post("/api/policy/team/reminders", { targetUserId: employee.user.id, policySlug: "acceptable-use" })).status, 429);
  const notes = await employee.get("/api/notifications");
  assert.ok(notes.body.notifications.some((note) => note.title.startsWith("Reminder: acknowledge Acceptable Use Policy")));
});

test("editing a published version returns 409 and points to a new version", async () => {
  const admin = await as("security.admin");
  const history = await admin.get("/api/policy/admin/policies/acceptable-use/history");
  const published = history.body.versions.find((version) => version.status === "published");
  const superseded = history.body.versions.find((version) => version.status === "superseded");
  for (const version of [published, superseded]) {
    const response = await admin.put(`/api/policy/admin/versions/${version.id}`, { summary: "Silently changed summary", bodyMarkdown: "x".repeat(60) });
    assert.equal(response.status, 409);
    assert.equal(response.body.action, "create_new_version");
  }
  const reread = await admin.get(`/api/policy/admin/versions/${published.id}`);
  assert.notEqual(reread.body.version.summary, "Silently changed summary");
});

test("an author cannot approve their own version", async () => {
  const admin = await as("security.admin");
  const created = await admin.post("/api/policy/admin/policies", {
    title: "Visitor Access Policy", category: "Physical Security", summary: "How visitors are signed in and escorted.",
    bodyMarkdown: "## 1. Purpose\n\nVisitors must be signed in and escorted at all times in Biztat offices.", nextReviewDate: "2027-09-01"
  });
  assert.equal(created.status, 201, created.text);
  const versionId = created.body.version.id;
  const selfReview = await admin.post(`/api/policy/admin/versions/${versionId}/submit`, {
    reviewers: [{ userId: admin.user.id, group: "HR" }, { userId: (await as("system.admin")).user.id, group: "IT" }]
  });
  assert.equal(selfReview.status, 400, "author cannot be chosen as reviewer");
  const oneGroup = await admin.post(`/api/policy/admin/versions/${versionId}/submit`, {
    reviewers: [{ userId: (await as("system.admin")).user.id, group: "IT" }, { userId: (await as("dev.demo")).user.id, group: "IT" }]
  });
  assert.equal(oneGroup.status, 400, "reviewers must come from at least two groups");
  await admin.post(`/api/policy/admin/versions/${versionId}/submit`, {
    reviewers: [{ userId: (await as("system.admin")).user.id, group: "IT" }, { userId: (await as("manager.demo")).user.id, group: "Management" }]
  });
  const approve = await admin.post(`/api/policy/reviews/${versionId}/decision`, { decision: "approved" });
  assert.equal(approve.status, 403);
  assert.equal((await (await as("employee.demo")).post(`/api/policy/reviews/${versionId}/decision`, { decision: "approved" })).status, 403, "non-reviewer");
});

test("publishing is blocked until every reviewer approves, and changes requested return the draft", async () => {
  const admin = await as("security.admin");
  const library = await admin.get("/api/policy/admin/policies");
  const visitor = library.body.policies.find((policy) => policy.slug === "visitor-access-policy");
  const versionId = visitor.working.id;
  assert.equal((await admin.post(`/api/policy/admin/versions/${versionId}/publish`)).status, 409, "no approvals yet");
  const it = await as("system.admin");
  const mgmt = await as("manager.demo");
  assert.equal((await it.post(`/api/policy/reviews/${versionId}/decision`, { decision: "approved" })).status, 200);
  assert.equal((await admin.post(`/api/policy/admin/versions/${versionId}/publish`)).status, 409, "one approval is not enough");
  assert.equal((await mgmt.post(`/api/policy/reviews/${versionId}/decision`, { decision: "changes_requested", comment: "Please say who escorts visitors." })).status, 200);
  const draft = await admin.get(`/api/policy/admin/versions/${versionId}`);
  assert.equal(draft.body.version.status, "draft");
  assert.equal(draft.body.editable, true);
  await admin.put(`/api/policy/admin/versions/${versionId}`, {
    summary: "How visitors are signed in and escorted.",
    bodyMarkdown: "## 1. Purpose\n\nVisitors must be signed in at reception and escorted by their host at all times in Biztat offices.",
    changeSummary: "First version."
  });
  await admin.post(`/api/policy/admin/versions/${versionId}/submit`, { reviewers: [{ userId: it.user.id, group: "IT" }, { userId: mgmt.user.id, group: "Management" }] });
  await it.post(`/api/policy/reviews/${versionId}/decision`, { decision: "approved" });
  await mgmt.post(`/api/policy/reviews/${versionId}/decision`, { decision: "approved" });
  const published = await admin.post(`/api/policy/admin/versions/${versionId}/publish`);
  assert.equal(published.status, 200, published.text);
  assert.equal(published.body.version.status, "published");
});

test("only policies with a published version can be assigned", async () => {
  const admin = await as("security.admin");
  const draft = await admin.post("/api/policy/admin/assignments", { policySlug: "byod", targetType: "role", targetValue: "Employee", dueInDays: 14 });
  assert.equal(draft.status, 400);
  assert.match(draft.body.message, /published/);
  const preview = await admin.post("/api/policy/admin/assignments/preview", { policySlug: "visitor-access-policy", targetType: "department", targetValue: "Finance" });
  assert.equal(preview.status, 200);
  assert.ok(preview.body.recipients.some((recipient) => recipient.displayName === "Employee Demo"));
  assert.equal((await admin.post("/api/policy/admin/assignments", { policySlug: "visitor-access-policy", targetType: "department", targetValue: "Nowhere" })).status, 400);
  const assigned = await admin.post("/api/policy/admin/assignments", { policySlug: "visitor-access-policy", targetType: "department", targetValue: "Finance", dueInDays: 7 });
  assert.equal(assigned.status, 201);
  const inbox = await (await as("employee.demo")).get("/api/policy/policies");
  assert.equal(inbox.body.policies.find((item) => item.slug === "visitor-access-policy").status, "pending");
});

test("a new version supersedes the old one and triggers re-acknowledgement", async () => {
  const consultant = await as("consultant.demo");
  const before = await readToEnd(consultant, "acceptable-use");
  const ack = await acknowledge(consultant, "acceptable-use", before.version.id);
  assert.equal(ack.status, 201);
  let inbox = await consultant.get("/api/policy/policies");
  assert.equal(inbox.body.policies.find((item) => item.slug === "acceptable-use").status, "complete");

  const { published } = await publishNewVersion("1.2");
  assert.equal(published.reacknowledgementRequired, true);
  const admin = await as("security.admin");
  const history = await admin.get("/api/policy/admin/policies/acceptable-use/history");
  assert.equal(history.body.versions.find((version) => version.label === "1.1").status, "superseded");
  assert.equal(history.body.versions.find((version) => version.label === "1.2").status, "published");

  inbox = await consultant.get("/api/policy/policies");
  const item = inbox.body.policies.find((entry) => entry.slug === "acceptable-use");
  assert.equal(item.status, "needs_reack");
  assert.equal(item.versionLabel, "1.2");
  const notes = await consultant.get("/api/notifications");
  assert.ok(notes.body.notifications.some((note) => note.title.startsWith("Please acknowledge again")));

  // Acknowledging the superseded version is refused with 400.
  const stale = await acknowledge(consultant, "acceptable-use", before.version.id);
  assert.equal(stale.status, 400);
  assert.match(stale.body.message, /replaced/);

  // A minor wording change without re-acknowledgement keeps people compliant.
  const after = await readToEnd(consultant, "acceptable-use");
  assert.equal((await acknowledge(consultant, "acceptable-use", after.version.id)).status, 201);
  await publishNewVersion("1.3", { requiresReacknowledgement: false });
  inbox = await consultant.get("/api/policy/policies");
  assert.equal(inbox.body.policies.find((entry) => entry.slug === "acceptable-use").status, "complete");
});

test("version comparison returns a line diff that is plain data", async () => {
  const admin = await as("security.admin");
  const compare = await admin.get("/api/policy/admin/policies/acceptable-use/compare?from=1.0&to=1.1");
  assert.equal(compare.status, 200);
  assert.ok(compare.body.stats.added > 0);
  assert.ok(compare.body.ops.some((op) => op.type === "added" && op.text.includes("Generative AI tools")));
  assert.equal((await admin.get("/api/policy/admin/policies/acceptable-use/compare?from=1&to=x")).status, 400);
  const diff = lineDiff("a\nb\nc", "a\n<script>alert(1)</script>\nc");
  assert.deepEqual(diff.ops.map((op) => op.type), ["same", "removed", "added", "same"]);
  assert.equal(diff.ops[2].text, "<script>alert(1)</script>", "text is returned as data, never rendered on the server");
});

test("compliance status calculation covers complete, pending, overdue, needs re-acknowledgement and exempt", async () => {
  const db = new DatabaseSync(process.env.SECUREAWARE_DB);
  const store = createStore(db);
  const user = { id: 999001, role: "Employee", department: "QA" };
  db.prepare("INSERT INTO users (id,username,display_name,role,department,password_salt,password_hash,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(user.id, "status.tester", "Status Tester", user.role, user.department, "x", "00", new Date().toISOString());
  const policy = db.prepare("SELECT * FROM policies WHERE slug = 'incident-reporting'").get();
  const current = store.currentVersion(policy);
  const assign = (due) => db.prepare("INSERT OR REPLACE INTO policy_assignments (policy_id,target_type,target_value,due_in_days,due_date,created_at) VALUES (?,?,?,?,?,?)")
    .run(policy.id, "user", String(user.id), 14, due, new Date().toISOString());
  assign("2999-01-01");
  assert.equal(store.statusFor(user, policy).status, "pending");
  assign("2000-01-01");
  assert.equal(store.statusFor(user, policy).status, "overdue");
  db.prepare("INSERT INTO policy_exceptions (policy_id,requested_by,justification,status,expires_at,created_at) VALUES (?,?,?,?,?,?)")
    .run(policy.id, user.id, "Testing the exempt status calculation.", "approved", "2999-01-01T00:00:00.000Z", new Date().toISOString());
  assert.equal(store.statusFor(user, policy).status, "exempt");
  db.prepare("DELETE FROM policy_exceptions WHERE requested_by = ?").run(user.id);
  db.prepare("INSERT INTO policy_acknowledgements (receipt_code,user_id,version_id,statement_text,typed_full_name,content_sha256,acknowledged_at) VALUES (?,?,?,?,?,?,?)")
    .run("PA-TEST-TEST-TEST-TEST", user.id, current.id, "s", "Status Tester", current.content_sha256, new Date().toISOString());
  assert.equal(store.statusFor(user, policy).status, "complete");
  // Simulate a newer version that requires re-acknowledgement.
  const later = new Date(Date.now() + 1000).toISOString();
  const { lastInsertRowid } = db.prepare(`INSERT INTO policy_versions (policy_id,version_label,status,summary,body_markdown,change_summary,requires_reacknowledgement,content_sha256,created_at,updated_at,published_at)
    VALUES (?,?,'published','s','b','c',1,'h',?,?,?)`).run(policy.id, "9.0", later, later, later);
  db.prepare("UPDATE policies SET current_version_id = ? WHERE id = ?").run(lastInsertRowid, policy.id);
  const updated = db.prepare("SELECT * FROM policies WHERE id = ?").get(policy.id);
  assign("2999-01-01");
  assert.equal(store.statusFor(user, updated).status, "needs_reack");
  assign("2000-01-01");
  // Re-acknowledgement gets a fresh grace period from the new version's publication date,
  // even when the original assignment deadline has long passed.
  const reack = store.statusFor(user, updated);
  assert.equal(reack.status, "needs_reack");
  assert.equal(reack.needsReacknowledgement, true);
  assert.ok(reack.dueDate > new Date().toISOString().slice(0, 10));
  db.prepare("UPDATE policies SET current_version_id = ? WHERE id = ?").run(current.id, policy.id);
  db.prepare("DELETE FROM policy_versions WHERE id = ?").run(lastInsertRowid);
  db.close();
});

test("evidence CSV is admin-only, audited and formula-safe", async () => {
  const db = new DatabaseSync(process.env.SECUREAWARE_DB);
  const developer = await as("dev.demo");
  db.prepare("UPDATE users SET display_name = ? WHERE username = 'dev.demo'").run("=HYPERLINK(\"http://evil.example\",\"x\")");
  const reader = await readToEnd(developer, "incident-reporting");
  const ack = await acknowledge(developer, "incident-reporting", reader.version.id, "=HYPERLINK(\"http://evil.example\",\"x\")");
  assert.equal(ack.status, 201, ack.text);
  const admin = await as("security.admin");
  const csv = await admin.get("/api/policy/admin/evidence.csv?policy=incident-reporting");
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get("content-type"), /text\/csv/);
  assert.ok(csv.text.includes("\"'=HYPERLINK"), "formula cell is neutralised");
  assert.ok(!/(^|,)"=/m.test(csv.text));
  db.prepare("UPDATE users SET display_name = 'Developer Demo' WHERE username = 'dev.demo'").run();
  const audit = db.prepare("SELECT action FROM audit_events WHERE action = 'POLICY_EVIDENCE_EXPORTED'").all();
  assert.ok(audit.length >= 1);
  db.close();
});

test("questions and exceptions are routed to the owner and every decision is audited", async () => {
  const employee = await as("employee.demo");
  const admin = await as("security.admin");
  const asked = await employee.post("/api/policy/policies/acceptable-use/questions", { question: "Does the AI rule cover browser translation tools?" });
  assert.equal(asked.status, 201);
  assert.equal((await employee.post("/api/policy/policies/data-classification/questions", { question: "Not assigned to me, can I ask?" })).status, 404);
  assert.equal((await admin.post(`/api/policy/admin/questions/${asked.body.id}/answer`, { answer: "Yes, if you paste work text into them." })).status, 200);
  const reader = await employee.get("/api/policy/policies/acceptable-use");
  assert.ok(reader.body.questions.some((item) => item.answer.startsWith("Yes, if you paste")));
  assert.ok(reader.body.questions.every((item) => !("askedBy" in item)), "public Q&A does not name the asker");

  const requested = await employee.post("/api/policy/policies/incident-reporting/exceptions", { justification: "Short" });
  assert.equal(requested.status, 400);
  const ok = await employee.post("/api/policy/policies/password-authentication/exceptions", { justification: "Legacy finance system cannot accept 15-character passwords until the upgrade in March." });
  assert.equal(ok.status, 201);
  assert.equal((await admin.post(`/api/policy/admin/exceptions/${ok.body.id}/decision`, { decision: "approved", note: "Approved with MFA.", expiresOn: "2000-01-01" })).status, 400);
  const tomorrow = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  assert.equal((await admin.post(`/api/policy/admin/exceptions/${ok.body.id}/decision`, { decision: "approved", note: "Approved with MFA.", expiresOn: tomorrow })).status, 200);
  assert.equal((await admin.post(`/api/policy/admin/exceptions/${ok.body.id}/decision`, { decision: "rejected", note: "Changed mind." })).status, 409);
  const db = new DatabaseSync(process.env.SECUREAWARE_DB);
  const actions = db.prepare("SELECT action FROM audit_events WHERE action LIKE 'POLICY_%'").all().map((row) => row.action);
  for (const action of ["POLICY_QUESTION_ASKED", "POLICY_QUESTION_ANSWERED", "POLICY_EXCEPTION_REQUESTED", "POLICY_EXCEPTION_APPROVED", "POLICY_ACKNOWLEDGED", "POLICY_READ_COMPLETED",
    "POLICY_CREATED", "POLICY_SUBMITTED_FOR_REVIEW", "POLICY_REVIEW_APPROVED", "POLICY_REVIEW_CHANGES_REQUESTED", "POLICY_PUBLISHED", "POLICY_VERSION_SUPERSEDED",
    "POLICY_ASSIGNED", "POLICY_REMINDER_SENT", "POLICY_EDIT_BLOCKED", "POLICY_SOD_BLOCKED", "POLICY_ACCESS_DENIED", "POLICY_EVIDENCE_EXPORTED", "POLICY_PERSONAL_EXPORT"]) {
    assert.ok(actions.includes(action), `${action} is audited`);
  }
  const actors = db.prepare("SELECT DISTINCT actor_user_id FROM audit_events WHERE action LIKE 'POLICY_%'").all().map((row) => row.actor_user_id);
  assert.ok(actors.every((actor) => actor !== null), "policy audit events record the real actor");
  const targets = db.prepare("SELECT target FROM audit_events").all().map((row) => row.target).join("\n");
  for (const secret of Object.values(PASSWORDS)) assert.ok(!targets.includes(secret), "no passwords in audit");
  const sessionIds = db.prepare("SELECT id FROM sessions").all().map((row) => row.id);
  assert.ok(sessionIds.every((id) => !targets.includes(id)), "no session ids in audit");
  db.close();
});

test("input is validated and oversized bodies are rejected", async () => {
  const admin = await as("security.admin");
  assert.equal((await admin.post("/api/policy/admin/policies/acceptable-use/versions", { versionLabel: "v2", changeSummary: "Bad label for testing.", requiresReacknowledgement: true })).status, 400);
  assert.equal((await admin.post("/api/policy/admin/policies", { title: "Bad category policy", category: "Nope", summary: "A summary text.", bodyMarkdown: "x".repeat(60) })).status, 400);
  assert.equal((await admin.post("/api/policy/admin/policies", { title: "Bad date policy", category: "Governance", summary: "A summary text.", bodyMarkdown: "x".repeat(60), nextReviewDate: "2027-02-30" })).status, 400);
  assert.equal((await admin.get("/api/policy/policies/NOT_A_SLUG")).status, 400);
  assert.equal((await admin.get("/api/policy/admin/versions/abc")).status, 400);
  assert.equal((await admin.raw("DELETE", "/api/policy/policies")).status, 405);
  const huge = await admin.post("/api/policy/policies/acceptable-use/questions", { question: "x".repeat(70_000) });
  assert.equal(huge.status, 413);
});

test("acknowledgement evidence for long-retired versions is purged after the retention period", () => {
  const db = new DatabaseSync(process.env.SECUREAWARE_DB);
  const old = db.prepare("SELECT v.id FROM policy_versions v JOIN policies p ON p.id = v.policy_id WHERE p.slug = 'acceptable-use' AND v.version_label = '1.0'").get();
  db.prepare("UPDATE policy_versions SET superseded_at = '2015-01-01T00:00:00.000Z' WHERE id = ?").run(old.id);
  const user = db.prepare("SELECT id FROM users WHERE username = 'manager.consulting'").get();
  db.prepare("INSERT INTO policy_acknowledgements (receipt_code,user_id,version_id,statement_text,typed_full_name,content_sha256,acknowledged_at) VALUES (?,?,?,?,?,?,?)")
    .run("PA-OLD0-OLD0-OLD0-OLD0", user.id, old.id, "s", "n", "h", "2014-06-01T00:00:00.000Z");
  const events = [];
  const result = purgeExpiredPolicyEvidence(db, (...args) => events.push(args));
  assert.ok(result.acknowledgements >= 1);
  assert.equal(events[0][1], "POLICY_RETENTION_PURGE");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM policy_acknowledgements WHERE receipt_code = 'PA-OLD0-OLD0-OLD0-OLD0'").get().n, 0);
  db.close();
});
