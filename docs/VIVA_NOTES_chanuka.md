# Viva Notes: Chanuka (Member 3)

Module: **Security Training, Quiz and Assessment**. Branch: `chanuka`. The full reference is in [TRAINING_MODULE.md](TRAINING_MODULE.md).

## 1. Architecture in one minute

- **Stack.** Node.js 22 using only built-in modules (`node:http`, `node:crypto`, `node:sqlite`). There are no npm runtime dependencies, so the dependency supply-chain risk is small (OWASP A03:2025).
- **Foundation (`main`).** It provides sessions in SQLite, scrypt password hashing, CSRF, four roles, audit, notifications and backup. My module plugs in through `server/modules/training/index.js`, which the foundation discovers automatically, so the four member branches merge without fighting over one file.
- **Frontend.** ES modules with a hash router (deep links and a working Back button). A small DOM builder replaces `innerHTML` everywhere.
- **Data flow for a quiz.** The learner reads the lessons. Each completion is recorded on the server. When all are complete, the server unlocks the quiz and draws random questions (unseen ones first) with shuffled options. It stores the question ids and option order on the attempt. On submit, the server marks the answers against those stored ids, issues a certificate on a pass, and audits everything.

## 2. Data model

- **Courses and content.** Courses have lessons and a question bank. Options carry `is_correct`, which is only read inside `quiz.js`.
- **Assignments.** They come from manual assignments (department, role or user) and from the Training Needs Matrix (`training_role_requirements`).
- **Learner activity.** Learner state is held in `lesson_progress`, `quiz_attempts`, `quiz_answers` and `certificates`.
- **Versioning.** Attempts store `course_version` and the exact `question_ids`. Questions that have been used are never edited in place, so every past attempt can be reviewed exactly as it was taken.

## 3. Security decisions and why

| Decision | Why |
| --- | --- |
| Identity only from the session | The old branch sent `userId: 8` from the browser, an IDOR and spoofing flaw (OWASP A01). |
| Server-side RBAC plus object checks, 404 for out-of-scope objects | UI hiding is not security. Returning 404 rather than 403 avoids revealing that a record exists. |
| Correctness never leaves the server | Otherwise anyone can read answers in DevTools. A test crawls every learner endpoint. |
| Marking against the ids stored for the attempt | It stops people answering questions they were never served, or submitting other courses' answers. |
| Quiz unlock checked on the server | The old branch enforced "read lessons first" only in the browser. |
| Attempt limits, cooldown, 60-minute expiry, rate limit | They stop brute-forcing the bank. An abandoned attempt still counts, so it can't be used to preview questions. |
| Explanations for wrong answers hidden until the course is passed | Retakes can repeat questions, so explanations would give the answers away. Topic links still guide revision. |
| Used questions replaced, not edited, and the course version bumped | This keeps evidence accurate (an ISO 27001 audit trail). |
| Strict CSP, no `innerHTML`, markdown rendered as DOM nodes | Prevents XSS (OWASP A05:2025) even if an admin types HTML into a lesson. |
| Formula-safe CSV | Prevents CSV injection when HR opens the export in Excel. |
| Audit with the real actor, never answers or secrets | Accountability without leaking sensitive data. |
| Password change follows NIST SP 800-63B-4 | We teach the rule (15+ characters, no composition rules, blocklist) and the app obeys it too. |

## 4. Training needs mapping (marking criterion)

- **Everyone** does phishing, passwords/MFA, data handling and incident reporting (NIST CSF PR.AT-01).
- **Managers** also do remote work, and they supervise their team's completion.
- **Developers** also do secure development (PR.AT-02, role-based).
- **Admins** do all six courses.
- **The matrix is live.** It is applied when someone signs in, so new starters and people who change role are covered with no manual work. This follows NIST SP 800-50r1's awareness-plus-role-based model and its life cycle:
  - **Plan and Strategy:** the matrix.
  - **Analysis and Design:** learning objectives.
  - **Development and Implementation:** courses and assignments.
  - **Assessment and Improvement:** quizzes, reports and course versions.

## 5. Ethical use of employee data

- **Minimisation:** only training evidence is collected, and the practice exercises never leave the browser.
- **Transparency:** a privacy notice is shown on the Training page.
- **Least access:**
  - Managers see only their department.
  - Managers see status and scores, never individual answers.
  - Only the learner and admins see full reviews and certificates.
  - Certificate verification returns the course and date only, not the name or score.
- **Access right:** learners can download their own record as CSV.
- **Retention:** 3 years (`TRAINING_RETENTION_YEARS`), purged automatically and audited.

## 6. Likely viva questions

1. **Why are the answers not sent to the browser?** Anything sent to the browser can be read in DevTools. The browser only gets option ids and text. Marking happens on the server, and a test scans every learner response for correctness fields.
2. **How do you stop a learner submitting someone else's attempt?** The attempt must belong to the session user, or the server returns 404. The user id is never taken from the request.
3. **What stops a learner skipping the lessons?** The server counts `lesson_progress` rows and returns 403 on quiz start if any lesson is missing. Lessons must also be completed in order.
4. **Can a learner retake until they memorise the answers?** There are three attempts with a 30-minute cooldown. Each attempt draws 10 of 15 questions, preferring unseen ones, with options shuffled. Explanations for wrong answers stay hidden until the learner passes.
5. **What happens if an admin edits a question after people have taken the quiz?** If the question has been used, a new question row is created, the old one is retired, and the course version increases. Old attempts still point to the original question and version.
6. **How is a manager limited to their own department?** The server pins the team view to `user.department`, whatever query is sent. Individual lookups outside the department return 404. Both are tested.
7. **How does auto-assignment work?** `training_role_requirements` holds (role or `*`, department or null, course). On login, matrix save and course publish, the server adds any missing per-user assignments. After a role or department change, it removes ones that no longer apply unless already passed.
8. **Why SQLite and no framework?** It keeps the shared foundation's stack and needs no runtime dependencies. Everything is parameterised through `db.prepare(...).run(?)`. A framework was not needed.
9. **How do you prevent XSS in lesson content?** Markdown is parsed into DOM nodes with `textContent`. HTML is shown as text, links are limited to http(s), and the CSP blocks inline scripts. The browser test confirmed `<img onerror>` and `javascript:` links are neutralised.
10. **What is CSV formula injection?** A cell starting with `=`, `+`, `-` or `@` can run as a formula in Excel. We prefix those cells with a quote, and a test inserts a `=HYPERLINK(...)` name to prove it.
11. **What does the certificate code prove?** It is 80 random bits in the form `SA-XXXX-XXXX-XXXX-XXXX`. Verification returns only valid, the course and the date, and it is rate limited and audited.
12. **Which statistics did you use and how did you check them?** Only primary sources, checked on 2026-09-26. The 2026 DBIR (62% human element, 16% phishing, 13% credential abuse, 31% vulnerability exploitation). The FBI IC3 2025 report (US$3.05 bn in BEC losses). NIST SP 800-63B-4 final. OWASP Top 10:2025. PDPA sections 5–12 and 23, and Gazette 2498/16 for 1 January 2027.
13. **What is the status of Sri Lanka's PDPA?** The DPA provisions have operated since 2023. Parts I and III start on 1 January 2027 (Gazette Extraordinary 2498/16). Parts II and VII await further orders. The course presents the principles as good practice Biztat follows now.
14. **What would you do next?** Single sign-on with the Biztat identity provider, email reminders, SCORM export, a shared rate-limit store if deployed on several instances, and validating the assumptions (reporting channels, tools, classification) with Biztat.
