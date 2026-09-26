// Course 1. Figures are taken from the primary sources listed in each lesson and were
// checked on 2026-09-26. Do not add statistics here without a primary-source link.

const DBIR_2026 = { title: "Verizon 2026 Data Breach Investigations Report (DBIR) – report hub and executive summary", url: "https://www.verizon.com/business/resources/reports/dbir/" };
const CISA_PHISHING = { title: "CISA Secure Our World – Recognize and Report Phishing", url: "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing" };
const IC3_2025 = { title: "FBI Internet Crime Complaint Center – 2025 IC3 Annual Report", url: "https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf" };
const CISA_NUMBER_MATCHING = { title: "CISA – Implementing Number Matching in MFA Applications (fact sheet)", url: "https://www.cisa.gov/sites/default/files/publications/fact-sheet-implement-number-matching-in-mfa-applications-508c.pdf" };
const CISA_PR_MFA = { title: "CISA – Implementing Phishing-Resistant MFA (fact sheet)", url: "https://www.cisa.gov/sites/default/files/publications/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf" };

export default {
  slug: "phishing-social-engineering",
  title: "Phishing and Social Engineering Recognition",
  category: "Email & Social Engineering",
  level: "Foundation",
  summary: "Spot phishing, business email compromise, smishing, vishing, QR-code lures and MFA push-bombing, then report them the right way.",
  description: "Attackers find it easier to trick a person than to break a well-configured system. This course shows how modern social engineering works, the warning signs to look for in email, text, calls and QR codes, and the single most useful thing you can do: report quickly so the security team can protect everyone.",
  learningObjectives: [
    "Recognise the common warning signs of phishing, spear-phishing and business email compromise",
    "Check a sender address and a link destination before acting",
    "Handle smishing, vishing, QR-code phishing and unexpected MFA prompts safely",
    "Verify payment and data requests through a separate, trusted channel",
    "Report suspicious messages quickly instead of just deleting them"
  ],
  whyItMatters: [
    { stat: "62%", text: "of breaches in the 2026 DBIR involved the human element, up from 60% the year before.", source: DBIR_2026 },
    { stat: "16%", text: "of breaches began with phishing, and a further 6% with pretexting (2026 DBIR).", source: DBIR_2026 },
    { stat: "40%", text: "higher median click rate for mobile lures (voice and SMS) than for email in phishing simulations (2026 DBIR).", source: DBIR_2026 },
    { stat: "US$3.05bn", text: "in business email compromise losses reported to the FBI IC3 in 2025; phishing/spoofing was the most-reported crime type with 191,561 complaints.", source: IC3_2025 }
  ],
  durationMinutes: 35,
  audienceNote: "Mandatory for every Biztat employee, contractor and intern.",
  cover: "phishing",
  passMark: 80,
  maxAttempts: 3,
  cooldownMinutes: 30,
  questionsPerAttempt: 10,
  openToAll: true,
  lessons: [
    {
      title: "Why attackers target people",
      estimatedMinutes: 6,
      body: `## Social engineering in one sentence

Social engineering is persuading someone to do something that helps an attacker – click a link, open a file, share a password, approve a login or send money – usually by creating **trust**, **urgency** or **fear**.

Biztat is a professional-services company. We hold client files, invoices, contracts and personal data, and we move money for suppliers. That makes our inboxes valuable to criminals, even though we are not a bank or a technology company.

## The main forms you will meet

- **Email phishing** – mass messages that pretend to be a delivery firm, bank, Microsoft 365 or a shared-document alert.
- **Spear-phishing** – a message written for *you*, using your name, your manager's name or a real project to look genuine.
- **Business email compromise (BEC)** – someone pretends to be a director, a client or a supplier and asks for a payment, a change of bank details or sensitive files.
- **Pretexting** – a believable story ("I'm the new auditor", "I'm from IT support") used to get information or access.
- **Smishing and vishing** – the same tricks by SMS, WhatsApp or phone call.
- **QR-code phishing ("quishing")** – a QR code on a poster, PDF or email that opens a fake login page.
- **MFA fatigue (push-bombing)** – repeated sign-in prompts sent to your phone until you tap *Approve* just to make them stop.

> [!STAT] What the evidence says
> Verizon's 2026 Data Breach Investigations Report found that the human element was involved in 62% of breaches, and that phishing was the way in for 16% of breaches.

## Good news

You do not need to be a technical expert. Most attacks fail when a person pauses, checks one or two things, and reports what they saw.`,
      keyTakeaways: [
        "Social engineering targets trust, urgency and fear rather than technology.",
        "Biztat's client data, invoices and payments make us a worthwhile target.",
        "A short pause and a quick report stop most attacks."
      ],
      sources: [DBIR_2026, CISA_PHISHING]
    },
    {
      title: "Anatomy of a phishing email",
      estimatedMinutes: 8,
      interactive: "phishing-email",
      body: `## Four places to look

CISA's *Recognize and Report Phishing* guidance lists the signs below. Train your eye to check them every time a message asks you to act.

1. **Urgent or emotional language** – "Your mailbox will be deleted today", "Final notice", "The director needs this in 10 minutes".
2. **Requests for personal or financial information** – passwords, one-time codes, bank details, client lists.
3. **Untrusted shortened links** – a short link hides where you will really end up.
4. **Wrong addresses or links** – a sender or link that is *almost* right, such as \`amazan.com\` instead of \`amazon.com\`, or \`biztat-solutions.co\` instead of our real domain.

> [!WARNING] Perfect grammar is no longer a safe sign
> CISA notes that poor spelling used to be a clue, but AI tools now let attackers write flawless messages. Judge the *request*, not the writing.

## How to check a sender

- Look at the **full address**, not just the display name. "Biztat Finance" can be sent from any address.
- Watch for look-alike domains: extra words, swapped letters, different endings (\`.co\`, \`.net\`) or numbers instead of letters.
- A reply-to address that differs from the sender is a strong warning sign.

## How to check a link

- On a computer, **hover** over the link and read the destination shown by the browser or mail client before clicking.
- On a phone, **press and hold** to preview the address.
- Read the domain from the right: in \`login.microsoft.com.secure-check.net\` the real domain is \`secure-check.net\`.

> [!DO] Do this
> Open the service yourself – type the address or use your bookmark – instead of following a link in the message.

> [!DONT] Don't do this
> Don't open unexpected attachments, especially ZIP files, macros or "invoice" documents you were not expecting, and don't enable editing or content in them.

Try the exercise below: click every red flag you can find in the sample email.`,
      keyTakeaways: [
        "Check the full sender address and any reply-to address.",
        "Hover or long-press to see a link's real destination; read the domain from the right.",
        "Flawless writing does not mean a message is safe.",
        "Go to the service directly rather than through the message."
      ],
      sources: [CISA_PHISHING]
    },
    {
      title: "Business email compromise and pretexting",
      estimatedMinutes: 7,
      body: `## Why BEC is so costly

BEC rarely contains a link or malware. It is simply a convincing request: *"Please update our bank details before Friday's payment"* or *"I'm in a meeting – buy gift cards for the client event and send me the codes."*

> [!STAT] Scale of the problem
> Victims reported more than US$3 billion in business email compromise losses to the FBI's Internet Crime Complaint Center in 2025.

## Warning signs

- A **change of bank details** or a new payee, especially near a payment deadline.
- A senior person asking you to **skip the normal approval process** or keep it confidential.
- Requests to buy **gift cards**, crypto or to pay a "new" supplier urgently.
- A familiar name with a slightly different address, or a real address sending an unusual request (the account may have been taken over).

> [!EXAMPLE] Real-world pattern
> An accounts assistant receives an email that appears to come from a long-standing supplier: "Our bank has changed – please use the attached details for this month's invoice." The email thread is genuine because the supplier's mailbox was compromised. The only reliable defence is to phone the supplier on a number already held on file.

## Verify out of band

**Out of band** means checking through a *different* channel that you already trust:

- Call the person on the number in our contact directory or supplier master file – never the number in the email.
- Walk over or message them on the company chat app.
- Follow Biztat's payment approval process every time, even for directors.

> [!DO] Do this
> Treat any change to bank details as suspicious until it has been confirmed by phone with a known contact and approved by a second person.

## Pretexting

Pretexters build a story first: a new auditor, a courier, IT support, a client's assistant. They may already know names and projects from LinkedIn or a previous breach. If someone asks for access, data or a password reset, confirm who they are through official channels before helping.`,
      keyTakeaways: [
        "BEC relies on a convincing request, not on malware.",
        "Verify every bank-detail change and unusual payment by phone using a number already on file.",
        "Never skip the approval process, whoever is asking.",
        "Confirm the identity of anyone asking for access or data before you help."
      ],
      sources: [IC3_2025, DBIR_2026]
    },
    {
      title: "Smishing, vishing, QR codes and MFA fatigue",
      estimatedMinutes: 7,
      body: `## Your phone is now the main target

The 2026 DBIR reports that mobile lures – voice calls and text messages – had a **40% higher median click rate** than email in phishing simulations. Small screens hide addresses and we tend to react faster on a phone.

## Smishing (SMS and messaging apps)

Typical lures: a missed delivery, a bank lock, a tax refund, or a "new number" message from a colleague. Don't tap links in unexpected texts. Open the official app or website yourself.

## Vishing (voice calls)

Callers may claim to be the bank, IT support or a senior manager, and may already know some details about you. Hang up and call back on a number you look up yourself. **Biztat IT will never ask for your password or an MFA code.**

## QR-code phishing

A QR code is just a link you cannot read. Before opening one:

- Check the address your camera shows before you open it.
- Be suspicious of QR codes in emails or PDFs that ask you to "re-verify" your account.
- Look for stickers placed over genuine codes on posters or payment stands.

## MFA fatigue (push-bombing)

If someone has stolen your password, they may trigger sign-in prompts again and again until you approve one. CISA describes this as bombarding a user with push notifications until they accept by accident or out of annoyance.

> [!WARNING] Warning sign
> An MFA prompt you did not start – especially several in a row, or at night – means someone may already know your password.

> [!DO] Do this
> Tap **Deny**, change your password straight away through the official portal, and report it to the Information Security team.

> [!DONT] Don't do this
> Never approve a prompt "just to make it stop", and never read a one-time code out to anyone who calls you.

Number matching (typing the number shown on the login screen) makes blind approval harder. Phishing-resistant MFA such as FIDO2 security keys and passkeys is stronger still – you will learn more in the *Passwords, Passphrases and MFA* course.`,
      keyTakeaways: [
        "Treat unexpected texts, calls and QR codes with the same suspicion as email.",
        "Call back on a number you look up yourself; IT will never ask for your password or MFA code.",
        "An MFA prompt you did not start means your password may be known – deny, change it and report."
      ],
      sources: [DBIR_2026, CISA_NUMBER_MATCHING, CISA_PR_MFA]
    },
    {
      title: "Report first – how to report at Biztat",
      estimatedMinutes: 5,
      body: `## Why reporting matters more than deleting

When you report a suspicious message, the security team can block the sender and malicious links for everyone, find other people who received the same message, and check whether anyone clicked. Deleting it quietly protects only you – and only if you have not already clicked.

CISA's advice is to resist clicking, **report the message** using the reporting option in your email or messaging app, and then delete it.

## How to report at Biztat

1. Don't click, reply, forward to colleagues or open attachments.
2. Use the **Report phishing** button in Outlook, or forward the message as an attachment to the Information Security team.
3. If you **already clicked**, entered a password or approved a prompt, tell the Information Security team or the IT Service Desk **straight away** by phone. Minutes matter.
4. After reporting, delete the message.

> [!NOTE] Prototype note
> Biztat's exact reporting button and contact details are an **assumption to be validated** with Biztat's IT team. Use the channel your manager has confirmed.

## No-blame culture

People who report a mistake quickly are helping, not failing. A fast report of a click is far better than a silent one. Biztat will never discipline someone for honestly reporting that they were tricked.

> [!DO] Do this
> Report even when you are not sure. The security team would rather check ten harmless messages than miss one real attack.`,
      keyTakeaways: [
        "Report first, then delete – reporting protects everyone.",
        "If you clicked or approved something, report it immediately by phone.",
        "Reporting a mistake quickly is always the right thing to do."
      ],
      sources: [CISA_PHISHING]
    }
  ],
  questions: [
    {
      lesson: 2, type: "single", difficulty: 1,
      prompt: "An email from \"Biztat IT Support\" asks you to confirm your password within one hour or lose mailbox access. What is the strongest warning sign?",
      explanation: "Urgent deadlines combined with a request for credentials are classic phishing signs. Legitimate IT teams never need your password.",
      options: [["The urgent deadline combined with a request for your password", true], ["The message uses the company name", false], ["The email has a signature block", false], ["It arrived during working hours", false]]
    },
    {
      lesson: 2, type: "single", difficulty: 2,
      prompt: "Which of these links actually leads to the domain secure-check.net?",
      explanation: "Domains are read from the right. In login.microsoft.com.secure-check.net everything before secure-check.net is just a sub-domain chosen by the owner of secure-check.net.",
      options: [["https://login.microsoft.com.secure-check.net/verify", true], ["https://secure-check.microsoft.com/verify", false], ["https://microsoft.com/secure-check", false], ["https://login.microsoftonline.com/?ref=secure-check", false]]
    },
    {
      lesson: 2, type: "true_false", difficulty: 1,
      prompt: "True or false: an email with perfect spelling and grammar is unlikely to be phishing.",
      explanation: "CISA warns that AI tools let attackers write flawless messages. Judge the request and the sender, not the writing quality.",
      options: [["False", true], ["True", false]]
    },
    {
      lesson: 2, type: "multi", difficulty: 2,
      prompt: "Select ALL the checks that help you decide whether a link is safe.",
      explanation: "Hovering or long-pressing shows the real destination, and reading the domain from the right reveals who owns it. The display text of a link can say anything.",
      options: [["Hover over it (or press and hold on a phone) to see the real address", true], ["Read the domain from the right-hand side", true], ["Trust it if the link text shows a familiar website name", false], ["Trust it if the email includes the company logo", false]]
    },
    {
      lesson: 3, type: "scenario", difficulty: 2,
      scenario: "You work in Finance. An email arrives from a long-standing supplier's usual address: \"Our bank account has changed. Please use the attached details for this week's invoice payment.\" The thread includes earlier genuine messages.",
      prompt: "What should you do?",
      explanation: "The supplier's mailbox may be compromised, so the thread looks genuine. Verify bank-detail changes by phone using a number already held on file, and follow the second-person approval process.",
      options: [["Call the supplier on the number already held in our supplier records and follow the approval process", true], ["Reply to the email to ask if the change is genuine", false], ["Call the phone number shown in the new bank letter", false], ["Update the details because the email thread is genuine", false]]
    },
    {
      lesson: 3, type: "scenario", difficulty: 2,
      scenario: "A message that appears to be from a Biztat director says: \"I'm in a client meeting and can't talk. Please buy five gift cards for the client event and send me the codes. Keep this between us.\"",
      prompt: "What is the best response?",
      explanation: "Secrecy, urgency and gift cards are hallmark business email compromise signs. Verify through a separate trusted channel and report it.",
      options: [["Verify with the director through a known phone number or company chat, and report the message", true], ["Buy the cards because the director is senior", false], ["Reply asking which store to use", false], ["Forward it to colleagues to see if they got one too", false]]
    },
    {
      lesson: 3, type: "single", difficulty: 1,
      prompt: "What does it mean to verify a request \"out of band\"?",
      explanation: "Out-of-band verification uses a different, already trusted channel, so an attacker who controls the original channel cannot answer for the real person.",
      options: [["Confirm it through a different channel you already trust, such as a known phone number", true], ["Reply to the same email thread", false], ["Check that the email has an attachment", false], ["Wait a day before acting", false]]
    },
    {
      lesson: 3, type: "true_false", difficulty: 2,
      prompt: "True or false: business email compromise usually needs a malicious link or attachment to succeed.",
      explanation: "BEC often contains no link or malware at all. It succeeds through a believable request, which is why process checks matter.",
      options: [["False", true], ["True", false]]
    },
    {
      lesson: 4, type: "scenario", difficulty: 2,
      scenario: "At 11:40 pm your phone shows three sign-in approval prompts in a row for your Biztat account. You are not trying to sign in.",
      prompt: "What should you do?",
      explanation: "Prompts you did not start suggest someone has your password. Deny, change the password through the official portal and report it.",
      options: [["Deny the prompts, change your password through the official portal and report it", true], ["Approve one so the prompts stop", false], ["Ignore them and check in the morning", false], ["Turn off MFA to stop the notifications", false]]
    },
    {
      lesson: 4, type: "single", difficulty: 1,
      prompt: "A caller says they are from Biztat IT and need your MFA code to fix your mailbox. What should you do?",
      explanation: "Biztat IT will never ask for your password or MFA code. Hang up and call the IT Service Desk on a number you look up yourself.",
      options: [["Refuse, hang up and call the IT Service Desk on a known number", true], ["Give the code because they know your name", false], ["Give the code only if they know your employee number", false], ["Send the code by email instead", false]]
    },
    {
      lesson: 4, type: "single", difficulty: 2,
      prompt: "A PDF invoice contains a QR code saying \"Scan to re-verify your Microsoft 365 account\". What is the safest action?",
      explanation: "A QR code is a hidden link. Requests to re-verify an account through a code are a common quishing lure. Report it and go to the service directly.",
      options: [["Don't scan it; report the message and sign in through the official site if needed", true], ["Scan it with your personal phone instead of your work phone", false], ["Scan it because QR codes cannot contain links", false], ["Scan it and check the page looks right before signing in", false]]
    },
    {
      lesson: 4, type: "true_false", difficulty: 2,
      prompt: "True or false: according to the 2026 DBIR, voice and SMS lures had a higher median click rate than email in phishing simulations.",
      explanation: "The 2026 DBIR reports a 40% higher median click rate for mobile vectors (voice and SMS) than for email.",
      options: [["True", true], ["False", false]]
    },
    {
      lesson: 5, type: "single", difficulty: 1,
      prompt: "You spot a phishing email in your inbox. What should you do first?",
      explanation: "Reporting lets the security team block the sender for everyone and find other recipients. Delete only after reporting.",
      options: [["Report it using the Report phishing button or the Information Security channel", true], ["Delete it straight away", false], ["Forward it to your team as a warning", false], ["Reply asking the sender to stop", false]]
    },
    {
      lesson: 5, type: "scenario", difficulty: 2,
      scenario: "You clicked a link in an email and typed your password into what looked like the Microsoft 365 login page. A moment later you notice the address was wrong.",
      prompt: "What is the right next step?",
      explanation: "Speed limits the damage. Report immediately by phone so the team can reset credentials and check for misuse. Biztat has a no-blame reporting culture.",
      options: [["Contact the Information Security team or IT Service Desk immediately and change your password", true], ["Say nothing because nothing seems to have happened", false], ["Wait to see if anything unusual happens", false], ["Delete the email so nobody else clicks it", false]]
    },
    {
      lesson: 1, type: "single", difficulty: 1,
      prompt: "In the 2026 Verizon DBIR, roughly what share of breaches involved the human element?",
      explanation: "The 2026 DBIR reports that the human element was involved in 62% of breaches, up from 60% the previous year.",
      options: [["About 62%", true], ["About 6%", false], ["About 25%", false], ["About 95%", false]]
    }
  ]
};
