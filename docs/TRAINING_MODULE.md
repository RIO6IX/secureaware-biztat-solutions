# Training Module: Security Training, Quiz and Assessment

Owner: Chanuka (Member 3). Branch: `chanuka`.

This guide covers the pages, API, schema, Training Needs Matrix, security design and research basis of the SecureAware training module.

## 1. Code layout

| Path | Purpose |
| --- | --- |
| `server/modules/training/index.js` | Module entry: migration, seed, matrix reconciliation, retention purge, router, `onLogin` hook |
| `server/modules/training/schema.js` | Idempotent `CREATE TABLE IF NOT EXISTS` migration and shared enums |
| `server/modules/training/store.js` | Read queries and the learner status calculation |
| `server/modules/training/quiz.js` | Question draw, option shuffle, server-side marking, certificates, result view |
| `server/modules/training/matrix.js` | Training Needs Matrix to per-user assignments |
| `server/modules/training/access.js` | Role and object-level rules (`canViewUser`, `teamDepartment`) |
| `server/modules/training/validate.js` | Input validators (400 on failure) |
| `server/modules/training/rateLimit.js` | Per-user sliding-window limiter |
| `server/modules/training/retention.js` | `TRAINING_RETENTION_YEARS` and the purge |
| `server/modules/training/seed.js`, `content/*.js` | Six researched courses and demo activity |
| `server/modules/training/routes/*.js` | Learner, quiz, me, team, admin course, assignment/matrix and report routes |
| `public/js/core/*.js` | Shared SPA core: DOM builder, API client, hash router, safe markdown, UI kit, shell |
| `public/js/training/*.js` | Training pages and `interactive/` exercises |
| `public/css/core.css`, `public/css/training.css` | Design tokens and module styles (including print) |
| `tests/training.test.js` | 25 module tests (`node --test`) |

The foundation discovers `server/modules/<name>/index.js` automatically, so other members' modules plug in without editing `server/index.js`.

## 2. Pages (hash routes)

| Route | Page | Roles |
| --- | --- | --- |
| `#/training` | Catalogue with tabs (My assigned training, All courses, Completed), search, filters and privacy notice | All |
| `#/training/:slug` | Course landing: objectives, cited statistics, lesson outline, quiz box | All (assigned or open courses) |
| `#/training/:slug/lesson/:n` | Lesson reader with progress bar, interactive exercise, key takeaways, sources | All |
| `#/training/:slug/quiz` | One question per screen, review screen, confirm before submit | All |
| `#/training/attempts/:id` | Results: score, attempts left, topics to review, per-question review | Learner, admins |
| `#/training/certificates/:code` | Printable certificate | Holder, admins |
| `#/training/verify` | Certificate verification (course and date only) | All |
| `#/training/research` | Research basis | All |
| `#/my-learning` | Personal dashboard, attempt history, certificates, CSV record download | All |
| `#/training/team` | Team training and reminders | Department Manager (own department), admins |
| `#/training/admin/courses` (`/new`, `/:id`) | Course builder: details, lessons (markdown and live preview), question bank | Security/HR Admin, System Admin |
| `#/training/admin/assignments` | Assign with recipient preview | Admins |
| `#/training/admin/matrix` | Training Needs Matrix | Admins |
| `#/training/admin/reports` | Evidence, filters, CSV export | Admins |

## 3. API reference

All routes are under `/api/training` and need a session (401 without one). Every non-GET route needs the `X-CSRF-Token` header (403 without it). The acting user always comes from the session.

### Learner

| Method and path | Notes |
| --- | --- |
| `GET /courses?tab&q&category&status&mandatory` | Accessible courses with the learner's state. Never includes correctness. |
| `GET /courses/:slug` | Detail, lesson outline and quiz rules. 404 for drafts, archived or unassigned closed courses. |
| `GET /courses/:slug/lessons/:n` | Lesson content and navigation. |
| `POST /courses/:slug/lessons/:n/complete` | Records progress. Lessons must be completed in order (409 otherwise). |
| `POST /courses/:slug/attempts` | Starts or resumes an attempt. 403 if lessons are incomplete; 409 if already passed; 429 when attempts are used up, during cooldown, or when rate limited. |
| `GET /attempts/:id` | Resumes the learner's own in-progress attempt (404 for others). |
| `POST /attempts/:id/submit` | `{answers:[{questionId, optionIds}]}`. 400 for unserved questions, foreign options or missing answers; 409 if already submitted or expired. |
| `GET /attempts/:id/result` | Learner or admins only. |
| `GET /me` | Summary, courses, attempts, certificates. |
| `GET /me/record.csv` | The learner's complete record (data subject access). Audited. |
| `GET /me/certificates/:code` | Full certificate for the holder or admins. |
| `GET /certificates/:code` | `{valid, course, issuedOn}` or `{valid:false}`. Rate limited and audited. |
| `GET /privacy` | `{retentionYears}` |

### Manager (Department Manager, admins)

| Method and path | Notes |
| --- | --- |
| `GET /team?department=` | Managers are pinned to their own department; admins may choose. |
| `GET /team/users/:id` | Out-of-scope users return 404. Scores and attempts only, no answers. |
| `POST /team/reminders` | `{targetUserId, courseId}`. Target must be in scope and the course assigned and not passed. Throttled to one per 10 minutes. Creates a notification and is audited. |

### Admin (Security/HR Admin, System Admin)

| Method and path | Notes |
| --- | --- |
| `GET, POST /admin/courses`; `GET, PUT /admin/courses/:id` | New courses start as drafts. |
| `POST /admin/courses/:id/publish` | Requires lessons, at least `questions_per_attempt` active questions, and a correct option on each question. Applies the matrix. |
| `POST /admin/courses/:id/archive` | Hides the course from learners. Records are kept. |
| `POST /admin/courses/:id/lessons`; `PUT, DELETE /admin/lessons/:id` | Delete is allowed on drafts only (409 otherwise). |
| `POST /admin/courses/:id/questions`; `PUT /admin/questions/:id`; `POST /admin/questions/:id/(activate or deactivate)` | A question already served in an attempt is replaced by a new row rather than edited. Changes to a published course bump `version`. |
| `GET, POST /admin/assignments`; `POST /admin/assignments/preview`; `DELETE /admin/assignments/:id` | Published courses only (400). The due date cannot be in the past. |
| `GET, PUT /admin/matrix`; `POST /admin/matrix/apply` | Replaces the requirements and reconciles all users. |
| `GET /admin/reports?courseId&department&status`; `GET /admin/reports.csv` | Evidence. The CSV is formula-safe and audited. |

## 4. Database schema

The migration is in `schema.js` and is safe to run on every start. All SQL uses prepared statements with `?` parameters.

| Table | Key columns |
| --- | --- |
| `training_courses` | `slug` (unique), title, category, level, summary, description, `learning_objectives` (JSON), `why_it_matters` (JSON, cited statistics), duration, audience note, cover, `status` (draft/published/archived), `pass_mark`, `max_attempts`, `cooldown_minutes`, `questions_per_attempt`, `open_to_all`, `version`, `created_by`, timestamps |
| `training_lessons` | `course_id` FK, `position` (unique per course), title, `body_markdown`, `key_takeaways` (JSON), `estimated_minutes`, `interactive`, `sources` (JSON) |
| `training_questions` | `course_id` FK, `lesson_id` FK (topic link-back), `type` (single/multi/true_false/scenario), prompt, `scenario_text`, explanation, difficulty, `active` |
| `training_options` | `question_id` FK, position, text, `is_correct`. Never selected into learner responses. |
| `training_assignments` | `course_id` FK, `target_type` (department/role/user), `target_value`, `due_date`, `mandatory`, `source` (manual/matrix), `assigned_by`. Unique per course and target. |
| `training_role_requirements` | `role` (`*` means everyone), `department` (null means any), `course_id`, `due_in_days`. This is the Training Needs Matrix. |
| `lesson_progress` | `user_id`, `lesson_id`, `completed_at`. Unique per user and lesson. |
| `quiz_attempts` | `user_id`, `course_id`, `course_version`, `attempt_number`, `started_at`, `expires_at`, `submitted_at`, score, passed, `question_ids` (JSON), `option_order` (JSON), `status` (in_progress/submitted/expired) |
| `quiz_answers` | `attempt_id`, `question_id`, `selected_option_ids` (JSON), `correct` |
| `certificates` | `user_id`, `course_id`, `attempt_id` (unique), `certificate_code` (unique, 80 random bits), `issued_at` |
| `training_meta` | Markers for one-off demo seed items |

Beyond the brief, the schema adds these columns: `lesson_id`, so a wrong answer links to the lesson to revisit; `course_version`, so old attempts keep the version they were taken under; `option_order`, for a stable resume; and `source`, so matrix assignments can be reconciled.

## 5. Training Needs Matrix

| Audience | Mandatory courses |
| --- | --- |
| All staff | 1 Phishing, 2 Passwords and MFA, 3 Client and personal data, 5 Incident reporting |
| Department Manager | + 4 Safe remote and hybrid work |
| Development department | + 6 Secure development essentials |
| Security/HR Admin, System Admin | All six courses |

Reconciliation (`matrix.js`) runs at start-up, on every login, when the matrix is saved and when a course is published.

- **New starters:** they get their assignments the first time they sign in.
- **Role or department changes:** new requirements are added. Requirements that no longer apply are removed, unless the learner has already passed that course.

## 6. Security design

| Control | Implementation |
| --- | --- |
| Authentication | The foundation session (HttpOnly, SameSite=Strict cookie, stored in the database, 30-minute idle expiry) wraps every `/api/training/*` route. |
| CSRF | The foundation compares `X-CSRF-Token` with the session token for every non-GET request. Tested for all 18 training state-changing routes. |
| Identity | `context.user` comes from the session only. No handler reads a user id for the acting user. |
| RBAC | Route-level `roles` checked with the foundation's `hasRole`. Denials are audited as `TRAINING_ACCESS_DENIED`. |
| Object-level | `canViewUser`: admins see everyone, managers their own department, learners themselves. Out-of-scope objects return 404. Answer reviews and full certificates are limited to the learner and admins. |
| Answer secrecy | The option projection selects only `id, text`. Marking reads `is_correct` inside `quiz.js`. Wrong-answer explanations stay hidden until the course is passed. |
| Quiz integrity | Questions and option order are stored per attempt. Answers are checked against the stored ids. Limits: `max_attempts`, cooldown, 60-minute expiry (counts as used) and 10 starts or submits per minute per user. |
| Input | `validate.js` checks type, length, enum, date and id format (400). Body limit 64 KB, or 256 KB for lesson bodies (413). |
| Output | No `innerHTML` in the client. The markdown renderer builds DOM nodes and allows http(s) links only. The strict CSP (`script-src 'self'`, `style-src 'self'`) has no inline styles. |
| CSV | The foundation's `csvCell` prefixes cells starting with `= + - @`, tab or CR. |
| Audit | Every create, update, publish, archive, assign, matrix change, lesson completion, start, submit, pass, fail, certificate, verification, reminder and export is recorded with the real actor. Answers and secrets are never logged. |

## 7. Ethical use of employee data

- **Minimisation:** only progress, attempts, answers, scores and certificates are stored. The practice exercises run entirely in the browser.
- **Transparency:** a privacy notice on the Training and My learning pages covers what is recorded, why, who can see it, how long it is kept, and the learner's rights.
- **Least access:** managers see their own department's status, scores and attempt counts, not individual answers or certificate codes.
- **Access right:** learners can download their full record (`/me/record.csv`).
- **Retention:** `TRAINING_RETENTION_YEARS = 3` in `retention.js`. Older attempts (with answers and certificates) and lesson progress are purged at start-up, and the purge is audited. Three years covers a yearly refresher cycle plus audit look-back. Change the constant if Biztat's records policy differs.
- **Demo data:** only fictional users and activity are used.

## 8. Research basis and sources

All facts were checked against the primary source on 2026-09-26.

- NIST SP 800-50 Rev. 1, *Building a Cybersecurity and Privacy Learning Program* (September 2024). Its life cycle is Plan and Strategy, then Analysis and Design, then Development and Implementation, then Assessment and Improvement, and it combines awareness with role-based training. <https://csrc.nist.gov/pubs/sp/800/50/r1/final>
- NIST CSF 2.0 PR.AT-01 (all personnel) and PR.AT-02 (specialised roles). <https://www.nist.gov/cyberframework>
- ISO/IEC 27001:2022 Annex A 6.3 (awareness, education and training), plus A 5.12, 5.13 and 7.7 cited in course 3. <https://www.iso.org/standard/27001>
- CISA Secure Our World. <https://www.cisa.gov/secure-our-world> covers phishing, strong passwords, MFA and software updates.
- NIST SP 800-63B-4 (final, August 2025). The rules used: 15-character minimum for single-factor passwords, no composition rules, no periodic change, a blocklist, and password managers allowed. <https://pages.nist.gov/800-63-4/sp800-63b.html>
- Verizon 2026 DBIR: human element 62% (up from 60%), vulnerability exploitation 31%, credential abuse 13%, phishing 16%, pretexting 6%, mobile lures 40% higher median click rate. <https://www.verizon.com/business/resources/reports/dbir/>
- FBI IC3 2025 Annual Report: BEC losses of US$3,046,598,558; phishing/spoofing had 191,561 complaints. <https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf>
- OWASP Top 10:2025 and the OWASP Cheat Sheet Series. <https://top10.owasp.org/2025/>, <https://cheatsheetseries.owasp.org/>
- NIST SP 800-46 Rev. 2 (telework) and NIST SP 800-61 Rev. 3 (incident response, April 2025).
- Personal Data Protection Act, No. 9 of 2022, sections 5 to 12 and 23 <https://www.parliament.lk/uploads/acts/gbills/english/6242.pdf>, amended by Act No. 22 of 2025 (DPA website).
- PDPA status: Gazette Extraordinary No. 2498/16 (22 July 2026) appoints 1 January 2027 for Sections 2 and 3 and Parts I and III. Parts II and VII await further orders. The DPA provisions have been in operation since 2023. <https://documents.gov.lk/view/egz/2026/7/2498-16_E.pdf>
- Sri Lanka CERT incident reporting. <https://cert.gov.lk/report_incident>

### Assumptions to validate with Biztat

- Internal reporting channels.
- The approved password manager, VPN and sharing tools.
- The four-level classification scheme.
- The matrix defaults and due periods.
