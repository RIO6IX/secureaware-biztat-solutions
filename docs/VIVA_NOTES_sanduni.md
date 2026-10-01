# Viva Notes: Sanduni (Member 2)

Module: **Policy Management, Assignment and Acknowledgement**. Branch: `sanduni`. The full reference is in [POLICY_MODULE.md](POLICY_MODULE.md).

## 1. Architecture in one minute

- **Stack.** Node.js 22 built-in modules only (`node:http`, `node:crypto`, `node:sqlite`). No npm runtime dependencies.
- **Foundation (`main`).** Sessions in SQLite, scrypt hashing, CSRF tokens, four roles, audit log, notifications and backup. My module plugs in as `server/modules/policy/index.js`, which the foundation discovers at start-up, so my code and Chanuka's training module live side by side without editing the same files.
- **Frontend.** ES modules with a hash router (`#/policies/acceptable-use`, `#/policies/acceptable-use/compare?from=1.0&to=1.1`), a DOM builder instead of `innerHTML`, and the shared markdown renderer plus a small table extension.
- **What changed from the first prototype.** The first `sanduni` branch kept policies in memory, had no login, took `userId` from the request body, allowed draft policies to be assigned through the API and logged everything as `policy.admin`. All of that is gone.

## 2. Data model

- `policies` is the document that stays the same; `policy_versions` holds each version's text, status and SHA-256.
- `policy_reviews` records each reviewer, their group (IT, HR, Legal, Management) and their decision.
- `policy_assignments` point to the **policy**, so people always acknowledge the current published version.
- `policy_read_events` and `policy_acknowledgements` are the evidence. `policy_questions` and `policy_exceptions` support consultation.

## 3. Life cycle

draft → in review → approved → published → superseded or archived. A reviewer asking for changes sends it back to draft. Publishing supersedes the old version, updates `current_version_id`, and if re-acknowledgement is required everybody assigned goes back to **Re-acknowledge** and gets a notification.

## 4. Security decisions and why

| Decision | Why |
| --- | --- |
| Identity only from the session | The old branch accepted `userId` in the body: an IDOR and spoofing flaw (OWASP A01). |
| Server-side RBAC and object checks, 404 for other people's receipts and other departments | The UI can be bypassed; 404 does not reveal that a record exists. |
| Published versions are immutable (409) | Acknowledgements are evidence about a specific text. Changing it silently would make them worthless. |
| SHA-256 of the exact text stored with each acknowledgement | Proves which words the person agreed to; any change gives a different fingerprint. |
| Version, statement and hash taken from the server's record | The browser cannot claim a different version or wording. |
| Read-to-end recorded on the server with a minimum reading time | Clicking "I agree" without scrolling, or calling the API directly, is refused. |
| Typed full name must match the account | A deliberate act, like signing, which strengthens the evidence (NIST SP 800-53 PL-4). |
| Separation of duties | An author cannot be a reviewer or approve their own version (403); an admin cannot decide their own exception. |
| Two reviewer groups required | IT and non-IT agreement before publication (LO3). |
| Only published policies can be assigned (400) | Fixed on the server; the first version only hid drafts in the form. |
| Safe markdown and a diff returned as data | No HTML parsing anywhere, strict CSP, so stored XSS in policy text is not possible. |
| Formula-safe CSV | Prevents CSV injection when HR opens evidence in Excel. |
| Audit with the real actor | Every create, edit, submit, review, publish, supersede, archive, assign, read, acknowledge, question, exception, reminder and export. Never passwords or session IDs. |

## 5. Ethical use of employee data

- **Minimisation:** user, version, time, statement, typed name, hash, read times and browser family only. No IP address, no full user-agent.
- **Transparency:** a privacy notice on My policies.
- **Least access:** managers see their department's status only; receipts are private; public answers do not name the asker.
- **Access right:** employees download their own record.
- **Retention:** 6 years after a version is replaced (`POLICY_EVIDENCE_RETENTION_YEARS`), purged automatically and audited.

## 6. Likely viva questions

1. **Why hash the policy text?** So the evidence proves exactly what the employee saw. If someone edited the text later, the stored hash would no longer match the version's hash.
2. **Why can't published versions be edited?** Because people have acknowledged them. Any change becomes a new version with a change summary, a review and, if needed, re-acknowledgement. The old version stays as historical evidence.
3. **How does this show consensus between IT and non-IT staff?** Submission needs reviewers from at least two groups, for example IT (System Admin) and Management (a department manager). Publishing is blocked until all of them approve, and any reviewer can send it back with comments.
4. **What happens after a new version?** The previous version becomes superseded. If the change needs re-acknowledgement, everyone assigned moves to Re-acknowledge with a new deadline and is notified. Minor wording changes can keep existing acknowledgements valid.
5. **How do you know they actually read it?** The server records first open and the time the end was reached, and refuses "end" before a minimum reading time. It cannot prove understanding; that is what Chanuka's quizzes are for.
6. **What is stored in acknowledgement evidence?** Receipt ID, user, version, statement, typed name, time, SHA-256 and browser family.
7. **Who can assign policies?** Security/HR Admin and System Admin, checked on the server, and only for policies with a published version.
8. **Can a manager see another department?** No. The server pins managers to their own department and returns 404 for anyone else.
9. **How does this meet ISO/IEC 27001 A 5.1?** Defined (editor), approved (review workflow), published (immutable versions), communicated (assignments and notifications), acknowledged (receipts), reviewed at planned intervals (review dates and calendar).
10. **Why restrict uploads?** There is no file upload: policies are text, so there is no malicious-file risk.
