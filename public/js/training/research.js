// Research basis: how the training programme maps to recognised frameworks. Every statement
// here was checked against the linked primary source on 2026-09-26.
import { h, mount, externalLink } from "../core/dom.js";
import { pageHeader, table } from "../core/ui.js";

const FRAMEWORKS = [
  {
    name: "NIST SP 800-50 Rev. 1 – Building a Cybersecurity and Privacy Learning Program (September 2024)",
    url: "https://csrc.nist.gov/pubs/sp/800/50/r1/final",
    summary: "Guidance for managing a Cybersecurity and Privacy Learning Program (CPLP) as a life cycle: Plan and Strategy; Analysis and Design; Development and Implementation; Assessment and Improvement. It combines awareness for everyone with role-based training and uses metrics to improve the programme.",
    mapping: [
      ["Plan and Strategy", "Mandatory courses and the Training Needs Matrix define who must learn what and by when."],
      ["Analysis and Design", "The matrix maps roles and departments to courses; each course lists learning objectives."],
      ["Development and Implementation", "Researched courses with interactive exercises, assignments with due dates and reminders."],
      ["Assessment and Improvement", "Server-scored quizzes, pass rates, average attempts and overdue reports feed course updates; course versions record changes."]
    ]
  },
  {
    name: "NIST Cybersecurity Framework 2.0 – PR.AT (Awareness and Training)",
    url: "https://www.nist.gov/cyberframework",
    summary: "PR.AT-01: personnel are provided with awareness and training so they can perform general tasks with cybersecurity risks in mind. PR.AT-02: individuals in specialised roles are provided with awareness and training for their relevant tasks.",
    mapping: [
      ["PR.AT-01 (everyone)", "Phishing, passwords/MFA, data handling and incident reporting are mandatory for all staff."],
      ["PR.AT-02 (specialised roles)", "Secure Development for the Development department; remote-work training for managers; all courses for administrators."]
    ]
  },
  {
    name: "ISO/IEC 27001:2022 Annex A 6.3 – Information security awareness, education and training",
    url: "https://www.iso.org/standard/27001",
    summary: "Personnel and relevant interested parties should receive appropriate awareness, education and training, and regular updates on policies and procedures relevant to their job function.",
    mapping: [
      ["Appropriate to job function", "Role- and department-based requirements in the Training Needs Matrix."],
      ["Regular updates", "Course versions, re-publishing and new assignments with due dates."],
      ["Evidence", "Attempt history, certificates and the audited CSV evidence export."]
    ]
  },
  {
    name: "CISA Secure Our World",
    url: "https://www.cisa.gov/secure-our-world",
    summary: "CISA's public awareness programme built around four everyday actions: recognise and report phishing, use strong passwords, turn on MFA and update software.",
    mapping: [
      ["Recognise and report phishing", "Course 1 and the phishing exercises."],
      ["Strong passwords and MFA", "Course 2 and the password explorer; SecureAware's own password rules follow NIST SP 800-63B-4."],
      ["Update software", "Course 4, Safe Remote and Hybrid Work."]
    ]
  }
];

const SOURCES = [
  ["NIST SP 800-63B-4 (August 2025)", "https://pages.nist.gov/800-63-4/sp800-63b.html"],
  ["NIST SP 800-61 Rev. 3 (April 2025)", "https://csrc.nist.gov/pubs/sp/800/61/r3/final"],
  ["NIST SP 800-46 Rev. 2", "https://csrc.nist.gov/pubs/sp/800/46/r2/final"],
  ["Verizon 2026 Data Breach Investigations Report", "https://www.verizon.com/business/resources/reports/dbir/"],
  ["FBI IC3 2025 Annual Report", "https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf"],
  ["OWASP Top 10:2025", "https://top10.owasp.org/2025/"],
  ["OWASP Cheat Sheet Series", "https://cheatsheetseries.owasp.org/"],
  ["Personal Data Protection Act, No. 9 of 2022", "https://www.parliament.lk/uploads/acts/gbills/english/6242.pdf"],
  ["Data Protection Authority of Sri Lanka", "https://www.dpa.gov.lk/"],
  ["Gazette Extraordinary No. 2498/16 (PDPA commencement)", "https://documents.gov.lk/view/egz/2026/7/2498-16_E.pdf"],
  ["Sri Lanka CERT – incident reporting", "https://cert.gov.lk/report_incident"]
];

export function researchPage(container) {
  mount(container, h("div", { class: "stack" },
    pageHeader("Research basis", "How the SecureAware training programme follows recognised frameworks. Figures used in lessons come from the primary sources listed here."),
    h("div", { class: "research-list" }, FRAMEWORKS.map((framework) => h("section", { class: "panel" },
      h("h2", {}, externalLink(framework.url, framework.name)),
      h("p", {}, framework.summary),
      table([{ label: "Requirement", render: (row) => row[0] }, { label: "How SecureAware implements it", render: (row) => row[1] }], framework.mapping, { caption: framework.name })))),
    h("section", { class: "panel" },
      h("h2", {}, "Other primary sources used in the courses"),
      h("ul", {}, SOURCES.map(([label, url]) => h("li", {}, externalLink(url, label))))),
    h("section", { class: "panel" },
      h("h2", {}, "Assumptions to validate with Biztat"),
      h("ul", {},
        h("li", {}, "Internal reporting channels (Report phishing button, IT Service Desk and Information Security contacts)."),
        h("li", {}, "The approved password manager, VPN and file-sharing tools."),
        h("li", {}, "The four-level classification scheme and its handling rules."),
        h("li", {}, "The Training Needs Matrix defaults and due periods.")))));
}
