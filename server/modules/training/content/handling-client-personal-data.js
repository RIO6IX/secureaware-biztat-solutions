// Course 3. PDPA wording checked against the Act (Parliament of Sri Lanka) and the commencement
// order in Gazette Extraordinary No. 2498/16 on 2026-09-26. Classification levels are Biztat's
// internal scheme (an organisational choice, not a legal requirement).

const PDPA_ACT = { title: "Personal Data Protection Act, No. 9 of 2022 (Parliament of Sri Lanka)", url: "https://www.parliament.lk/uploads/acts/gbills/english/6242.pdf" };
const DPA = { title: "Data Protection Authority of Sri Lanka – Acts, amendments and guidelines", url: "https://www.dpa.gov.lk/guidelines.php" };
const DPA_HOME = { title: "Data Protection Authority of Sri Lanka", url: "https://www.dpa.gov.lk/" };
const GAZETTE_2498 = { title: "Gazette Extraordinary No. 2498/16 (22 July 2026) – PDPA commencement order", url: "https://documents.gov.lk/view/egz/2026/7/2498-16_E.pdf" };
const CISA_SOW = { title: "CISA Secure Our World", url: "https://www.cisa.gov/secure-our-world" };
const NIST_46 = { title: "NIST SP 800-46 Rev. 2 – Guide to Enterprise Telework, Remote Access, and BYOD Security", url: "https://csrc.nist.gov/pubs/sp/800/46/r2/final" };
const ISO_27001 = { title: "ISO/IEC 27001:2022 – Information security management systems (Annex A 5.12 classification, 5.13 labelling, 7.7 clear desk and clear screen)", url: "https://www.iso.org/standard/27001" };

export default {
  slug: "handling-client-personal-data",
  title: "Handling Client and Personal Data",
  category: "Data Protection",
  level: "Foundation",
  summary: "Classify information, share it safely, keep a clean desk and clear screen, and handle personal data the way Sri Lanka's PDPA expects.",
  description: "Biztat is trusted with client files, contracts, financial records and personal data about clients' staff and customers. This course explains Biztat's four classification levels and how to store, share, print and dispose of each one, what counts as personal data, and the principles of Sri Lanka's Personal Data Protection Act that Biztat follows as good practice today.",
  learningObjectives: [
    "Classify information as Public, Internal, Confidential or Restricted and handle each level correctly",
    "Recognise personal data using the PDPA definition",
    "Share client data only through approved channels on a need-to-know basis",
    "Apply clean desk, clear screen and secure disposal habits",
    "Describe the PDPA's processing principles and its current commencement status"
  ],
  whyItMatters: [
    { stat: "1 Jan 2027", text: "is the date appointed by Gazette Extraordinary No. 2498/16 for the PDPA's rules on processing personal data (Part I) and on controllers and processors (Part III) to come into operation.", source: GAZETTE_2498 },
    { stat: "Sections 5–12", text: "of the PDPA set out a controller's obligations: lawful processing, purpose limitation, minimisation, accuracy, retention limits, integrity and confidentiality, transparency and accountability.", source: PDPA_ACT }
  ],
  durationMinutes: 35,
  audienceNote: "Mandatory for every Biztat employee, contractor and intern.",
  cover: "data",
  passMark: 80,
  maxAttempts: 3,
  cooldownMinutes: 30,
  questionsPerAttempt: 10,
  openToAll: true,
  lessons: [
    {
      title: "What counts as personal data",
      estimatedMinutes: 6,
      body: `## The legal definition

Sri Lanka's Personal Data Protection Act, No. 9 of 2022 (PDPA) defines personal data as any information that can identify a person **directly or indirectly**, by reference to:

- an **identifier** such as a name, an identification number, financial data, location data or an online identifier; or
- factors specific to the person's **physical, physiological, genetic, psychological, economic, cultural or social identity**.

## Everyday examples at Biztat

- A client contact's name, email and phone number.
- Employee NIC numbers, salary data and bank details in a payroll file.
- A spreadsheet of a client's customers.
- An IP address or device ID in a system log.
- Health or family information in an HR record – treat this with extra care.

> [!WARNING] Indirect identification counts
> Data can be personal even without a name. "The only female finance manager at the Kandy branch" identifies one person.

## Client confidential data

Not all client data is personal – contracts, pricing, source code and strategy documents are not about individuals – but they are still **confidential** and must be protected under Biztat's contracts and policies. The next lesson shows how to classify both.`,
      keyTakeaways: [
        "Personal data is any information that can identify someone directly or indirectly.",
        "Names, ID numbers, financial data, location data and online identifiers are all personal data.",
        "Client business information may not be personal but is still confidential."
      ],
      sources: [PDPA_ACT]
    },
    {
      title: "Biztat's four classification levels",
      estimatedMinutes: 8,
      interactive: "data-classifier",
      body: `## Why classify?

Classification tells everyone how carefully information must be handled. ISO/IEC 27001:2022 includes controls for classifying and labelling information (Annex A 5.12 and 5.13). Biztat uses four levels.

## The levels

- **Public** – approved for anyone. *Examples:* published website text, press releases, job adverts.
- **Internal** – for Biztat staff; low harm if leaked. *Examples:* the staff newsletter, office procedures, the internal phone list.
- **Confidential** – for people who need it for their role; leaks could harm Biztat or a client. *Examples:* client contracts, proposals and pricing, project files, most client data.
- **Restricted** – the most sensitive; a leak could cause serious harm or break the law. *Examples:* payroll and bank details, NIC numbers, health information, passwords and encryption keys, client data marked restricted.

## Handling rules

- **Storage:** Public and Internal – approved Biztat systems. Confidential – approved systems with access limited to the project or team. Restricted – approved systems with named-person access; never on laptops' local drives or USB sticks unless encrypted and approved.
- **Email:** Confidential – only to people who need it, double-check recipients. Restricted – use an approved encrypted or secure-sharing method, never personal email.
- **Printing:** Confidential and Restricted – print only when necessary, collect immediately, use secure print release where available.
- **Disposal:** Confidential and Restricted paper goes in the locked confidential-waste bin; devices go back to IT for secure wiping.

> [!NOTE] When in doubt
> If you are unsure of a level, treat the information as the higher one and ask the document owner or the Information Security team.

Try sorting the examples in the exercise below.`,
      keyTakeaways: [
        "Biztat uses Public, Internal, Confidential and Restricted.",
        "Higher levels mean tighter storage, sharing, printing and disposal rules.",
        "If unsure, treat information as the higher level and ask."
      ],
      sources: [ISO_27001, PDPA_ACT]
    },
    {
      title: "Least privilege and secure sharing",
      estimatedMinutes: 7,
      body: `## Least privilege

Least privilege means having only the access you need to do your job, for as long as you need it. Ask for access to be **removed** when you leave a project, and never use someone else's account.

## Sharing client data safely

- Share through **approved** Biztat tools – the company file-sharing platform or document management system – with access limited to named people.
- Prefer sharing a **link with access control** over sending attachments, so access can be removed later.
- **Check recipients** before you press Send; auto-complete often picks the wrong person.
- Send **only what is needed** – remove columns or rows the recipient does not need.

> [!DONT] Don't do this
> Don't forward client or personal data to your **personal email**, upload it to personal cloud storage or AI tools, or copy it to an unapproved **USB drive**.

> [!EXAMPLE] Real-world pattern
> A consultant emails a spreadsheet of a client's employee salaries to "Nimal" – but auto-complete picks a different Nimal outside the company. This is a personal data breach and must be reported straight away, even though it was an honest mistake.

## Working with AI and online tools

Pasting client or personal data into public online tools (translators, AI chatbots, file converters) sends it to a third party. Use only tools approved by Biztat for that data level.`,
      keyTakeaways: [
        "Have only the access you need, and hand it back when you no longer need it.",
        "Share through approved tools with named access; check recipients.",
        "Never use personal email, personal cloud, public AI tools or unapproved USB drives for client data."
      ],
      sources: [PDPA_ACT, NIST_46]
    },
    {
      title: "Clean desk, clear screen and secure disposal",
      estimatedMinutes: 5,
      body: `## Clean desk

At the end of the day, and whenever you leave your desk for a long time, lock away papers, notebooks and removable media that contain Confidential or Restricted information. ISO/IEC 27001:2022 includes a clear desk and clear screen control (Annex A 7.7).

## Clear screen

- Lock your computer every time you step away: **Windows + L** on Windows, **Control + Command + Q** on a Mac.
- Position your screen so visitors and people in public places cannot read it.
- Close client files before sharing your screen in a video call.

## Printing

Print only when you need to, collect documents from the printer straight away, and never leave printouts in meeting rooms.

## Secure disposal

- Confidential and Restricted paper goes into the **locked confidential-waste bin** – never the normal recycling.
- Old laptops, phones, USB drives and hard disks go back to **IT** for secure wiping or destruction. Deleting files or formatting a drive does not reliably remove data.

> [!DO] Do this
> Make locking your screen a habit, like locking your car.`,
      keyTakeaways: [
        "Lock away sensitive papers and lock your screen whenever you step away.",
        "Collect printouts immediately.",
        "Use the confidential-waste bin for paper and return devices to IT for secure wiping."
      ],
      sources: [ISO_27001, CISA_SOW]
    },
    {
      title: "Sri Lanka's PDPA: status and principles",
      estimatedMinutes: 8,
      body: `## Current status (checked September 2026)

The Personal Data Protection Act, No. 9 of 2022 is being brought into operation in stages. It has been amended by the Personal Data Protection (Amendment) Act, No. 22 of 2025, which is published on the Data Protection Authority's website.

- The parts that set up the **Data Protection Authority** came into operation in 2023.
- Gazette Extraordinary No. 2498/16 (22 July 2026) appoints **1 January 2027** for Sections 2 and 3, **Part I** (processing of personal data) and **Part III** (controllers and processors).
- **Part II** (rights of data subjects) and **Part VII** (penalties) come into operation on dates still to be appointed by further order.

> [!NOTE] What this means for Biztat
> Whatever the commencement date, Biztat follows the PDPA's principles now as good practice and to be ready for 2027. Always check the Data Protection Authority's website for the latest orders.

## The controller's obligations (Sections 5–12)

1. **Lawful processing** – process personal data only when a condition in the Act's schedules is met (Section 5).
2. **Purpose limitation** – process it for specified, explicit and legitimate purposes, and not in a way that is incompatible with them (Section 6).
3. **Data minimisation** – keep it adequate, relevant and proportionate to what the purpose needs (Section 7).
4. **Accuracy** – keep it accurate and up to date, correcting or erasing outdated data without undue delay (Section 8).
5. **Limited retention** – keep it in identifiable form only as long as the purpose requires (Section 9).
6. **Integrity and confidentiality** – protect it with appropriate technical and organisational measures such as encryption, pseudonymisation, anonymisation and access controls (Section 10).
7. **Transparency** – give people the required information in a concise, transparent, intelligible and easily accessible form (Section 11).
8. **Accountability** – run a *Data Protection Management Programme* of internal controls that shows how the obligations are met (Section 12).

## Personal data breaches

Under Section 23, a controller must notify the Data Protection Authority of a personal data breach in the form, manner and timescale set by rules under the Act. At Biztat you do not decide whether something is notifiable – **report every suspected breach to the Information Security team immediately** and they will handle notification.`,
      keyTakeaways: [
        "PDPA Parts I and III come into operation on 1 January 2027; Parts II and VII await further orders.",
        "Biztat follows the PDPA principles now as good practice.",
        "Collect only what you need, use it only for its purpose, keep it accurate, secure and no longer than necessary.",
        "Report every suspected personal data breach immediately."
      ],
      sources: [PDPA_ACT, GAZETTE_2498, DPA, DPA_HOME]
    }
  ],
  questions: [
    { lesson: 1, type: "single", difficulty: 1, prompt: "Under the PDPA, which of these is personal data?", explanation: "Personal data is any information that can identify a person directly or indirectly, such as a name with contact details.", options: [["A client contact's name and mobile number", true], ["The company's published office address", false], ["A generic industry report", false], ["Last year's public annual report", false]] },
    { lesson: 1, type: "true_false", difficulty: 2, prompt: "True or false: information can be personal data even if it does not include a name.", explanation: "The PDPA covers information that identifies someone indirectly, for example by ID number, location or unique characteristics.", options: [["True", true], ["False", false]] },
    { lesson: 1, type: "multi", difficulty: 2, prompt: "Select ALL the identifiers the PDPA lists as examples of personal data.", explanation: "The Act lists names, identification numbers, financial data, location data and online identifiers.", options: [["An identification number", true], ["Location data", true], ["An online identifier", true], ["A company's product catalogue", false]] },
    { lesson: 2, type: "single", difficulty: 2, prompt: "A payroll file with employees' bank account numbers should be classified as…", explanation: "Bank details and payroll data can cause serious harm if leaked, so they are Restricted.", options: [["Restricted", true], ["Confidential", false], ["Internal", false], ["Public", false]] },
    { lesson: 2, type: "single", difficulty: 1, prompt: "Which classification fits the internal staff newsletter?", explanation: "It is for staff only but would cause little harm if leaked – Internal.", options: [["Internal", true], ["Public", false], ["Restricted", false], ["Confidential", false]] },
    { lesson: 2, type: "single", difficulty: 2, prompt: "You are not sure whether a client document is Confidential or Restricted. What should you do?", explanation: "Treat it as the higher level until the owner or Information Security confirms.", options: [["Treat it as Restricted and ask the document owner", true], ["Treat it as Internal until someone complains", false], ["Classify it as Public so it is easy to share", false], ["Leave it unlabelled", false]] },
    { lesson: 3, type: "scenario", difficulty: 2, scenario: "You want to finish a client report at home tonight. Your work laptop is at the office.", prompt: "What is the right approach?", explanation: "Client data must stay in approved systems. Personal email and USB drives bypass Biztat's protections.", options: [["Use Biztat's approved remote access from an approved device, or wait until tomorrow", true], ["Email the files to your personal Gmail", false], ["Copy the files to your own USB stick", false], ["Upload them to your personal cloud storage", false]] },
    { lesson: 3, type: "scenario", difficulty: 2, scenario: "You just emailed a spreadsheet of a client's employee salaries to the wrong \"Nimal\" – someone outside Biztat.", prompt: "What should you do?", explanation: "This is a personal data breach. Report it to the Information Security team immediately so they can act and handle any notification.", options: [["Report it to the Information Security team immediately", true], ["Send a follow-up asking them to delete it and say nothing else", false], ["Wait to see if the client notices", false], ["Recall the email and forget about it", false]] },
    { lesson: 3, type: "single", difficulty: 1, prompt: "What does \"least privilege\" mean?", explanation: "Each person has only the access needed for their role, for as long as they need it.", options: [["Having only the access you need for your job", true], ["Giving managers access to everything", false], ["Sharing one account per team", false], ["Removing all access on Fridays", false]] },
    { lesson: 3, type: "true_false", difficulty: 2, prompt: "True or false: pasting client personal data into a public online AI chatbot is acceptable if you delete the chat afterwards.", explanation: "The data has already been sent to a third party. Use only tools approved for that data level.", options: [["False", true], ["True", false]] },
    { lesson: 4, type: "single", difficulty: 1, prompt: "You are stepping away from your desk for a coffee. What should you do first?", explanation: "Always lock your screen (Windows + L) when you step away.", options: [["Lock your screen", true], ["Turn the monitor brightness down", false], ["Minimise your windows", false], ["Nothing – it is only a few minutes", false]] },
    { lesson: 4, type: "single", difficulty: 2, prompt: "How should you dispose of old printed client contracts?", explanation: "Confidential paper goes into the locked confidential-waste bin for secure destruction.", options: [["Put them in the locked confidential-waste bin", true], ["Put them in the normal recycling", false], ["Take them home to throw away", false], ["Tear them in half and bin them", false]] },
    { lesson: 4, type: "true_false", difficulty: 2, prompt: "True or false: formatting a USB drive is a reliable way to remove client data before giving it away.", explanation: "Formatting does not reliably remove data. Return devices to IT for secure wiping or destruction.", options: [["False", true], ["True", false]] },
    { lesson: 5, type: "single", difficulty: 2, prompt: "According to Gazette Extraordinary No. 2498/16, when do PDPA Part I (processing) and Part III (controllers and processors) come into operation?", explanation: "The July 2026 order appoints 1 January 2027 for Sections 2 and 3, Part I and Part III.", options: [["1 January 2027", true], ["They have been fully in force since 2022", false], ["They will never come into force", false], ["1 January 2023", false]] },
    { lesson: 5, type: "single", difficulty: 2, prompt: "Which PDPA principle is breached by collecting customers' dates of birth \"just in case\" they are useful later?", explanation: "Data minimisation and purpose limitation require data to be adequate, relevant and proportionate to a specified purpose.", options: [["Data minimisation (and purpose limitation)", true], ["Accuracy", false], ["Transparency only", false], ["None – more data is always better", false]] },
    { lesson: 5, type: "multi", difficulty: 3, prompt: "Select ALL the measures the PDPA mentions for integrity and confidentiality of personal data.", explanation: "Section 10 mentions encryption, pseudonymisation, anonymisation and access controls, among other appropriate measures.", options: [["Encryption", true], ["Pseudonymisation or anonymisation", true], ["Access controls", true], ["Publishing the data so it can be checked", false]] }
  ]
};
