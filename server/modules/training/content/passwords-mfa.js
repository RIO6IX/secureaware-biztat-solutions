// Course 2. Checked against the primary sources on 2026-09-26.

const NIST_63B = { title: "NIST SP 800-63B-4, Digital Identity Guidelines: Authentication and Authenticator Management (final, August 2025)", url: "https://pages.nist.gov/800-63-4/sp800-63b.html" };
const NIST_63B_PDF = { title: "NIST SP 800-63B-4 (PDF)", url: "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63B-4.pdf" };
const CISA_PASSWORDS = { title: "CISA Secure Our World – Use Strong Passwords", url: "https://www.cisa.gov/secure-our-world/use-strong-passwords" };
const CISA_MFA = { title: "CISA Secure Our World – Turn On Multifactor Authentication", url: "https://www.cisa.gov/secure-our-world/turn-mfa" };
const CISA_PR_MFA = { title: "CISA – Implementing Phishing-Resistant MFA (fact sheet)", url: "https://www.cisa.gov/sites/default/files/publications/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf" };
const CISA_NUMBER_MATCHING = { title: "CISA – Implementing Number Matching in MFA Applications (fact sheet)", url: "https://www.cisa.gov/sites/default/files/publications/fact-sheet-implement-number-matching-in-mfa-applications-508c.pdf" };
const DBIR_2026 = { title: "Verizon 2026 Data Breach Investigations Report (DBIR)", url: "https://www.verizon.com/business/resources/reports/dbir/" };

export default {
  slug: "passwords-mfa",
  title: "Passwords, Passphrases and Multi-Factor Authentication",
  category: "Identity & Access",
  level: "Foundation",
  summary: "Why length beats complexity, how passphrases and password managers help, and which kinds of MFA really stop attackers.",
  description: "Stolen and reused passwords are still one of the easiest ways into an organisation. This course explains the current NIST guidance – long passphrases, no forced complexity rules, no routine expiry – and how password managers and multi-factor authentication, especially phishing-resistant passkeys and security keys, protect your Biztat account.",
  learningObjectives: [
    "Create long, memorable passphrases that meet the NIST SP 800-63B-4 minimum of 15 characters",
    "Explain why complexity rules and forced periodic changes are no longer recommended",
    "Use a password manager so that every account has a unique password",
    "Compare MFA methods and explain why phishing-resistant MFA (passkeys, FIDO2 security keys) is strongest",
    "Respond correctly to an MFA prompt you did not start"
  ],
  whyItMatters: [
    { stat: "15+", text: "characters is the NIST SP 800-63B-4 minimum for a password used on its own, and composition rules \"SHALL NOT\" be imposed.", source: NIST_63B },
    { stat: "13%", text: "of breaches in the 2026 DBIR started with the abuse of stolen credentials.", source: DBIR_2026 },
    { stat: "16+", text: "characters, random and unique for every account, is CISA's everyday advice for strong passwords.", source: CISA_PASSWORDS }
  ],
  durationMinutes: 30,
  audienceNote: "Mandatory for every Biztat employee, contractor and intern.",
  cover: "passwords",
  passMark: 80,
  maxAttempts: 3,
  cooldownMinutes: 30,
  questionsPerAttempt: 10,
  openToAll: true,
  lessons: [
    {
      title: "How passwords get stolen",
      estimatedMinutes: 5,
      body: `## Attackers rarely "guess" your password

Most stolen passwords are not cracked by clever guessing. They are:

- **Phished** – typed into a fake login page.
- **Reused** – taken from a breach of another website and tried on your work account. This is called *credential stuffing*.
- **Collected by malware** – captured from an infected personal device.
- **Shared** – written on a note, sent in chat or told to a "helpful" caller.

> [!STAT] What the evidence says
> Verizon's 2026 DBIR found that 13% of breaches began with the abuse of stolen credentials. Vulnerability exploitation (31%) has overtaken it, but stolen passwords remain one of the main ways in.

## Why reuse is so dangerous

If you use the same password for a shopping site and for Biztat, a breach at the shopping site gives criminals a working key to our systems. They use automated tools to try leaked email and password pairs against thousands of services at once.

> [!DONT] Don't do this
> Don't reuse your Biztat password anywhere else, and don't use a "base" password with small changes (Summer2025!, Summer2026!). Attackers try those patterns first.

## Good news

Two habits defeat most of these attacks: a **unique password for every account** (a password manager makes this easy) and **multi-factor authentication** on every account that offers it.`,
      keyTakeaways: [
        "Most passwords are stolen through phishing, reuse and malware, not guessed.",
        "Reusing a password lets one breach unlock many accounts.",
        "Unique passwords plus MFA stop most account takeovers."
      ],
      sources: [DBIR_2026, CISA_PASSWORDS]
    },
    {
      title: "Length beats complexity: the NIST rules",
      estimatedMinutes: 8,
      interactive: "password-explorer",
      body: `## What changed

For years, policies demanded a capital letter, a number and a symbol, and forced a change every 90 days. People responded with predictable patterns such as \`Password1!\` and \`Password2!\`. NIST's final SP 800-63B-4 (August 2025) sets different rules.

## The NIST SP 800-63B-4 password rules

- **Minimum length:** passwords used as the only factor **shall** be at least **15 characters**. (Passwords used only together with another factor may be shorter but at least 8.)
- **Maximum length:** systems **should** allow at least **64 characters**, so long passphrases fit.
- **No composition rules:** systems **shall not** force mixtures of character types.
- **No periodic changes:** systems **shall not** force routine password changes – but **shall** force a change when there is **evidence of compromise**.
- **Blocklist:** new passwords **shall** be checked against a list of breached passwords, dictionary words and context words such as the service name or your username.
- **Password managers:** systems **shall** allow password managers and autofill, and **should** allow paste.

> [!NOTE] SecureAware follows these rules
> Changing your password in SecureAware requires 15 or more characters, applies no symbol or number rules and blocks common and breached passwords.

## Passphrases

A passphrase is several unrelated words, for example \`lantern orbit pepper canal\`. It is long, easy to remember and easy to type. CISA suggests a phrase of 4 to 7 unrelated words.

> [!DO] Do this
> Pick words at random – not a song lyric, quote or your family's names – and add more words rather than symbols to make it stronger.

Try the explorer below to see how length and common words change the strength of a password.`,
      keyTakeaways: [
        "Use at least 15 characters; longer is stronger.",
        "Complexity rules and forced 90-day changes are no longer recommended by NIST.",
        "Change a password straight away if it may have been exposed.",
        "Passphrases of 4–7 random words are strong and memorable."
      ],
      sources: [NIST_63B, NIST_63B_PDF, CISA_PASSWORDS]
    },
    {
      title: "Password managers and unique passwords",
      estimatedMinutes: 6,
      body: `## One strong password to remember

A password manager is a program that generates, stores and fills in your passwords. CISA's advice: with a password manager, you only need to remember **one** strong password – the one that unlocks the manager.

## How to use one well

1. Protect the manager with a long passphrase **and** MFA.
2. Let it **generate** a random password for every new account.
3. Use the autofill feature – it also helps against phishing, because a good manager will not offer your Biztat password on a look-alike site.
4. Replace reused passwords, starting with email, banking and work accounts.

> [!NOTE] Company-approved tools
> Use the password manager approved by Biztat IT for work accounts. Biztat's specific product choice is an **assumption to be validated** with the IT team.

## Breached-password checks

Services like SecureAware check new passwords against lists of passwords already exposed in breaches. If a password is rejected as "breached", it does not mean *your* account was hacked – it means that exact password is already known to criminals.

> [!DONT] Don't do this
> Don't store work passwords in a browser on a shared or personal computer, in a spreadsheet, or on a sticky note.

> [!DO] Do this
> If you think a password has been exposed, change it straight away through the official portal and tell the IT Service Desk.`,
      keyTakeaways: [
        "A password manager lets every account have a unique, random password.",
        "Protect the manager itself with a long passphrase and MFA.",
        "Autofill helps spot look-alike phishing sites.",
        "Change a password immediately if it may be exposed."
      ],
      sources: [CISA_PASSWORDS, NIST_63B]
    },
    {
      title: "Multi-factor authentication: which kind?",
      estimatedMinutes: 6,
      body: `## Why MFA matters

MFA asks for something extra besides your password – a code, a tap on your phone, a fingerprint or a security key. CISA puts it simply: even if someone steals your password, they cannot meet the second step.

## Not all MFA is equal, from weakest to strongest

- **SMS or email codes** – better than nothing, but codes can be phished or intercepted. NIST treats phone-network (SMS/voice) authentication as a "restricted" option.
- **Authenticator app codes** – a code that changes every 30 seconds. Stronger, but a fake site can still ask you to type it.
- **Push approval with number matching** – you type the number shown on the login screen into your phone. CISA recommends number matching to reduce MFA fatigue, but notes it is **not** phishing-resistant.
- **Phishing-resistant MFA (passkeys, FIDO2 security keys)** – the login is cryptographically tied to the real website, so a fake site cannot use it. CISA describes this as the strongest MFA available.

> [!STAT] Standard
> NIST SP 800-63B-4 requires phishing-resistant authenticators at the highest assurance level (AAL3) and requires services at AAL2 to offer at least one phishing-resistant option.

> [!DO] Do this
> Turn on MFA for your email, cloud storage, banking and social media – not just work. Choose a passkey or security key when it is offered, especially for administrator accounts.`,
      keyTakeaways: [
        "MFA stops most attacks that rely on a stolen password.",
        "SMS codes are the weakest option; app codes and number matching are better.",
        "Passkeys and FIDO2 security keys are phishing-resistant and strongest."
      ],
      sources: [CISA_MFA, CISA_PR_MFA, CISA_NUMBER_MATCHING, NIST_63B]
    },
    {
      title: "MFA prompts you did not start",
      estimatedMinutes: 5,
      body: `## Push-bombing

If an attacker already knows your password, they can trigger sign-in prompts over and over until you tap **Approve** by mistake or just to stop the noise. CISA calls this MFA fatigue or push-bombing. NIST SP 800-63B-4 asks services to limit how many push notifications they send for exactly this reason.

> [!WARNING] Warning sign
> A sign-in prompt, code or "is this you?" message that you did not ask for means your password is probably known to someone else.

## What to do

1. **Deny** the prompt. Never approve something you did not start.
2. **Change your password** straight away through the official portal (not a link in a message).
3. **Report it** to the Information Security team or IT Service Desk, even if the prompts stop.

> [!DONT] Don't do this
> Never read out or forward a one-time code. No genuine Biztat IT person, bank or supplier will ask for it.

## Recovery codes and backup methods

Backup codes, recovery email addresses and phone numbers can also unlock your account. Store backup codes in your password manager, and keep your recovery details up to date.`,
      keyTakeaways: [
        "An unexpected MFA prompt means your password may be compromised.",
        "Deny, change your password through the official portal, and report it.",
        "Never share one-time codes; store backup codes safely."
      ],
      sources: [CISA_NUMBER_MATCHING, NIST_63B, CISA_MFA]
    }
  ],
  questions: [
    { lesson: 2, type: "single", difficulty: 1, prompt: "According to NIST SP 800-63B-4, what is the minimum length for a password that is used on its own (single-factor)?", explanation: "NIST SP 800-63B-4 requires at least 15 characters when a password is the only factor.", options: [["15 characters", true], ["8 characters", false], ["10 characters", false], ["6 characters", false]] },
    { lesson: 2, type: "true_false", difficulty: 1, prompt: "True or false: NIST now recommends forcing everyone to change their password every 90 days.", explanation: "NIST says systems shall not force periodic changes, but shall force a change when there is evidence of compromise.", options: [["False", true], ["True", false]] },
    { lesson: 2, type: "single", difficulty: 2, prompt: "Which password is likely to be strongest?", explanation: "Length from several random words beats short passwords with predictable substitutions and symbols.", options: [["copper lantern violet harbour", true], ["P@ssw0rd!", false], ["Biztat2026!", false], ["Summer#25", false]] },
    { lesson: 2, type: "single", difficulty: 2, prompt: "When does NIST say a password change should be forced?", explanation: "A change is required when there is evidence the password has been compromised – not on a fixed schedule.", options: [["When there is evidence it has been compromised", true], ["Every 30 days", false], ["Every time you log in from a new device", false], ["Never, under any circumstances", false]] },
    { lesson: 2, type: "multi", difficulty: 2, prompt: "Select ALL the kinds of passwords NIST says a blocklist should catch.", explanation: "The blocklist should include passwords from previous breaches, dictionary words and context-specific words such as the service name or username.", options: [["Passwords from previous data breaches", true], ["Dictionary words", true], ["Words based on the service name or your username", true], ["Any password longer than 20 characters", false]] },
    { lesson: 2, type: "true_false", difficulty: 2, prompt: "True or false: NIST says systems shall not require mixtures of character types (upper case, numbers, symbols).", explanation: "Composition rules \"SHALL NOT\" be imposed under SP 800-63B-4.", options: [["True", true], ["False", false]] },
    { lesson: 1, type: "single", difficulty: 1, prompt: "What is \"credential stuffing\"?", explanation: "Criminals try username and password pairs leaked from one breach against many other services, which works when people reuse passwords.", options: [["Trying passwords leaked from one site on many other sites", true], ["Guessing passwords one letter at a time", false], ["Storing too many passwords in a manager", false], ["Sending a password by SMS", false]] },
    { lesson: 1, type: "scenario", difficulty: 2, scenario: "A shopping website you use announces it was breached. You used the same password there as for your Biztat account.", prompt: "What should you do?", explanation: "The leaked password can be tried against your Biztat account. Change it at once through the official portal, make each password unique and tell IT.", options: [["Change your Biztat password now through the official portal, use unique passwords and tell IT", true], ["Do nothing because Biztat was not breached", false], ["Change only the shopping site password", false], ["Add a number to the end of the old password", false]] },
    { lesson: 3, type: "single", difficulty: 1, prompt: "What is the main benefit of a password manager?", explanation: "It generates and stores a unique, random password for every account so you only remember one strong passphrase.", options: [["Every account can have a unique, random password", true], ["You no longer need MFA", false], ["It shares passwords with your team automatically", false], ["It makes short passwords safe", false]] },
    { lesson: 3, type: "single", difficulty: 2, prompt: "How can a password manager's autofill help against phishing?", explanation: "Autofill is tied to the real site address, so it will not offer your saved password on a look-alike domain.", options: [["It will not offer your saved password on a look-alike website", true], ["It blocks all emails with links", false], ["It changes your password after every login", false], ["It deletes suspicious emails", false]] },
    { lesson: 4, type: "single", difficulty: 2, prompt: "Which MFA method is phishing-resistant?", explanation: "Passkeys and FIDO2 security keys are bound to the genuine website, so a fake site cannot use them.", options: [["A passkey or FIDO2 security key", true], ["A code sent by SMS", false], ["A code from an authenticator app", false], ["A code sent to your personal email", false]] },
    { lesson: 4, type: "true_false", difficulty: 2, prompt: "True or false: CISA says push approvals with number matching are phishing-resistant.", explanation: "CISA recommends number matching to reduce MFA fatigue, but explicitly says it is not phishing-resistant.", options: [["False", true], ["True", false]] },
    { lesson: 4, type: "single", difficulty: 1, prompt: "Why is MFA worth turning on even if you have a strong password?", explanation: "If your password is stolen, the attacker still cannot pass the second step.", options: [["A stolen password alone is no longer enough to get in", true], ["It makes your password shorter", false], ["It removes the need to lock your screen", false], ["It speeds up logging in", false]] },
    { lesson: 5, type: "scenario", difficulty: 2, scenario: "While you are in a meeting, your phone shows an MFA request: \"Approve sign-in to Microsoft 365?\" You are not signing in to anything.", prompt: "What should you do?", explanation: "Someone probably has your password. Deny, change the password through the official portal and report it.", options: [["Deny it, change your password through the official portal and report it", true], ["Approve it – it is probably a background sync", false], ["Ignore it and wait to see if it happens again", false], ["Approve it, then change your password later", false]] },
    { lesson: 5, type: "single", difficulty: 1, prompt: "Someone phones claiming to be from Biztat IT and asks you to read out the code just sent to your phone. What do you do?", explanation: "Genuine IT staff never ask for one-time codes. Refuse, hang up and report the call.", options: [["Refuse, hang up and report the call", true], ["Read it out – IT needs it to fix your account", false], ["Send it by chat instead of reading it out", false], ["Read out only half of the code", false]] },
    { lesson: 5, type: "single", difficulty: 2, prompt: "Where is the safest place to keep MFA backup (recovery) codes?", explanation: "Backup codes can unlock your account, so keep them in your protected password manager or another secure place – not in plain notes or email.", options: [["In your MFA-protected password manager", true], ["In an email to yourself", false], ["On a sticky note on your monitor", false], ["In a shared team document", false]] }
  ]
};
