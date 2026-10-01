# SecureAware - Biztat Solutions

SecureAware is an information security policy awareness and compliance management system for Biztat Solutions, built for SLIIT IE3072 (Information Security Policy and Management). The repository is split by contribution branch while sharing the same secure foundation.

## Branches

- `main`: shared secure foundation.
- `chanuka`: Member 3 - Security Training, Quiz and Assessment (this branch).
- `sanduni`: Member 2 - Policy Management, Assignment and Acknowledgement.
- `shaeed028`: Member 4 - Compliance dashboard and reporting.

## Run

Requires Node.js 22.5 or later (uses the built-in `node:sqlite`). No npm packages are needed.

```bash
npm run dev
```

Open `http://127.0.0.1:4000`. The database is created in `data/secureaware.sqlite` on first start, with the six training courses, the Training Needs Matrix and some fictional demo activity. Set `SECUREAWARE_DEMO_DATA=off` to skip the demo activity.

## Test

```bash
npm run build
npm test
```

## Seed Accounts

All accounts and people are fictional.

| Role | Username | Password | Department |
| --- | --- | --- | --- |
| Employee | `employee.demo` | `EmployeePass!2026` | Finance |
| Employee | `dev.demo` | `DeveloperPass!2026` | Development |
| Employee | `consultant.demo` | `ConsultantPass!2026` | Consulting |
| Department Manager | `manager.demo` | `ManagerPass!2026` | Finance |
| Department Manager | `manager.consulting` | `ConsultManagerPass!2026` | Consulting |
| Security/HR Admin | `security.admin` | `AdminPass!2026` | Information Security |
| System Admin | `system.admin` | `SystemPass!2026` | IT |

## Training module (branch `chanuka`)

For learners (every role):

- Course catalogue with cover art, progress rings, status and due-date badges, search, filters and tabs.
- Course landing pages with learning objectives, cited statistics, lesson outline and quiz rules.
- Lesson reader with callouts, key takeaways, sources and an interactive exercise in every course.
- Quizzes unlocked only when the server confirms every lesson is complete. Questions are drawn at random and marked on the server, with attempt limits, a cooldown and rate limiting.
- Results with explanations and links to the lessons to revisit. The correct option is never revealed.
- Printable certificates and a privacy-preserving verification page.
- My learning dashboard with a downloadable personal training record (CSV).

For Department Managers: a team training view (own department only) with a *Send reminder* action.

For Security/HR Admin and System Admin:

- Course builder with markdown preview and a question bank. Course versions are bumped on question changes.
- Assignments with a recipient preview.
- Training Needs Matrix with automatic role-based assignment.
- Evidence reports with a formula-safe CSV export.
- Research basis page.

Security highlights:

- Identity always comes from the server-side session.
- RBAC and object-level checks run on the server.
- CSRF protection on every state change.
- Answer correctness never leaves the server.
- Parameterised SQL and a strict CSP with no `innerHTML`.
- Every action is audited with the real actor.
- 3-year data retention.

See [docs/TRAINING_MODULE.md](docs/TRAINING_MODULE.md), [docs/VIVA_NOTES_chanuka.md](docs/VIVA_NOTES_chanuka.md), [docs/TESTING.md](docs/TESTING.md) and [docs/DEMO_SCRIPT_TRAINING.md](docs/DEMO_SCRIPT_TRAINING.md).

## Architecture

```text
Browser (ES modules, hash router, DOM builder - no innerHTML)
   |  HttpOnly SameSite=Strict session cookie + X-CSRF-Token header
Node HTTP server (server/index.js)
   |  Auth, sessions, CSRF, RBAC, audit, notifications, CSV, password policy
   |  Module discovery: server/modules/<name>/index.js
Feature modules (server/modules/training/ ...)
   |
SQLite (node:sqlite, parameterised statements only)
```

## ER Overview

```text
users -> sessions, audit_events, notifications
users -> lesson_progress -> training_lessons -> training_courses
users -> quiz_attempts -> quiz_answers, certificates
training_courses -> training_questions -> training_options
training_courses -> training_assignments, training_role_requirements (Training Needs Matrix)
```

## Backup and Restore

```bash
npm run backup
npm run restore -- data/backups/<backup-file>.sqlite
```
