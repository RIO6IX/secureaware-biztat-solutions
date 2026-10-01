import { SRC } from "./sources.js";

export default {
  slug: "remote-hybrid-work",
  title: "Remote and Hybrid Work Security Policy",
  category: "Remote Work",
  visibility: "assigned",
  reviewDays: -5,
  sources: [SRC.SP800_46, SRC.ISO27001],
  versions: [{
    label: "1.0",
    publishedDaysAgo: 150,
    summary: "Security rules for working from home, client sites and public places.",
    changeSummary: "First approved version.",
    body: `## 1. Purpose

Many Biztat staff work part of the week at home, at client sites or while travelling. This policy sets the security rules that keep Biztat and client information safe outside the office.

## 2. Scope

Everyone who works on Biztat information outside a Biztat office, on company devices or on personal devices approved under the BYOD Policy.

## 3. Roles and responsibilities

- **Staff** follow this policy wherever they work.
- **Managers** approve remote working arrangements and make sure their team has the right equipment.
- **IT** provides the VPN, keeps company devices updated and encrypted, and supports staff remotely.

## 4. Policy statements

### 4.1 Network connections

1. You **must** connect to Biztat systems through the company VPN or approved cloud services that use encryption (HTTPS).
2. You **must not** use public Wi-Fi without the VPN switched on. A mobile hotspot from your own phone is preferred.
3. Your home Wi-Fi **must** use WPA2 or WPA3 with a strong password, and the router's default admin password **must** be changed.

### 4.2 Devices

1. Company devices **must** have full-disk encryption, a screen lock of 5 minutes or less, and automatic updates switched on.
2. You **must** install operating system and application updates within 14 days of release, or sooner for critical updates.
3. Family members or other people **must not** use a company device.

### 4.3 Physical security in public places

1. You **must** lock your screen whenever you leave your device, even briefly.
2. You **must** take care that other people cannot see your screen or overhear confidential calls. A privacy filter is recommended when travelling.
3. Devices and paper documents **must not** be left unattended in vehicles or public places.

### 4.4 Lost or stolen devices

1. You **must** report a lost or stolen device to IT and the Information Security team **immediately**, and in any case within one hour of noticing.
2. IT will lock or wipe the device remotely and reset related passwords.

## 5. Compliance and enforcement

IT monitors company devices for encryption and update status. Repeated non-compliance may lead to remote working being withdrawn.

## 6. Exceptions

Exceptions, for example working from a country with restrictions on encryption, need approval in SecureAware before travel.

## 7. Related documents

- Bring Your Own Device (BYOD) Policy
- Clean Desk and Clear Screen Policy
- Information Security Incident Reporting Policy
- Training course: Safe Remote and Hybrid Work

## 8. Definitions

- **VPN**: an encrypted connection between your device and Biztat's network.
- **Full-disk encryption**: encryption that protects all data on a device if it is lost or stolen.

## 9. Review cycle

Reviewed every year. This version is due for review.

## 10. Version history

- **1.0**: first approved version.

> [!NOTE] Alignment
> Based on NIST SP 800-46 Rev. 2 (telework and remote access security) and aligned with ISO/IEC 27001:2022 Annex A 6.7 (remote working) and 8.1 (user endpoint devices).`
  }]
};
