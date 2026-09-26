// Training module tables. Every statement is idempotent so the migration can run on
// every start-up against a new or an existing database.

export const ROLES = ["Employee", "Department Manager", "Security/HR Admin", "System Admin"];
export const ADMIN_ROLES = ["Security/HR Admin", "System Admin"];
export const QUESTION_TYPES = ["single", "multi", "true_false", "scenario"];
export const COURSE_STATUSES = ["draft", "published", "archived"];
export const LEVELS = ["Foundation", "Intermediate", "Advanced"];

export function migrate(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS training_courses (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Foundation',
  summary TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  learning_objectives TEXT NOT NULL DEFAULT '[]',
  why_it_matters TEXT NOT NULL DEFAULT '[]',
  duration_minutes INTEGER NOT NULL DEFAULT 20,
  audience_note TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT 'shield',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  pass_mark INTEGER NOT NULL DEFAULT 80 CHECK(pass_mark BETWEEN 1 AND 100),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK(max_attempts BETWEEN 1 AND 10),
  cooldown_minutes INTEGER NOT NULL DEFAULT 30 CHECK(cooldown_minutes BETWEEN 0 AND 10080),
  questions_per_attempt INTEGER NOT NULL DEFAULT 10 CHECK(questions_per_attempt BETWEEN 1 AND 50),
  open_to_all INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS training_lessons (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  key_takeaways TEXT NOT NULL DEFAULT '[]',
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  interactive TEXT,
  sources TEXT NOT NULL DEFAULT '[]',
  UNIQUE(course_id, position)
);
CREATE TABLE IF NOT EXISTS training_questions (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES training_lessons(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK(type IN ('single','multi','true_false','scenario')),
  prompt TEXT NOT NULL,
  scenario_text TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 2 CHECK(difficulty BETWEEN 1 AND 3),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS training_options (
  id INTEGER PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES training_questions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS training_assignments (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK(target_type IN ('department','role','user')),
  target_value TEXT NOT NULL,
  due_date TEXT,
  mandatory INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','matrix')),
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  UNIQUE(course_id, target_type, target_value)
);
CREATE TABLE IF NOT EXISTS training_role_requirements (
  id INTEGER PRIMARY KEY,
  role TEXT NOT NULL,
  department TEXT,
  course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  due_in_days INTEGER NOT NULL DEFAULT 30
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_requirement_unique ON training_role_requirements(role, IFNULL(department, ''), course_id);
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL,
  UNIQUE(user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  course_version INTEGER NOT NULL,
  attempt_number INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  submitted_at TEXT,
  score INTEGER,
  passed INTEGER,
  question_ids TEXT NOT NULL,
  option_order TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted','expired')),
  UNIQUE(user_id, course_id, attempt_number)
);
CREATE TABLE IF NOT EXISTS quiz_answers (
  attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES training_questions(id) ON DELETE CASCADE,
  selected_option_ids TEXT NOT NULL,
  correct INTEGER NOT NULL,
  PRIMARY KEY(attempt_id, question_id)
);
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  attempt_id INTEGER NOT NULL UNIQUE REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  certificate_code TEXT NOT NULL UNIQUE,
  issued_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_training_lessons_course ON training_lessons(course_id, position);
CREATE INDEX IF NOT EXISTS idx_training_questions_course ON training_questions(course_id, active);
CREATE INDEX IF NOT EXISTS idx_training_options_question ON training_options(question_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_target ON training_assignments(target_type, target_value);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_course ON quiz_attempts(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
`);
}
