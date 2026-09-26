// Course 5. Checked against the primary sources on 2026-09-26. Biztat's internal reporting
// contacts are assumptions to be validated with Biztat's IT team.

const NIST_61 = { title: "NIST SP 800-61 Rev. 3 – Incident Response Recommendations and Considerations for Cybersecurity Risk Management: A CSF 2.0 Community Profile (April 2025)", url: "https://csrc.nist.gov/pubs/sp/800/61/r3/final" };
const SLCERT = { title: "Sri Lanka CERT – Report an incident", url: "https://cert.gov.lk/report_incident" };
const CISA_PHISHING = { title: "CISA Secure Our World – Recognize and Report Phishing", url: "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing" };
const PDPA_ACT = { title: "Personal Data Protection Act, No. 9 of 2022 – Section 23 (personal data breaches)", url: "https://www.parliament.lk/uploads/acts/gbills/english/6242.pdf" };
const NIST_46 = { title: "NIST SP 800-46 Rev. 2 – Telework, Remote Access, and BYOD Security", url: "https://csrc.nist.gov/pubs/sp/800/46/r2/final" };
const DBIR_2026 = { title: "Verizon 2026 Data Breach Investigations Report (DBIR)", url: "https://www.verizon.com/business/resources/reports/dbir/" };

export default {
  slug: "incident-reporting",
  title: "Security Incident Reporting",
  category: "Incident Response",
  level: "Foundation",
  summary: "Recognise a security incident, report it fast through the right channel, and avoid the mistakes that make incidents worse.",
  description: "The security team can only respond to what it knows about. Most incidents are spotted first by ordinary staff: a strange login alert, an email sent to the wrong person, a pop-up that won't go away, a missing laptop. This course explains what counts as an incident, exactly how to report at Biztat, why we have a no-blame reporting culture, and what not to do while you wait for help.",
  learningObjectives: [
    "Recognise common security incidents, including personal data breaches",
    "Report an incident quickly through Biztat's channels with useful details",
    "Explain the no-blame reporting culture and why speed matters",
    "Avoid actions that destroy evidence or spread the problem"
  ],
  whyItMatters: [
    { stat: "62%", text: "of breaches in the 2026 DBIR involved the human element – people are often the first to notice something is wrong.", source: DBIR_2026 },
    { stat: "CSF 2.0", text: "NIST SP 800-61 Rev. 3 (April 2025) places incident response inside the whole cybersecurity risk management programme, including detection and reporting by everyone.", source: NIST_61 }
  ],
  durationMinutes: 25,
  audienceNote: "Mandatory for every Biztat employee, contractor and intern.",
  cover: "incident",
  passMark: 80,
  maxAttempts: 3,
  cooldownMinutes: 30,
  questionsPerAttempt: 10,
  openToAll: true,
  lessons: [
    {
      title: "What counts as a security incident",
      estimatedMinutes: 6,
      interactive: "incident-triage",
      body: `## A simple test

A security incident is anything that **threatens the confidentiality, integrity or availability** of Biztat's or our clients' information or systems – whether or not harm has happened yet.

## Everyday examples

- A **lost or stolen** laptop, phone, security key or USB drive.
- An email with client or personal data sent to the **wrong recipient**.
- A **suspicious login** alert, password reset or MFA prompt you did not start.
- You **clicked a phishing link** or typed your password into a fake page.
- A **malware warning**, ransom note or pop-up that will not close, or files that suddenly will not open.
- Someone **tailgating** into the office, or an unknown person asking for access.
- Confidential papers left on a printer or in a public place.

> [!NOTE] Suspected is enough
> You do not need proof. If something *might* be an incident, report it. Checking is the security team's job.

## Personal data breaches

When an incident affects personal data, it may be a **personal data breach** under Sri Lanka's PDPA. Section 23 requires controllers to notify the Data Protection Authority in the form and time set by rules under the Act. That is why every such event must reach the Information Security team quickly.

Try the exercise below: which of these situations should be reported?`,
      keyTakeaways: [
        "An incident is anything that threatens the confidentiality, integrity or availability of information.",
        "Lost devices, wrong-recipient emails, suspicious logins and malware pop-ups are all incidents.",
        "Report suspected incidents – you do not need proof."
      ],
      sources: [NIST_61, PDPA_ACT]
    },
    {
      title: "How and who to report to at Biztat",
      estimatedMinutes: 6,
      body: `## Report straight away

1. **Urgent (happening now, you clicked something, a device is lost):** phone the **IT Service Desk** or the **Information Security team** immediately.
2. **Suspicious email:** use the **Report phishing** button, or forward it as an attachment to the Information Security team.
3. **Anything else:** raise a ticket with the IT Service Desk marked *Security incident*, and tell your manager.

> [!NOTE] Prototype note
> Biztat's exact phone numbers, mailbox and ticket categories are an **assumption to be validated** with Biztat's IT team.

## What to include

- **What** you saw or did, in your own words.
- **When** it happened (as exactly as you can).
- **Which** device, account, system, client or data is involved.
- **What you have done since** (for example, "I changed my password").
- Screenshots or photos of error messages if it is safe to take them.

## External reporting

Biztat's Information Security team decides whether to report externally – for example to the **Data Protection Authority** under the PDPA, to clients under contract, or to **Sri Lanka CERT**, which runs a national incident reporting portal. Do not contact external bodies or clients about an incident yourself unless the security team asks you to.`,
      keyTakeaways: [
        "Urgent incidents: phone the IT Service Desk or Information Security team immediately.",
        "Suspicious emails: use Report phishing.",
        "Say what, when, which system or data, and what you have done since.",
        "The security team handles any external reporting."
      ],
      sources: [SLCERT, CISA_PHISHING, PDPA_ACT]
    },
    {
      title: "Report fast, no blame",
      estimatedMinutes: 5,
      body: `## Why speed matters

Every minute an attacker has with a stolen password or an infected laptop is a minute to move further in, steal more data or encrypt more files. A report made in five minutes can turn a serious breach into a minor event.

## The no-blame promise

Biztat treats honest reports of mistakes as **helpful**, not as misconduct:

- Clicking a convincing phishing link and reporting it straight away is the **right** outcome.
- Sending an email to the wrong person and reporting it immediately is **responsible**.
- What *is* a problem is **hiding** an incident, deleting evidence, or waiting to see if anyone notices.

> [!EXAMPLE] Real-world pattern
> Two colleagues get the same fake invoice email. One clicks, realises, and phones the IT Service Desk within minutes: their password is reset and nothing is lost. The other clicks but says nothing out of embarrassment; three days later their mailbox is used to send the same scam to twenty clients.

> [!DO] Do this
> Report first, feel embarrassed later – or better, not at all. Everyone gets fooled sometimes.`,
      keyTakeaways: [
        "Fast reports limit damage.",
        "Honest mistakes reported quickly are never punished.",
        "Hiding an incident is what causes real harm."
      ],
      sources: [NIST_61, DBIR_2026]
    },
    {
      title: "What not to do",
      estimatedMinutes: 5,
      body: `## Leave the investigation to the experts

Well-meant actions can destroy evidence or spread the problem.

> [!DONT] Don't do this
> - Don't **investigate** yourself – don't open suspicious attachments "to check", run online scanners on client files, or log in to see what the attacker did.
> - Don't **switch off** an infected computer unless the security team tells you to. Evidence held in memory can be lost.
> - Don't **forward** suspicious emails to colleagues "as a warning" – use the reporting button instead.
> - Don't **pay** any ransom or reply to an attacker.
> - Don't **delete** messages, logs or files related to the incident.
> - Don't **discuss** the incident on social media or with clients unless the security team asks you to.

## What you can do while waiting

> [!DO] Do this
> - If the security team asks you to, **disconnect** the device from the network (unplug the cable or turn off Wi-Fi) but leave it powered on.
> - **Write down** what happened while you still remember the details.
> - **Change passwords** from a different, trusted device if your account may be compromised.
> - Keep the device and any evidence **safe** until the security team collects it.`,
      keyTakeaways: [
        "Don't investigate, delete evidence, forward suspicious emails or pay ransoms.",
        "Don't power off an affected device unless told to; disconnect it from the network if asked.",
        "Write down what happened and follow the security team's instructions."
      ],
      sources: [NIST_61, NIST_46]
    }
  ],
  questions: [
    { lesson: 1, type: "single", difficulty: 1, prompt: "Which of these is a security incident that should be reported?", explanation: "Sending client data to the wrong recipient threatens confidentiality and may be a personal data breach.", options: [["Emailing a client file to the wrong external address", true], ["Your laptop battery running low", false], ["A colleague's birthday reminder", false], ["A scheduled system maintenance notice", false]] },
    { lesson: 1, type: "true_false", difficulty: 1, prompt: "True or false: you should only report an incident once you are sure harm has happened.", explanation: "Report suspected incidents. The security team will investigate.", options: [["False", true], ["True", false]] },
    { lesson: 1, type: "multi", difficulty: 2, prompt: "Select ALL the situations that should be reported as security incidents.", explanation: "Suspicious logins, lost devices and malware warnings all threaten Biztat's information.", options: [["A login alert from another country that you do not recognise", true], ["Losing a USB drive with client files", true], ["A pop-up claiming your files are encrypted", true], ["Your monitor needs cleaning", false]] },
    { lesson: 1, type: "single", difficulty: 2, prompt: "Under PDPA Section 23, who must a controller notify about a personal data breach?", explanation: "Section 23 requires controllers to notify the Data Protection Authority as set out in rules under the Act.", options: [["The Data Protection Authority", true], ["Only the company's auditors", false], ["The staff member who made the mistake", false], ["Nobody, unless a journalist asks", false]] },
    { lesson: 2, type: "scenario", difficulty: 2, scenario: "You just typed your password into a page that you now realise was fake.", prompt: "What is the best first step?", explanation: "This is urgent: phone the IT Service Desk or Information Security team immediately so access can be secured.", options: [["Phone the IT Service Desk or Information Security team immediately", true], ["Send an email to IT and wait for a reply tomorrow", false], ["Clear your browser history", false], ["Tell nobody and change your password next week", false]] },
    { lesson: 2, type: "multi", difficulty: 2, prompt: "Select ALL the details that help when you report an incident.", explanation: "What happened, when, which system or data, and what you have done since all help the security team respond.", options: [["What you saw or did", true], ["When it happened", true], ["Which device, account or data is involved", true], ["Your guess at who the attacker is, posted on social media", false]] },
    { lesson: 2, type: "single", difficulty: 2, prompt: "Who decides whether Biztat reports an incident to the Data Protection Authority, a client or Sri Lanka CERT?", explanation: "The Information Security team handles external reporting so it is accurate, timely and consistent.", options: [["Biztat's Information Security team", true], ["Whoever notices the incident first", false], ["The client, after they find out", false], ["Nobody – incidents are never reported externally", false]] },
    { lesson: 3, type: "true_false", difficulty: 1, prompt: "True or false: at Biztat, someone who quickly reports that they clicked a phishing link will be disciplined.", explanation: "Biztat has a no-blame culture for honest, fast reports. Hiding incidents is what causes harm.", options: [["False", true], ["True", false]] },
    { lesson: 3, type: "single", difficulty: 2, prompt: "Why does reporting speed matter so much?", explanation: "Attackers use every minute to go further. Fast reports let the team contain the incident early.", options: [["Every minute gives an attacker more time to cause damage", true], ["Late reports are automatically rejected", false], ["It only matters for lost laptops", false], ["Speed does not matter if the report is detailed", false]] },
    { lesson: 3, type: "scenario", difficulty: 2, scenario: "A colleague whispers that they opened a strange invoice attachment yesterday but did not report it because they felt embarrassed.", prompt: "What should you do?", explanation: "Encourage them to report now – late is much better than never – and offer to go with them.", options: [["Encourage them to report it now and offer to help", true], ["Promise to keep it secret", false], ["Tell them it is too late to matter", false], ["Open the attachment to see what it does", false]] },
    { lesson: 4, type: "single", difficulty: 2, prompt: "A ransom message appears on your screen. What should you do?", explanation: "Don't pay, don't power off unless told; report immediately and follow the security team's instructions (they may ask you to disconnect from the network).", options: [["Report it immediately and follow the security team's instructions", true], ["Pay quickly before the price goes up", false], ["Switch the computer off and go home", false], ["Search online for a decryption tool and run it", false]] },
    { lesson: 4, type: "true_false", difficulty: 2, prompt: "True or false: you should forward a suspicious email to your whole team so they know to watch out.", explanation: "Forwarding spreads the malicious content. Use the Report phishing button and let the security team warn others.", options: [["False", true], ["True", false]] },
    { lesson: 4, type: "single", difficulty: 3, prompt: "Why might the security team ask you NOT to switch off an infected computer?", explanation: "Useful evidence can be held in memory and is lost when power is removed. Disconnecting from the network contains it instead.", options: [["Evidence in memory would be lost", true], ["It would void the warranty", false], ["Switching off spreads malware to the printer", false], ["It is never safe to switch off a computer", false]] },
    { lesson: 4, type: "multi", difficulty: 2, prompt: "Select ALL the things you should NOT do after a suspected incident.", explanation: "Investigating yourself, deleting evidence and replying to attackers can make things worse.", options: [["Log in to see what the attacker did", true], ["Delete the suspicious email and related files", true], ["Reply to the attacker to negotiate", true], ["Write down what happened while you remember", false]] },
    { lesson: 2, type: "single", difficulty: 1, prompt: "What should you do with a suspicious email?", explanation: "Use the Report phishing button (or forward it as an attachment to Information Security), then delete it.", options: [["Use the Report phishing button", true], ["Reply asking who sent it", false], ["Click the link to see where it goes", false], ["Move it to a personal folder for later", false]] }
  ]
};
