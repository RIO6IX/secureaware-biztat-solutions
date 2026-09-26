# Demo Script: Training Module (3–4 minutes)

## Before the demo

1. Delete `data/secureaware.sqlite` if you want a clean start, then run `npm run dev` and open `http://127.0.0.1:4000`.
2. Sign in as `security.admin` / `AdminPass!2026` and go to **Course builder → Phishing and Social Engineering Recognition → Details**. Set **Wait after a fail** to `0` and save, so the live retake is not blocked by the 30-minute cooldown. Sign out.
3. Keep the answer key to hand: sign in as admin in a second browser profile and open **Question bank**.

## 1. Employee: training (about 90 seconds)

1. Sign in as `employee.demo` / `EmployeePass!2026`.
2. Open **Security training**. Point out:
   - four mandatory cards with progress rings, due dates, and one **Overdue** course;
   - the privacy notice.
3. Open **Phishing and Social Engineering Recognition**. Show the objectives, the cited DBIR and IC3 statistics, and the quiz box (locked).
4. Click **Start training**. Mark lesson 1 complete.
5. In lesson 2, click the red flags in the sample email. The **Mark lesson complete** button unlocks after 5 flags.
6. Complete lessons 3–5. Lesson 4 has the spot-the-fake-login exercise.

## 2. Employee: fail, review, retake, pass (about 60 seconds)

1. **Take the quiz**. Show one question per screen and that **Next** needs an answer. Deliberately answer badly, open **Review answers**, then **Submit**.
2. On the results page, point out:
   - score against the 80% pass mark and attempts left;
   - **Topics to review** with lesson links;
   - no correct option is revealed, and explanations for wrong answers unlock only after passing.
3. **Retake quiz**. Note that the questions are different. Answer correctly using the key and submit.
4. The pass is shown. Open **View certificate**, then **Print or save as PDF**. Open **Verify a certificate** and show that only the course and date are returned.

## 3. Manager (about 30 seconds)

1. Sign out and sign in as `manager.demo` / `ManagerPass!2026`.
2. Open **Team training**. Only the Finance department is shown, and the overdue *Security Incident Reporting* course appears under **Needs attention**.
3. Click **Send reminder**. A toast confirms it, and the action is audited.

## 4. Admin (about 45 seconds)

1. Sign in as `security.admin`.
2. **Course builder → Question bank → Edit** any used question and save. The editor explains that it is replaced, and the course version increases.
3. **Assignments**: pick *Secure Development Essentials* and department *Consulting*, then **Preview recipients** and **Confirm assignment**.
4. **Needs matrix**: show the role and department grid (the answer to "training needs mapped to user types").
5. **Evidence and reports**: show completion by course and department and the overdue list, then **Export CSV**.
6. **Audit log**: the reminder, the question edit, the assignment and the export all appear with the real actors.

## If asked "how is this secure?"

- The identity comes from the session, not the browser.
- Answers never reach the browser.
- Quiz marking and the quiz unlock happen on the server.
- There is CSRF protection on every change.
- Managers see only their own department and never individual answers.
- The CSV export is formula-safe.
- Everything is audited.
- The 32 automated tests cover each of these (`npm test`).
