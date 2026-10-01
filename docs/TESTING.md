# Testing Matrix

Run `npm run build` and `npm test` (Node's built-in `node --test`). Each test file uses its own temporary SQLite database. Demo activity is switched off in tests with `SECUREAWARE_DEMO_DATA=off`.

Latest run on branch `chanuka`, 2026-09-26: **32 tests, 32 passed, 0 failed.**

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

## Manual browser checks (headless Chrome, 2026-09-26)

| Check | Result |
| --- | --- |
| Login, catalogue, course, lesson, quiz (fail, blocked retake, pass), results, certificate, verification, My learning | Pass. No console errors or CSP violations. |
| All six interactive exercises render and complete | Pass |
| Markdown preview with `<img onerror>` and a `javascript:` link | Rendered as text; no element or link created |
| 360px width: catalogue, lesson, evidence page | No horizontal scroll |
| Manager team view and reminder; admin matrix, assignments with preview, evidence | Pass |
| Keyboard | Skip link, visible focus ring, tab arrow keys, labelled controls, `aria-live` quiz hints and toasts |

Still to do once all branches are merged: an Edge and Chrome desktop pass and a screen-reader spot check.
