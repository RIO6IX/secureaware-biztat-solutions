import { SRC } from "./sources.js";

// Kept consistent with docs/ACCEPTABLE_USE_POLICY.md (the team's graded deliverable):
// credential protection, no account sharing, MFA for administrators, no executable uploads,
// no bypassing access controls, prompt reporting of misuse, and the same alignment claim.

const sections = (statements, history) => `## 1. Purpose

This policy explains how Biztat Solutions information, systems and services may be used, so that staff can work productively without putting client or company information at risk.

## 2. Scope

This policy applies to everyone who uses Biztat information or systems: employees, managers, interns and external contractors. It covers company laptops, approved personal devices, email, collaboration tools, cloud services, the SecureAware system and Biztat's internet connection.

## 3. Roles and responsibilities

- **Every user** follows this policy, protects their credentials and reports suspected misuse.
- **Department managers** make sure their team has acknowledged the current version and raise concerns with the Information Security team.
- **The Information Security team** owns this policy, answers questions about it and investigates suspected breaches.
- **Administrators** assign only appropriate work, avoid collecting unnecessary personal data and review audit evidence responsibly.

## 4. Policy statements

### 4.1 Accounts and credentials

${statements.accounts}

### 4.2 Acceptable use

${statements.acceptable}

### 4.3 Prohibited use

${statements.prohibited}

### 4.4 Email, messaging and the internet

${statements.email}
${statements.extra || ""}
### 4.${statements.extra ? 6 : 5} Monitoring and privacy

1. Biztat systems record security events (for example sign-ins, administrative changes and policy acknowledgements) to protect information and investigate incidents.
2. Monitoring records **must not** contain passwords or session secrets, and are accessible only to authorised staff.
3. Personal use of Biztat systems is allowed only if it is occasional, lawful and does not interfere with work or security.

## 5. Compliance and enforcement

Acknowledgement of this policy is recorded in SecureAware against the exact version shown. Breaches may lead to removal of access and disciplinary action under Biztat's HR procedures. Contractors may have their contract ended.

## 6. Exceptions

Any exception must be requested in SecureAware with a business justification. Approved exceptions are time-limited and recorded.

## 7. Related documents

- Information Security Policy
- Password and Authentication Policy
- Data Classification and Handling Policy
- Information Security Incident Reporting Policy

## 8. Definitions

- **Information asset**: any information, system, device or service used for Biztat work.
- **Malware**: software designed to damage systems or steal information, including ransomware and spyware.
- **Shadow IT**: software or cloud services used for work without approval from IT.

## 9. Review cycle

This policy is reviewed every year, and sooner when new technology (such as a new collaboration or AI tool) changes how staff work.

## 10. Version history

${history}

> [!NOTE] Standards alignment
> Aligned with ISO/IEC 27001:2022 Annex A 5.1, 5.10 and 6.3, NIST CSF 2.0 Protect – Awareness and Training, and NIST SP 800-53 PL-4 (rules of behaviour with documented acknowledgement). This is an alignment claim, not certification.`;

const accounts = `1. You **must** keep your password and MFA device private and **must not** share your account with anyone, including colleagues and IT staff.
2. You **must** lock your screen when you leave your device.
3. Administrator accounts **must** use multi-factor authentication (MFA).
4. You **must** report a lost device or a suspected compromised account immediately.`;

const acceptable = `1. Use Biztat systems for Biztat work: reading and acknowledging assigned policies, completing assigned training, and serving clients.
2. Store work files only in approved company locations so that they are backed up and protected.
3. Install software only from Biztat's approved catalogue or with IT approval.`;

const prohibitedV10 = `1. You **must not** attempt to bypass or disable security controls, including antivirus, VPN and access controls.
2. You **must not** access, change or delete another person's records without authorisation.
3. You **must not** upload executable files or install unapproved software.
4. You **must not** enter confidential Biztat or client data into unapproved services.
5. You **must not** use Biztat systems for illegal, harassing or offensive content.`;

const prohibitedV11 = `${prohibitedV10}
6. You **must not** forward Biztat or client information to a personal email account or personal cloud storage.`;

const emailV10 = `1. Treat unexpected attachments and links with caution and report suspected phishing.
2. Do not send Confidential or Restricted information by email unless it is protected as described in the Data Classification and Handling Policy.`;

const emailV11 = `1. Treat unexpected attachments and links with caution and report suspected phishing with the **Report phishing** button. Do not just delete it.
2. Do not send Confidential or Restricted information by email unless it is protected as described in the Data Classification and Handling Policy.
3. Verify any request to change bank details or make an urgent payment by calling a known number, not one given in the message.`;

const aiTools = `
### 4.5 Generative AI tools

1. You **may** use only the generative AI tools approved by IT for Biztat work.
2. You **must not** enter client data, personal data, credentials or Confidential or Restricted information into any AI tool that is not approved for that classification.
3. You **must** check AI-generated output for accuracy before using it in client work, and remain responsible for it.
`;

export default {
  slug: "acceptable-use",
  title: "Acceptable Use Policy",
  category: "Acceptable Use",
  visibility: "assigned",
  reviewDays: 20,
  sources: [SRC.ISO27001, SRC.ISO27002, SRC.SP800_53_PL4],
  versions: [
    {
      label: "1.0",
      publishedDaysAgo: 200,
      summary: "Rules for using Biztat information, systems and services safely.",
      changeSummary: "First approved version.",
      body: sections({ accounts, acceptable, prohibited: prohibitedV10, email: emailV10 }, "- **1.0**: first approved version.")
    },
    {
      label: "1.1",
      publishedDaysAgo: 10,
      requiresReack: true,
      summary: "Rules for using Biztat information, systems and services safely, including generative AI tools.",
      changeSummary: "Adds a new section on generative AI tools (4.5). Prohibits forwarding work information to personal email or cloud storage. Requires suspected phishing to be reported with the Report phishing button, and payment-change requests to be verified by phone. Everyone must acknowledge this version again.",
      body: sections({ accounts, acceptable, prohibited: prohibitedV11, email: emailV11, extra: aiTools },
        "- **1.0**: first approved version.\n- **1.1**: generative AI section; ban on personal email and cloud forwarding; phishing reporting and payment verification.")
    }
  ]
};
