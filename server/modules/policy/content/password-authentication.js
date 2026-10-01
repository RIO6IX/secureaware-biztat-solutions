import { SRC } from "./sources.js";

// Password rules follow NIST SP 800-63B-4 (final, August 2025), section 3.1.1:
// 15-character minimum for a password used as the only factor, no composition rules,
// no forced periodic change (change on evidence of compromise), blocklist screening.
// SecureAware's own password-change endpoint (validatePasswordPolicy in server/index.js)
// applies the same rules.

export default {
  slug: "password-authentication",
  title: "Password and Authentication Policy",
  category: "Access Control",
  visibility: "assigned",
  reviewDays: 330,
  sources: [SRC.SP800_63B, SRC.CISA_MFA, SRC.ISO27001],
  versions: [{
    label: "1.0",
    publishedDaysAgo: 90,
    summary: "How Biztat staff create passwords and use multi-factor authentication, following NIST SP 800-63B-4.",
    changeSummary: "First approved version. Replaces the old rules on complexity and 90-day expiry with NIST SP 800-63B-4 guidance.",
    body: `## 1. Purpose

This policy sets out how Biztat Solutions protects accounts with passwords and multi-factor authentication (MFA). It follows the current US National Institute of Standards and Technology guidance, NIST SP 800-63B-4 (August 2025), which favours long, memorable passwords over complex rules that lead to predictable patterns.

## 2. Scope

All Biztat accounts: company email and collaboration tools, client systems accessed by Biztat staff, cloud services, and the SecureAware system. It applies to employees, managers, interns and contractors.

## 3. Roles and responsibilities

- **Every user** creates strong passwords, keeps them private and uses MFA where it is available.
- **IT** configures systems to enforce this policy and provides the approved password manager.
- **System owners** make sure their systems meet the technical requirements in section 4.3.

## 4. Policy statements

### 4.1 Creating passwords

1. A password used as the **only** factor **must** be at least **15 characters** long. A passphrase of four or more unrelated words is recommended.
2. Systems **must not** require a mix of character types (for example "one capital, one number, one symbol"). All printable characters and spaces **must** be allowed.
3. Systems **must** allow passwords of at least 64 characters.
4. A new password **must** be checked against a list of breached, common or context-specific passwords (such as "Biztat2026") and refused if it matches.
5. You **must not** reuse a Biztat password on any other service.

### 4.2 Changing passwords

1. Passwords **must not** be changed on a fixed schedule (for example every 90 days).
2. A password **must** be changed immediately if there is any evidence or suspicion that it has been exposed, and the incident reported.
3. Systems **must not** use password hints or security questions to recover accounts.

### 4.3 Multi-factor authentication

1. MFA **must** be enabled on every Biztat service that supports it.
2. Administrator and privileged accounts **must** use **phishing-resistant MFA** (passkeys or FIDO2 security keys) where the service supports it.
3. You **must not** approve an MFA prompt you did not start. Report unexpected prompts to the Information Security team; they can mean someone knows your password.
4. SMS codes **may** be used only where no stronger option is available.

### 4.4 Password managers

1. Staff are encouraged to use the password manager approved by IT to create and store unique passwords.
2. Systems **must** allow passwords to be pasted, so that password managers work.

### 4.5 Protecting sign-in

1. Systems **must** limit repeated failed sign-in attempts. SecureAware locks an account for 15 minutes after five failures.
2. Error messages **must not** reveal whether the username or the password was wrong.

## 5. Compliance and enforcement

IT checks system configuration against this policy. Sharing passwords or approving unknown MFA prompts on purpose is a breach of the Acceptable Use Policy.

## 6. Exceptions

A system that cannot meet section 4 needs an exception approved in SecureAware, with compensating controls and an expiry date.

## 7. Related documents

- Information Security Policy
- Acceptable Use Policy
- Training course: Passwords, Passphrases and Multi-Factor Authentication

## 8. Definitions

- **Passphrase**: a password made of several words, which is long and easier to remember.
- **MFA**: signing in with two or more different factors, such as a password and a security key.
- **Phishing-resistant MFA**: an authenticator, such as a passkey, that will not work on a fake website.
- **Blocklist**: a list of passwords known to be breached or easy to guess.

## 9. Review cycle

Reviewed every year and whenever NIST updates SP 800-63B.

## 10. Version history

- **1.0**: first approved version, aligned with NIST SP 800-63B-4.

> [!NOTE] Source
> Requirements in sections 4.1 to 4.3 are based on NIST SP 800-63B-4, section 3.1.1 (passwords) and the MFA guidance from CISA Secure Our World.`
  }]
};
