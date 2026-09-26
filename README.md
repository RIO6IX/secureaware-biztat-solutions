# SecureAware - Biztat Solutions

SecureAware is an academic information security policy awareness and compliance management prototype for IE3072. The repository is split by contribution branch while sharing the same secure foundation.

## Branches

- `main`: shared secure foundation.
- `chanuka`: Member 3 - Security Training + Quiz & Assessment.
- `sanduni`: Member 2 - Policy Management + Assignment + Acknowledgement.

## Run

```bash
npm run dev
```

Open `http://127.0.0.1:4000`.

No external npm packages are required.

## Test

```bash
npm run build
npm test
```

## Seed Accounts

| Role | Username | Password |
| --- | --- | --- |
| Employee | `employee.demo` | `EmployeePass!2026` |
| Department Manager | `manager.demo` | `ManagerPass!2026` |
| Security/HR Admin | `security.admin` | `AdminPass!2026` |
| System Admin | `system.admin` | `SystemPass!2026` |

## Architecture

```text
Browser UI
   |
Node HTTP server
   |
Auth/RBAC/Audit foundation
   |
Module services on contribution branches
   |
SQLite database
```

## ER Overview

```text
users -> sessions
users -> audit_events
users -> policy/training records on module branches
```

## Backup and Restore

```bash
npm run backup
npm run restore -- data/backups/<backup-file>.sqlite
```
