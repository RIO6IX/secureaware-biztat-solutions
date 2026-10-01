// Policy module tables. Every statement is idempotent so the migration can run on every
// start-up against a new or an existing database.

export const ROLES = ["Employee", "Department Manager", "Security/HR Admin", "System Admin"];
export const ADMIN_ROLES = ["Security/HR Admin", "System Admin"];
export const MANAGER_ROLES = ["Department Manager", ...ADMIN_ROLES];
export const VERSION_STATUSES = ["draft", "in_review", "approved", "published", "superseded", "archived"];
export const REVIEWER_GROUPS = ["IT", "HR", "Legal", "Management"];
export const CATEGORIES = ["Governance", "Acceptable Use", "Access Control", "Data Protection", "Remote Work", "Incident Management", "Physical Security", "Devices"];
export const VISIBILITY = ["assigned", "all"];

export function migrate(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS policies (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'assigned' CHECK(visibility IN ('assigned','all')),
  current_version_id INTEGER REFERENCES policy_versions(id) ON DELETE SET NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS policy_versions (
  id INTEGER PRIMARY KEY,
  policy_id INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL CHECK(version_label GLOB '[0-9]*.[0-9]*'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','in_review','approved','published','superseded','archived')),
  summary TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  change_summary TEXT NOT NULL DEFAULT '',
  requires_reacknowledgement INTEGER NOT NULL DEFAULT 1,
  effective_date TEXT,
  next_review_date TEXT,
  content_sha256 TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  published_at TEXT,
  published_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  superseded_at TEXT,
  UNIQUE(policy_id, version_label)
);
CREATE TABLE IF NOT EXISTS policy_reviews (
  id INTEGER PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  reviewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_group TEXT NOT NULL CHECK(reviewer_group IN ('IT','HR','Legal','Management')),
  decision TEXT NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending','approved','changes_requested')),
  comment TEXT NOT NULL DEFAULT '',
  decided_at TEXT,
  UNIQUE(version_id, reviewer_user_id)
);
CREATE TABLE IF NOT EXISTS policy_assignments (
  id INTEGER PRIMARY KEY,
  policy_id INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK(target_type IN ('department','role','user')),
  target_value TEXT NOT NULL,
  due_in_days INTEGER NOT NULL DEFAULT 14 CHECK(due_in_days BETWEEN 1 AND 365),
  due_date TEXT NOT NULL,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  UNIQUE(policy_id, target_type, target_value)
);
CREATE TABLE IF NOT EXISTS policy_read_events (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_id INTEGER NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  first_opened_at TEXT NOT NULL,
  reached_end_at TEXT,
  seconds_open INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, version_id)
);
CREATE TABLE IF NOT EXISTS policy_acknowledgements (
  id INTEGER PRIMARY KEY,
  receipt_code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_id INTEGER NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  statement_text TEXT NOT NULL,
  typed_full_name TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  acknowledged_at TEXT NOT NULL,
  user_agent_family TEXT NOT NULL DEFAULT 'Other',
  UNIQUE(user_id, version_id)
);
CREATE TABLE IF NOT EXISTS policy_questions (
  id INTEGER PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  asked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  answered_at TEXT
);
CREATE TABLE IF NOT EXISTS policy_exceptions (
  id INTEGER PRIMARY KEY,
  policy_id INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  requested_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  decision_note TEXT NOT NULL DEFAULT '',
  expires_at TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE TABLE IF NOT EXISTS policy_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON policy_versions(policy_id, status);
CREATE INDEX IF NOT EXISTS idx_policy_reviews_reviewer ON policy_reviews(reviewer_user_id, decision);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_target ON policy_assignments(target_type, target_value);
CREATE INDEX IF NOT EXISTS idx_policy_ack_user ON policy_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_version ON policy_acknowledgements(version_id);
CREATE INDEX IF NOT EXISTS idx_policy_questions_version ON policy_questions(version_id);
CREATE INDEX IF NOT EXISTS idx_policy_exceptions_policy ON policy_exceptions(policy_id, status);
`);
}
