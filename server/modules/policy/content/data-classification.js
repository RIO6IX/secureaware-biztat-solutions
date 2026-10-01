import { SRC } from "./sources.js";

// PDPA status checked on 2026-10-01: Gazette Extraordinary No. 2498/16 (22 July 2026)
// appoints 1 January 2027 for Sections 2 and 3, Part I and Part III. The Data Protection
// Authority provisions have operated since 2023. Classification levels are Biztat's own.

export default {
  slug: "data-classification",
  title: "Data Classification and Handling Policy",
  category: "Data Protection",
  visibility: "assigned",
  reviewDays: 25,
  sources: [SRC.PDPA, SRC.GAZETTE_2498, SRC.DPA, SRC.ISO27001, SRC.SP800_88],
  versions: [{
    label: "1.0",
    publishedDaysAgo: 60,
    summary: "Four classification levels and the handling rules for each, including personal data under Sri Lanka's PDPA.",
    changeSummary: "First approved version.",
    body: `## 1. Purpose

This policy makes sure Biztat Solutions information, and especially client and personal data, is protected according to how sensitive it is. It also prepares Biztat for the obligations of Sri Lanka's Personal Data Protection Act.

## 2. Scope

All information created, received or held by Biztat, in any format (electronic, paper or spoken), and everyone who handles it.

## 3. Roles and responsibilities

- **Information owners** (usually the manager responsible for a client or process) decide the classification and who may access the information.
- **Every user** labels and handles information according to its classification.
- **The Information Security team** owns this policy and advises on difficult cases.
- **The Data Protection Officer role** (held by the Information Security lead until a separate appointment) coordinates personal data matters.

## 4. Policy statements

### 4.1 Classification levels

1. **Public**: approved for anyone to see, for example published marketing material.
2. **Internal**: for Biztat staff only; limited harm if disclosed, for example internal procedures.
3. **Confidential**: limited to named teams; serious harm if disclosed, for example client contracts, financial records and most personal data.
4. **Restricted**: limited to named individuals; severe harm if disclosed, for example credentials, encryption keys, national identity numbers in bulk, and client data classed as sensitive.

If you are unsure, treat information as **Confidential** and ask the information owner.

### 4.2 Handling rules

- **Storage**: Public and Internal may be stored in approved company locations. Confidential and Restricted **must** be stored only in approved, access-controlled locations, and Restricted **must** be encrypted.
- **Sharing**: Confidential **must** be shared only with people who need it, using approved sharing links with expiry dates. Restricted **must** be shared only with named individuals approved by the owner.
- **Email**: Confidential and Restricted **must not** be sent to personal email accounts. Restricted **must** be sent only encrypted or through an approved secure transfer service.
- **Printing**: Confidential and Restricted **must** be collected from the printer immediately, and Restricted printing **must** be avoided where possible.
- **Removable media**: Confidential and Restricted **must not** be copied to USB drives unless the drive is company-issued and encrypted.
- **Disposal**: paper **must** be shredded. Storage media **must** be sanitised or destroyed by IT using methods based on NIST SP 800-88 before reuse or disposal.

### 4.3 Personal data

1. Personal data is any information that can identify a person directly or indirectly, for example a name, an identification number, location data or an online identifier.
2. Biztat **must** collect only the personal data it needs for a specified purpose, keep it accurate, keep it no longer than necessary, and protect it with appropriate measures such as access control and encryption.
3. Personal data **must** be classified as at least **Confidential**.
4. A suspected personal data breach **must** be reported immediately under the Incident Reporting Policy.

### 4.4 Legal status of the PDPA

Sri Lanka's **Personal Data Protection Act, No. 9 of 2022**, as amended by the **Personal Data Protection (Amendment) Act, No. 22 of 2025**, is being brought into operation in stages. The provisions establishing the Data Protection Authority have operated since 2023. **Gazette Extraordinary No. 2498/16 (22 July 2026)** appoints **1 January 2027** for Sections 2 and 3, Part I (processing of personal data) and Part III (controllers and processors). Biztat applies the Act's principles now as good practice. The Information Security team checks the Data Protection Authority's website for new orders.

## 5. Compliance and enforcement

Managers check that their teams handle information correctly. Mishandling Confidential or Restricted information may lead to disciplinary action.

## 6. Exceptions

Exceptions, for example a client that requires a specific transfer tool, must be requested in SecureAware and approved by the information owner and the Information Security team.

## 7. Related documents

- Information Security Policy
- Acceptable Use Policy
- Clean Desk and Clear Screen Policy
- Information Security Incident Reporting Policy

## 8. Definitions

- **Information owner**: the person accountable for a set of information and its classification.
- **Personal data**: information that identifies a living person directly or indirectly.
- **Sanitisation**: making data on storage media impossible to recover.

## 9. Review cycle

Reviewed every year and whenever a new PDPA commencement order or DPA rule is published.

## 10. Version history

- **1.0**: first approved version.

> [!NOTE] Alignment
> Aligned with ISO/IEC 27001:2022 Annex A 5.12 (classification), 5.13 (labelling), 5.14 (information transfer) and 7.10 (storage media), and with the PDPA principles.`
  }]
};
