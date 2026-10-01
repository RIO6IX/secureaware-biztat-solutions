import { SRC } from "./sources.js";

// Seeded as a draft in review (IT reviewer approved, Management reviewer pending) so the
// demo can show the approval workflow.

export default {
  slug: "byod",
  title: "Bring Your Own Device (BYOD) Policy",
  category: "Devices",
  visibility: "assigned",
  reviewDays: 365,
  sources: [SRC.SP800_124, SRC.SP800_46, SRC.ISO27001],
  versions: [{
    label: "1.0",
    inReview: true,
    summary: "Conditions for using a personal phone, tablet or laptop for Biztat work.",
    changeSummary: "First draft for review.",
    body: `## 1. Purpose

Some Biztat staff want to read email or use collaboration tools on their own phone or laptop. This policy sets the conditions that protect Biztat and client information on personal devices, while respecting staff privacy.

## 2. Scope

Any personal smartphone, tablet or laptop used to access Biztat email, files, collaboration tools or client systems.

## 3. Roles and responsibilities

- **Staff** who choose to use a personal device register it and follow this policy.
- **IT** approves devices, manages the work profile and can remove Biztat data from the device.
- **The Information Security team** owns this policy.

## 4. Policy statements

1. A personal device **must** be registered with IT before it is used for Biztat work.
2. The device **must** run an operating system version that still receives security updates, and updates **must** be installed promptly.
3. The device **must** have a screen lock (PIN of at least 6 digits, or biometrics) and encryption switched on.
4. Biztat data **must** be kept inside the managed work profile or approved apps, and **must not** be copied to personal apps, personal cloud storage or personal backups.
5. Jailbroken or rooted devices **must not** be used.
6. Restricted information **must not** be stored on personal devices.
7. You **must** report the loss or theft of a registered device immediately so IT can remove Biztat data.
8. When you leave Biztat, or stop using the device for work, IT **will** remove the work profile and Biztat data.

### Privacy

IT manages only the work profile. Biztat **will not** access personal photos, messages, browsing history or location on a personal device.

## 5. Compliance and enforcement

Devices that fall out of compliance (for example, an outdated operating system) lose access to Biztat services until fixed.

## 6. Exceptions

Exceptions need approval in SecureAware from the Information Security team.

## 7. Related documents

- Remote and Hybrid Work Security Policy
- Acceptable Use Policy
- Data Classification and Handling Policy

## 8. Definitions

- **Work profile**: a separate, managed area on a device that holds Biztat apps and data.
- **Jailbroken or rooted**: a device whose built-in security restrictions have been removed.

## 9. Review cycle

Reviewed every year.

## 10. Version history

- **1.0**: first draft for review.

> [!NOTE] Alignment
> Based on NIST SP 800-124 Rev. 2 and NIST SP 800-46 Rev. 2, and aligned with ISO/IEC 27001:2022 Annex A 8.1 (user endpoint devices).`
  }]
};
