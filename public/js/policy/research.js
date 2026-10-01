// Research basis and standards alignment for the policy module. Every statement here was
// checked against the linked source on 2026-10-01. Alignment, not certification.
import { h, mount, externalLink } from "../core/dom.js";
import { pageHeader, table } from "../core/ui.js";

const FRAMEWORKS = [
  {
    name: "ISO/IEC 27001:2022 Annex A 5.1 – Policies for information security",
    url: "https://www.iso.org/standard/27001",
    summary: "Information security policy and topic-specific policies shall be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties, and reviewed at planned intervals and if significant changes occur.",
    mapping: [
      ["Defined", "Policy editor with a fixed ten-section structure; drafts are stored as versions."],
      ["Approved by management", "Review workflow: at least two reviewers from different groups (IT and HR, Legal or Management) must approve before publishing. Authors cannot approve their own version."],
      ["Published", "Publishing makes a version current and supersedes the previous one. Published text can never be edited (409)."],
      ["Communicated", "Assignments by department, role or user, with notifications and manager reminders."],
      ["Acknowledged", "Read-to-end check on the server, attestation, typed name and a SHA-256 fingerprint of the exact text, with a receipt."],
      ["Reviewed at planned intervals and after significant changes", "Next review date on every version, the review calendar, and the new-version workflow with re-acknowledgement."]
    ]
  },
  {
    name: "ISO/IEC 27002:2022 control 5.1 – implementation guidance",
    url: "https://www.iso.org/standard/75652.html",
    summary: "Guidance for the top-level information security policy and topic-specific policies (for example access control, classification, acceptable use, remote working), and for reviewing them when the business, law or threats change.",
    mapping: [
      ["Top-level and topic-specific policies", "Information Security Policy plus seven topic-specific policies seeded for Biztat."],
      ["Review on change", "Change summaries, version comparison and the option to require re-acknowledgement for significant changes."]
    ]
  },
  {
    name: "NIST Cybersecurity Framework 2.0 – GV.PO (Govern: Policy)",
    url: "https://www.nist.gov/cyberframework",
    summary: "GV.PO-01: policy for managing cybersecurity risks is established based on organisational context, strategy and priorities, and is communicated and enforced. GV.PO-02: the policy is reviewed, updated, communicated and enforced to reflect changes in requirements, threats, technology and mission.",
    mapping: [
      ["GV.PO-01 established, communicated, enforced", "Owners, approval workflow, assignments and compliance status with overdue tracking."],
      ["GV.PO-02 reviewed and updated", "Review calendar, version history and re-acknowledgement after major changes."]
    ]
  },
  {
    name: "NIST SP 800-53 Rev. 5 PL-4 (Rules of Behavior) and NIST SP 800-12 Rev. 1",
    url: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    summary: "PL-4 requires a documented acknowledgement that individuals have read, understand and agree to abide by the rules of behaviour, and re-acknowledgement when the rules are revised. SP 800-12 explains why awareness of rules is part of an organisation's security programme.",
    mapping: [
      ["Documented acknowledgement", "Attestation text \"I have read, understood and agree to comply…\" stored with the typed name, time and content hash."],
      ["Re-acknowledge after revision", "Publishing a version that requires re-acknowledgement moves everyone back to Action required."]
    ]
  },
  {
    name: "Sri Lanka Personal Data Protection Act, No. 9 of 2022 (as amended by Act No. 22 of 2025)",
    url: "https://www.parliament.lk/uploads/acts/gbills/english/6242.pdf",
    summary: "Gazette Extraordinary No. 2498/16 (22 July 2026) appoints 1 January 2027 for Part I (processing of personal data) and Part III (controllers and processors). The module applies the Act's principles to the employee data it records.",
    mapping: [
      ["Data minimisation", "Only user, version, time, statement, content hash and browser family are stored – no IP address or full user-agent."],
      ["Transparency", "Privacy notice on My policies explains what is recorded, why, who sees it and for how long."],
      ["Access by the individual", "Employees can view and download their own acknowledgement record (CSV)."],
      ["Storage limitation", "Evidence is deleted 6 years after the version is replaced."],
      ["Access control", "Managers see only their own department; receipts are private to the holder and administrators."]
    ]
  }
];

const SOURCES = [
  ["NIST SP 800-63B-4 (August 2025) – Password and Authentication Policy", "https://pages.nist.gov/800-63-4/sp800-63b.html"],
  ["NIST SP 800-61 Rev. 3 (April 2025) – Incident Reporting Policy", "https://csrc.nist.gov/pubs/sp/800/61/r3/final"],
  ["NIST SP 800-46 Rev. 2 – Remote Work and BYOD", "https://csrc.nist.gov/pubs/sp/800/46/r2/final"],
  ["NIST SP 800-124 Rev. 2 – BYOD Policy", "https://csrc.nist.gov/pubs/sp/800/124/r2/final"],
  ["NIST SP 800-88 Rev. 2 (September 2025) – media sanitisation", "https://csrc.nist.gov/pubs/sp/800/88/r2/final"],
  ["Gazette Extraordinary No. 2498/16 – PDPA commencement", "https://documents.gov.lk/view/egz/2026/7/2498-16_E.pdf"],
  ["Data Protection Authority of Sri Lanka", "https://www.dpa.gov.lk/"],
  ["Sri Lanka CERT – report an incident", "https://cert.gov.lk/report_incident"]
];

export function researchPage(container) {
  mount(container, h("div", { class: "stack" },
    pageHeader("Policy module: research basis", "How SecureAware's policy management follows recognised standards. This is an alignment statement, not a certification claim."),
    h("div", { class: "research-list" }, FRAMEWORKS.map((framework) => h("section", { class: "panel" },
      h("h2", {}, externalLink(framework.url, framework.name)),
      h("p", {}, framework.summary),
      table([{ label: "Requirement", render: (row) => row[0] }, { label: "How SecureAware implements it", render: (row) => row[1] }], framework.mapping, { caption: framework.name })))),
    h("section", { class: "panel" },
      h("h2", {}, "Sources used in the seeded policies"),
      h("ul", {}, SOURCES.map(([label, url]) => h("li", {}, externalLink(url, label))))),
    h("section", { class: "panel" },
      h("h2", {}, "Assumptions to validate with Biztat"),
      h("ul", {},
        h("li", {}, "Who approves policies for Biztat management, and which reviewer groups are mandatory."),
        h("li", {}, "The four-level classification scheme and the approved tools named in the policies."),
        h("li", {}, "The 6-year evidence retention period against Biztat's records schedule.")))));
}
