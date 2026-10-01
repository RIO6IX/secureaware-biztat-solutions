# Testing Matrix

Run `npm run build` and `npm test` (Node's built-in `node --test`). Each test file uses its own temporary SQLite database. Demo activity is switched off in tests with `SECUREAWARE_DEMO_DATA=off`.

Latest run on branch `sanduni` (foundation + training + policy), 2026-10-01: **56 tests, 56 passed, 0 failed** (7 foundation, 25 training, 24 policy).

## Foundation (`tests/smoke.test.js`)

| Requirement | Test evidence | Status |
| --- | --- | --- |
| FR-01 Login | login creates a session and `/api/me` returns the user | Passing |
| FR-03 RBAC | employee cannot read the admin audit log | Passing |
| FR-17 Audit | admin audit access (see the audit page) | Passing |
| CSRF | state-changing request without CSRF is rejected | Passing |
| Password policy | password change follows NIST SP 800-63B-4 (15+ characters, no composition rules, blocklist) | Passing |
| Notifications | notifications are scoped to the signed-in user | Passing |
| Body limit | oversized request bodies are rejected with 413 | Passing |
| NFR-01 Password hashing | Code review: scrypt with a per-user salt | Implemented |
| NFR-04 Session timeout | Code review: idle expiry refresh | Implemented |
| NFR-14 Backup | `npm run backup`, `npm run restore -- <file>` | Implemented |

## Training module (`tests/training.test.js`)

| # | Case | Expected | Status |
| --- | --- | --- | --- |
| 1 | Seed content: 4–6 lessons, at least 12 questions (15 each), one correct answer per single-answer question, sources on every lesson | valid | Passing |
| 2 | Migration and seed run twice | idempotent | Passing |
| 3 | Unauthenticated access to the training API | 401 | Passing |
| 4 | Catalogue and lesson reader use the session identity; bad slug or tab | 200 / 404 / 400 | Passing |
| 5 | Manager sees only their own department; cross-department lookup | 404 | Passing |
| 6 | Lesson progress in order; forged CSRF token | 409 / 403 | Passing |
| 7 | Quiz locked before all lessons are complete | 403 | Passing |
| 8 | Answers for questions not served, foreign options, partial answer sets | 400 | Passing |
| 9 | Server scoring is correct and a pass issues a certificate; resubmit | 100%, certificate / 409 | Passing |
| 10 | Cooldown, then attempt limit | 429 / 429 | Passing |
| 11 | Employee reads another employee's attempt | 404 | Passing |
| 12 | Rate limiter per user | blocks bursts | Passing |
| 13 | Certificate private to holder; verification returns course and date only; fake code invalid | 404 / valid / invalid | Passing |
| 14 | Employee or manager uses the course builder | 403 | Passing |
| 15 | Builder validation; publishing requires content; used question replaced; version bump; old attempt keeps its version; archive hides the course | as described | Passing |
| 16 | Assignment of a draft course, unknown department, past due date; recipient preview; admin-only | 400 / 403 | Passing |
| 17 | Auto-assignment from the Training Needs Matrix for a new user; removal after a department change | assigned / removed | Passing |
| 18 | Manager reminders limited to own team, throttled, audited with the real actor | 201 / 404 / 429 | Passing |
| 19 | Evidence CSV is admin-only and formula-safe (`=HYPERLINK` neutralised) | `'=` prefix | Passing |
| 20 | Learner record CSV; 3-year retention purge removes old attempts and certificates | purged and audited | Passing |
| 21 | Crawl of every learner-facing endpoint for correctness fields | none found | Passing |
| 22 | All 18 state-changing training routes without or with a forged CSRF token | 403 | Passing |
| 23 | `userId` in body or query is ignored | no effect | Passing |
| 24 | Invalid ids, enums, malformed JSON, oversized bodies, wrong method | 400 / 413 / 405 | Passing |
| 25 | Audit completeness; real actor; no answers, passwords or session ids | as described | Passing |

## Policy module (`tests/policy.test.js`)

| # | Case | Expected | Status |
| --- | --- | --- | --- |
| 1 | Seed policies have all ten sections and cite sources; AUP has v1.0 and v1.1; password rules follow NIST SP 800-63B-4; BYOD is in review | valid | Passing |
| 2 | Migration and seed run twice | idempotent | Passing |
| 3 | Unauthenticated access to the policy API | 401 | Passing |
| 4 | State change with a missing or forged CSRF token | 403 | Passing |
| 5 | Employee creates, edits, publishes, assigns, reads evidence or the team view | 403 | Passing |
| 6 | Inbox uses the session identity; `?userId=` ignored; drafts and unassigned policies hidden | as described | Passing |
| 7 | Acknowledge before reaching the end | 403 | Passing |
| 8 | "End" reported before the minimum reading time | 409 with seconds remaining | Passing |
| 9 | Acknowledge an unassigned policy | 403 (reader 404) | Passing |
| 10 | Typed name mismatch; attestation not ticked | 400 / 400 | Passing |
| 11 | Receipt uses the server's version, statement and SHA-256 of the exact text; repeat returns the same receipt; no IP column | 201 then 200 | Passing |
| 12 | Employee reads another employee's receipt, record or team view | 404 / empty / 403 | Passing |
| 13 | Manager limited to own department; other department's member, evidence and reminders | 404 / 403 / 404; reminder throttled 429 | Passing |
| 14 | Edit a published or superseded version | 409 `create_new_version` | Passing |
| 15 | Author as reviewer, one reviewer group, author approves own version, non-reviewer decides | 400 / 400 / 403 / 403 | Passing |
| 16 | Publish with no approvals, one approval; changes requested returns draft; resubmit and publish | 409 / 409 / draft / 200 | Passing |
| 17 | Assign a draft policy; unknown department; recipient preview; assignment appears in inbox | 400 / 400 / list / pending | Passing |
| 18 | New version supersedes the old one, notifies and requires re-acknowledgement; superseded version acknowledged; minor version keeps compliance | needs_reack / 400 / complete | Passing |
| 19 | Version comparison returns a line diff as plain data; bad labels | ops / 400 | Passing |
| 20 | Status calculation: pending, overdue, exempt, complete, needs re-acknowledgement with a fresh deadline | as described | Passing |
| 21 | Evidence CSV is admin-only, audited and formula-safe (`=HYPERLINK` neutralised) | `'=` prefix | Passing |
| 22 | Questions and exceptions; anonymous public answers; expiry validation; audit completeness, real actor, no passwords or session ids | as described | Passing |
| 23 | Invalid labels, categories, dates, slugs, ids, wrong method, oversized body | 400 / 405 / 413 | Passing |
| 24 | Evidence for versions retired more than 6 years ago is purged and audited | purged | Passing |

## Manual browser checks: policy module (2026-10-01)

| Check | Result |
| --- | --- |
| Employee inbox tabs and counts, reader with contents and What changed callout, read-to-end unlock, wrong name rejected, receipt shown | Pass |
| Admin library, editor preview, create v1.2 from history, submit to IT and Management reviewers, editor locked during review | Pass |
| History, side-by-side and inline compare, assignments, compliance, calendar, questions, exceptions, research, team view | Pass, no console errors or CSP violations |

## Manual browser checks: training module (headless Chrome, 2026-09-26)

| Check | Result |
| --- | --- |
| Login, catalogue, course, lesson, quiz (fail, blocked retake, pass), results, certificate, verification, My learning | Pass. No console errors or CSP violations. |
| All six interactive exercises render and complete | Pass |
| Markdown preview with `<img onerror>` and a `javascript:` link | Rendered as text; no element or link created |
| 360px width: catalogue, lesson, evidence page | No horizontal scroll |
| Manager team view and reminder; admin matrix, assignments with preview, evidence | Pass |
| Keyboard | Skip link, visible focus ring, tab arrow keys, labelled controls, `aria-live` quiz hints and toasts |

Still to do once all branches are merged: an Edge and Chrome desktop pass and a screen-reader spot check.
