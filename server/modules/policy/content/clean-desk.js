import { SRC } from "./sources.js";

export default {
  slug: "clean-desk-clear-screen",
  title: "Clean Desk and Clear Screen Policy",
  category: "Physical Security",
  visibility: "all",
  reviewDays: 200,
  sources: [SRC.ISO27001, SRC.ISO27002],
  versions: [{
    label: "1.0",
    publishedDaysAgo: 80,
    summary: "Keep desks, screens, printers and meeting rooms free of information that others should not see.",
    changeSummary: "First approved version.",
    body: `## 1. Purpose

Information left on desks, screens, whiteboards and printers can be seen, photographed or taken by visitors, cleaners or other staff. This policy reduces that risk.

## 2. Scope

All Biztat offices, client sites where Biztat staff work, and home working spaces.

## 3. Roles and responsibilities

- **Staff** keep their own desk and screen clear.
- **Managers** remind their teams and arrange secure storage.
- **Office management** provides lockable storage and confidential waste bins.

## 4. Policy statements

1. Confidential and Restricted papers **must** be locked away when you leave your desk for a long period and at the end of each day.
2. You **must** lock your screen (Windows key + L, or Control + Command + Q on a Mac) whenever you leave your device.
3. Devices **must** lock automatically after no more than 5 minutes without use.
4. Printouts **must** be collected immediately. Use secure (PIN) printing for Confidential documents where it is available.
5. Whiteboards and flip charts **must** be wiped or removed after meetings.
6. Passwords **must not** be written on notes, keyboards or monitors.
7. Paper containing Internal, Confidential or Restricted information **must** be put in confidential waste bins or shredded, not in ordinary bins.
8. Visitors **must** be accompanied in areas where client information is handled.

## 5. Compliance and enforcement

The Information Security team carries out occasional walk-round checks and reports results to managers without naming individuals for a first finding.

## 6. Exceptions

None expected. Ask the Information Security team if your role makes this policy hard to follow.

## 7. Related documents

- Data Classification and Handling Policy
- Remote and Hybrid Work Security Policy

## 8. Definitions

- **Clear screen**: a locked or logged-off screen showing no information.
- **Secure printing**: printing that releases the document only when the owner enters a PIN or badge at the printer.

## 9. Review cycle

Reviewed every year.

## 10. Version history

- **1.0**: first approved version.

> [!NOTE] Alignment
> Aligned with ISO/IEC 27001:2022 Annex A 7.7 (clear desk and clear screen).`
  }]
};
