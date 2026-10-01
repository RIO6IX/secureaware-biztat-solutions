import { SRC } from "./sources.js";

export default {
  slug: "information-security-policy",
  title: "Information Security Policy",
  category: "Governance",
  visibility: "all",
  reviewDays: 300,
  sources: [SRC.ISO27001, SRC.ISO27002, SRC.CSF2],
  versions: [{
    label: "1.0",
    publishedDaysAgo: 120,
    summary: "Biztat's top-level commitment to protecting client and company information, and the framework that every topic-specific policy sits under.",
    changeSummary: "First approved version.",
    body: `## 1. Purpose

This policy sets out how Biztat Solutions protects the confidentiality, integrity and availability of the information it holds for clients and for itself. It is the top-level policy of Biztat's information security management system (ISMS). Every topic-specific policy listed in section 7 supports it.

## 2. Scope

This policy applies to:

- all employees, managers, interns and external contractors of Biztat Solutions;
- all information Biztat creates, receives or stores, in any form, including client data;
- all systems, devices and services used for Biztat work, including cloud services and personal devices approved under the BYOD Policy.

## 3. Roles and responsibilities

- **Management** approves this policy, provides resources for information security and reviews the ISMS at least once a year.
- **The Information Security team** owns this policy and the topic-specific policies, maintains the risk register, and coordinates incident response.
- **Department managers** make sure their staff complete assigned policies and training, and follow up overdue items.
- **Every member of staff** follows Biztat's security policies, completes assigned training, and reports incidents and weaknesses promptly.

## 4. Policy statements

1. Biztat **must** identify and assess information security risks at least once a year and when significant changes occur, and treat them according to an approved risk treatment plan.
2. Topic-specific policies **must** be defined, approved by management, published, communicated to and acknowledged by relevant personnel, and reviewed at planned intervals and after significant changes.
3. Access to information **must** be granted on a least-privilege, need-to-know basis and removed promptly when no longer required.
4. Information **must** be classified and handled according to the Data Classification and Handling Policy.
5. Staff **must** complete security awareness training when they join and refresher training every year, plus any role-based training required by the Training Needs Matrix.
6. Security incidents and suspected weaknesses **must** be reported immediately under the Incident Reporting Policy.
7. Suppliers that handle Biztat or client information **must** agree to security requirements in their contracts.
8. Biztat **must** keep evidence of policy acknowledgement, training and incident handling, so that compliance can be demonstrated to clients and auditors.

## 5. Compliance and enforcement

Compliance is measured through the SecureAware system: policy acknowledgement rates, training completion and audit records. Breaches of this policy may lead to disciplinary action under Biztat's HR procedures and, where relevant, to termination of contracts.

## 6. Exceptions

Exceptions must be requested through SecureAware with a business justification. They are approved by the Information Security team, recorded, and expire on a fixed date.

## 7. Related documents

- Acceptable Use Policy
- Password and Authentication Policy
- Data Classification and Handling Policy
- Remote and Hybrid Work Security Policy
- Information Security Incident Reporting Policy
- Clean Desk and Clear Screen Policy
- Bring Your Own Device (BYOD) Policy

## 8. Definitions

- **Confidentiality**: information is available only to people who are authorised to see it.
- **Integrity**: information is accurate, complete and protected from unauthorised change.
- **Availability**: information and systems can be used when they are needed.
- **ISMS**: the policies, processes and controls Biztat uses to manage information security risk.

## 9. Review cycle

This policy is reviewed at least once a year by the Information Security team and approved by management, and sooner after a major incident, a significant change to the business, or a change in law.

## 10. Version history

| Version | Summary |
| --- | --- |
| 1.0 | First approved version. |

> [!NOTE] Standards alignment
> This policy is aligned with ISO/IEC 27001:2022 (clause 5.2 and Annex A 5.1) and NIST CSF 2.0 GV.PO. This is an alignment statement, not a certification claim.`
  }]
};
