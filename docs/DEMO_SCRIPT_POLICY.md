# Demo Script: Policy Module (3–4 minutes)

## Before the demo

1. Delete `data/secureaware.sqlite` for a clean start, then run `npm run dev` and open `http://127.0.0.1:4000`.
2. For a quick demo, shorten the minimum reading time: `$env:POLICY_MIN_READ_SCALE="0.2"; npm run dev` in PowerShell, or `POLICY_MIN_READ_SCALE=0.2 npm run dev` in bash. Without it, the reader must stay on a policy for a realistic time before the acknowledgement unlocks.
3. Use two browser profiles so you can switch users quickly.

## 1. Admin creates AUP v1.2 and sends it for review (45 seconds)

1. Sign in as `security.admin` / `AdminPass!2026`. Open **Policy library**. Point out status, acknowledgement rate and next review date.
2. Open **Acceptable Use Policy → Create new version**. Keep **Minor** (version `1.2`), tick **Everyone must acknowledge this version again**, add a change summary and create the draft.
3. In the editor, add a line under 4.5, for example "You must label AI-generated text in client deliverables." Save the draft (show the live preview).
4. Under **Submit for review**, choose **System Admin (IT)** and **Manager Demo (Management)**. Submit.

## 2. Review: changes requested, fixed, approved, published (60 seconds)

1. Sign in as `manager.demo` / `ManagerPass!2026` → **Policy reviews**. Click **Request changes** with a comment.
2. Back as admin: the version is a draft again. Edit and resubmit to the same reviewers.
3. Approve as `manager.demo`, then as `system.admin` / `SystemPass!2026`.
4. As admin, open the version and click **Publish this version**. Show the notification count.
5. Point out: the author cannot approve their own version (separation of duties), and IT plus Management must both agree (LO3).

## 3. Version comparison (20 seconds)

Open **Version history → Compare latest two**. Show the side-by-side view and the inline view.

## 4. Employee acknowledges (45 seconds)

1. Sign in as `employee.demo` / `EmployeePass!2026` → **My policies**. AUP v1.2 is under **Action required** with an **Updated** chip.
2. Open it. Show the **What changed** callout, the contents list and the progress bar. The acknowledgement is locked.
3. Scroll to the end: the panel unlocks. Tick the box, type `Employee Demo` and acknowledge.
4. Show the receipt: receipt ID, version, time and SHA-256. Mention that the same hash is shown at the bottom of the policy.

## 5. Manager follows up (20 seconds)

Sign in as `manager.demo` → **Team policies**. Only Finance is visible. Click **Send reminder** next to an outstanding policy.

## 6. Admin evidence and review calendar (30 seconds)

1. As admin, open **Compliance & evidence**. Filter by department; click **Export evidence (CSV)**.
2. Open **Review calendar**: Remote Work is overdue for review and AUP is due soon (ISO/IEC 27001 A 5.1, "reviewed at planned intervals").
3. If time allows: **Exceptions** (approve the developer's VPN exception with an expiry date) and **Standards alignment**.
