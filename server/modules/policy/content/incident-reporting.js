import { SRC } from "./sources.js";

export default {
  slug: "incident-reporting",
  title: "Information Security Incident Reporting Policy",
  category: "Incident Management",
  visibility: "assigned",
  reviewDays: 240,
  sources: [SRC.SP800_61, SRC.PDPA, SRC.SLCERT, SRC.ISO27001],
  versions: [{
    label: "1.0",
    publishedDaysAgo: 100,
    summary: "What counts as a security incident, how to report it quickly, and what not to do.",
    changeSummary: "First approved version.",
    body: `## 1. Purpose

Fast reporting limits the damage from security incidents. This policy tells every member of staff what to report, how to report it, and what to avoid doing, in a "report fast, no blame" culture.

## 2. Scope

All employees, managers, interns and contractors, and all incidents and suspected incidents affecting Biztat or client information, systems or devices.

## 3. Roles and responsibilities

- **Everyone** reports incidents and suspected incidents immediately.
- **The Information Security team** receives reports, decides the severity, coordinates the response and decides on any external notification.
- **Managers** support their team to report and never discourage or punish honest reporting.

## 4. Policy statements

### 4.1 What to report

You **must** report any of the following, even if you are not sure it is an incident:

- a lost or stolen laptop, phone, USB drive or paper file;
- an email or file sent to the wrong person;
- a suspicious email, call or message, or a link you clicked by mistake;
- an unexpected MFA prompt or a sign-in alert you do not recognise;
- a malware or ransomware warning, or a device behaving strangely;
- someone asking for your password or for client data without a clear reason.

### 4.2 How to report

1. Report **immediately**, using the **Report phishing** button for emails, or by contacting the IT Service Desk or the Information Security team directly.
2. Give the facts you know: what happened, when, which device or account, and what information may be affected.
3. If you cannot reach the security team, tell your manager, who **must** pass the report on straight away.

### 4.3 What not to do

1. You **must not** try to investigate the incident yourself, for example by opening a suspicious attachment again.
2. You **must not** switch off an affected device unless the security team tells you to. Disconnect it from the network instead.
3. You **must not** delete evidence such as suspicious emails before they have been reported.
4. You **must not** contact clients, the media or external bodies about an incident unless the security team asks you to.

### 4.4 Personal data breaches and external reporting

An incident affecting personal data may be a personal data breach under Sri Lanka's Personal Data Protection Act, No. 9 of 2022. The Information Security team decides whether to notify the Data Protection Authority, affected clients or Sri Lanka CERT. Fast internal reporting gives the team time to meet these duties.

### 4.5 No-blame reporting

Staff who report an incident in good faith, including their own mistakes, **will not** be disciplined for reporting. Hiding an incident is a breach of this policy.

## 5. Compliance and enforcement

Reports are recorded and reviewed after each incident so lessons can be learned. Failing to report a known incident may lead to disciplinary action.

## 6. Exceptions

There are no exceptions to the duty to report.

## 7. Related documents

- Information Security Policy
- Data Classification and Handling Policy
- Training course: Security Incident Reporting

## 8. Definitions

- **Security event**: something observed that may affect security, such as a failed sign-in.
- **Security incident**: an event that actually or probably harms the confidentiality, integrity or availability of information.
- **Personal data breach**: an incident that affects personal data.

## 9. Review cycle

Reviewed every year and after any major incident.

## 10. Version history

- **1.0**: first approved version.

> [!NOTE] Alignment
> Based on NIST SP 800-61 Rev. 3 and aligned with ISO/IEC 27001:2022 Annex A 5.24 to 5.28 and 6.8 (information security event reporting).`
  }]
};
