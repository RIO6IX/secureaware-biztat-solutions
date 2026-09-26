# Testing Matrix

| Requirement | Test Evidence | Status |
| --- | --- | --- |
| FR-01 Login | `npm test` login test | Passing |
| FR-03 RBAC | `npm test` employee audit denial | Passing |
| FR-17 Audit | `npm test` admin audit access | Passing |
| NFR-01 Password hashing | Code review: scrypt with per-user salt | Implemented |
| NFR-04 Session timeout | Code review: idle expiry refresh | Implemented |
| NFR-07 Audit privacy | Code review: passwords are never logged | Implemented |
| NFR-14 Backup | `npm run backup`, `npm run restore -- <file>` | Implemented |

Manual checklist to complete after module merges:
- Chrome and Edge desktop smoke test.
- Mobile viewport navigation.
- Keyboard-only login and table navigation.
- Negative role tests for policy and training APIs.

