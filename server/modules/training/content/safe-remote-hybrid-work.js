// Course 4. Checked against the primary sources on 2026-09-26.

const CISA_UPDATE = { title: "CISA Secure Our World – Update Software", url: "https://www.cisa.gov/secure-our-world/update-software" };
const CISA_SOW = { title: "CISA Secure Our World", url: "https://www.cisa.gov/secure-our-world" };
const CISA_PASSWORDS = { title: "CISA Secure Our World – Use Strong Passwords", url: "https://www.cisa.gov/secure-our-world/use-strong-passwords" };
const NIST_46 = { title: "NIST SP 800-46 Rev. 2 – Guide to Enterprise Telework, Remote Access, and BYOD Security", url: "https://csrc.nist.gov/pubs/sp/800/46/r2/final" };
const DBIR_2026 = { title: "Verizon 2026 Data Breach Investigations Report (DBIR)", url: "https://www.verizon.com/business/resources/reports/dbir/" };

export default {
  slug: "safe-remote-hybrid-work",
  title: "Safe Remote and Hybrid Work",
  category: "Remote Work",
  level: "Foundation",
  summary: "Work securely from home, client sites, cafés and while travelling: networks, VPN, device locking, updates and what to do if a device goes missing.",
  description: "Biztat staff work from the office, from home, at client premises and on the move. NIST's telework guidance tells organisations to assume that outside networks and places are hostile. This course turns that into everyday habits: using trusted networks and the VPN, protecting your screen and devices in public, keeping your home router and software up to date, and reporting a lost or stolen device immediately.",
  learningObjectives: [
    "Choose a safe network for work and use the company VPN when required",
    "Protect screens, conversations and devices when working in public",
    "Apply basic home router security",
    "Keep devices and software updated, as CISA advises",
    "Report a lost or stolen device immediately"
  ],
  whyItMatters: [
    { stat: "Hostile", text: "is how NIST SP 800-46 Rev. 2 tells organisations to treat external facilities, networks and devices when planning telework security.", source: NIST_46 },
    { stat: "31%", text: "of breaches in the 2026 DBIR started with the exploitation of a vulnerability – the kind of weakness software updates fix.", source: DBIR_2026 }
  ],
  durationMinutes: 25,
  audienceNote: "For everyone who works outside a Biztat office. Mandatory for Department Managers through the Training Needs Matrix.",
  cover: "remote",
  passMark: 80,
  maxAttempts: 3,
  cooldownMinutes: 30,
  questionsPerAttempt: 10,
  openToAll: true,
  lessons: [
    {
      title: "Assume the outside world is hostile",
      estimatedMinutes: 5,
      body: `## The NIST starting point

NIST SP 800-46 Rev. 2 advises organisations to plan telework security **on the assumption that external environments contain hostile threats**, and to assume that devices used outside the office are prone to loss or theft.

That is not a reason to worry – it simply explains why Biztat asks for a few extra habits when you are away from the office.

## What is different outside the office

- **Networks** are run by someone else. A café or hotel Wi-Fi may be poorly secured or even fake.
- **People nearby** can see your screen and hear your calls.
- **Devices** are easier to lose or have stolen.
- **Home equipment** such as routers and printers may never have been updated.

> [!EXAMPLE] Real-world pattern
> A consultant works on a client proposal on a train, joins the station Wi-Fi called "Free_Station_WiFi" and takes a call about the client's pricing. Three risks in one journey: an untrusted network, an exposed screen and an overheard conversation.`,
      keyTakeaways: [
        "Treat networks, places and devices outside the office as potentially hostile.",
        "Screens and conversations are visible and audible to others in public.",
        "A few consistent habits remove most of the extra risk."
      ],
      sources: [NIST_46]
    },
    {
      title: "Networks, public Wi-Fi and the VPN",
      estimatedMinutes: 6,
      interactive: "remote-risk",
      body: `## Choosing a network

From safest to least safe:

1. Your **home network** that you have secured (see lesson 4), or a **mobile hotspot** from your own phone.
2. A **client's guest network** that their staff have given you the details for.
3. **Public Wi-Fi** in cafés, hotels and airports.

> [!WARNING] Warning sign
> Open networks with no password, networks with generic names such as "Free WiFi", and login pages that ask for personal details or passwords are all signs to stop and use your phone's hotspot instead.

## Using the VPN

The company VPN encrypts traffic between your laptop and Biztat, so people on the same network cannot read it. Connect to the VPN **before** opening work systems when you are on any network you do not control. Biztat's exact VPN requirements are an **assumption to be validated** with the IT team.

> [!DO] Do this
> On public Wi-Fi, connect to the VPN first, check websites show a valid secure connection, and prefer your phone's hotspot for sensitive work.

> [!DONT] Don't do this
> Don't access Restricted data over public Wi-Fi without the VPN, and never ignore browser certificate warnings.

Try the exercise below: decide which situations are safe and which are risky.`,
      keyTakeaways: [
        "Prefer your secured home network or your phone's hotspot.",
        "Connect to the VPN before using work systems on networks you do not control.",
        "Stop if a network looks fake or a certificate warning appears."
      ],
      sources: [NIST_46, CISA_SOW]
    },
    {
      title: "Locking devices and working in public",
      estimatedMinutes: 5,
      body: `## Lock, every time

- Lock your screen whenever you step away (**Windows + L**, **Control + Command + Q** on a Mac).
- Use a strong passcode or biometric lock on your phone and laptop.
- Never leave devices unattended in cars, cafés or meeting rooms.

## Shoulder surfing and overheard calls

- Sit with your back to a wall where possible, or use a privacy screen filter.
- Do not discuss client names, pricing or personal data on calls in public places.
- In video calls, check what is visible behind you and close unrelated windows before sharing your screen.

## Travelling

Keep your laptop with you as hand luggage, and shut it down (not just sleep) when crossing borders or leaving it in a hotel room, so that disk encryption fully protects the data.

> [!DO] Do this
> Treat your laptop like your wallet: always with you or locked away.`,
      keyTakeaways: [
        "Lock your screen every time you step away.",
        "Keep client details off screens and calls in public places.",
        "Keep devices with you when travelling and shut them down when not in use."
      ],
      sources: [NIST_46, CISA_SOW]
    },
    {
      title: "Home router basics and keeping software updated",
      estimatedMinutes: 6,
      body: `## Home router basics

Your home router is the front door to your home network.

- Change the **default admin password** to a long, unique passphrase.
- Use **WPA2 or WPA3** Wi-Fi encryption with a strong Wi-Fi passphrase.
- Turn on **automatic firmware updates** if your router supports them, or check for updates regularly.
- Use a **guest network** for visitors and smart devices where possible.

## Keep software updated

CISA's *Update Software* guidance explains that providers issue updates to "patch" security weaknesses – and if we don't install them, they can't protect us. CISA recommends:

- Turning on **automatic updates**.
- Installing updates **as soon as possible**, especially critical ones.
- Installing all updates, **especially for web browsers and antivirus software**.

> [!STAT] Why it matters
> In the 2026 DBIR, exploitation of vulnerabilities was the most common way into breached organisations (31%).

> [!DONT] Don't do this
> Don't keep postponing "restart to update", and don't install "updates" from pop-ups on websites – get updates only from the device's settings or the official app store.`,
      keyTakeaways: [
        "Change your router's default admin password and use WPA2/WPA3.",
        "Turn on automatic updates and restart promptly to finish them.",
        "Only install updates from official settings or app stores."
      ],
      sources: [CISA_UPDATE, CISA_PASSWORDS, DBIR_2026]
    },
    {
      title: "Lost or stolen devices",
      estimatedMinutes: 4,
      body: `## Report immediately

If a Biztat laptop, phone, tablet, security key or USB drive – or a personal device with Biztat email or files on it – is lost or stolen:

1. **Report it to the IT Service Desk straight away**, day or night. IT can lock or wipe the device and reset access.
2. **Tell your manager.**
3. If it was stolen, **report it to the police** as well and keep the reference number.

> [!WARNING] Minutes matter
> The sooner IT knows, the sooner they can revoke sessions and wipe the device. A lost device reported the next morning may already have been accessed.

## No blame

Losing a device is usually an accident. Biztat expects fast reporting, not perfection. Hiding a loss is far more serious than the loss itself.

> [!DO] Do this
> Save the IT Service Desk number in your phone and in your wallet, so you can report even if your phone is the device that is missing.`,
      keyTakeaways: [
        "Report a lost or stolen device to the IT Service Desk immediately.",
        "Include personal devices that hold Biztat email or files.",
        "Fast reporting matters more than the mistake itself."
      ],
      sources: [NIST_46]
    }
  ],
  questions: [
    { lesson: 1, type: "single", difficulty: 1, prompt: "NIST SP 800-46 Rev. 2 advises planning telework security on which assumption?", explanation: "NIST advises assuming that external environments contain hostile threats.", options: [["External environments contain hostile threats", true], ["Home networks are always safe", false], ["Only office networks are ever attacked", false], ["Encryption is unnecessary outside the office", false]] },
    { lesson: 2, type: "scenario", difficulty: 2, scenario: "At the airport you see two open networks: \"Airport_Free_WiFi\" and \"Free Airport WiFi 2\". You need to send a client proposal.", prompt: "What is the safest option?", explanation: "Either network could be fake. Your phone's hotspot plus the VPN avoids the untrusted network entirely.", options: [["Use your phone's hotspot and connect to the VPN", true], ["Pick the one with the strongest signal", false], ["Pick the first one and send the file quickly", false], ["Use whichever one asks for your email address", false]] },
    { lesson: 2, type: "single", difficulty: 1, prompt: "What does the company VPN do?", explanation: "It encrypts traffic between your device and Biztat so others on the same network cannot read it.", options: [["Encrypts traffic between your device and Biztat", true], ["Makes your laptop battery last longer", false], ["Stops you receiving phishing emails", false], ["Replaces the need for a password", false]] },
    { lesson: 2, type: "true_false", difficulty: 2, prompt: "True or false: it is fine to click through a browser certificate warning on hotel Wi-Fi if you are in a hurry.", explanation: "Certificate warnings can mean someone is intercepting the connection. Stop and use a trusted network.", options: [["False", true], ["True", false]] },
    { lesson: 2, type: "single", difficulty: 2, prompt: "A café Wi-Fi login page asks for your work email address and password. What should you do?", explanation: "No genuine Wi-Fi login needs your work password. This is a common credential-harvesting trick.", options: [["Do not enter them; disconnect and use your phone's hotspot", true], ["Enter them – the café needs to verify you", false], ["Enter only your password", false], ["Enter a colleague's email instead", false]] },
    { lesson: 3, type: "single", difficulty: 1, prompt: "You need to leave your laptop for two minutes in a client's meeting room. What do you do?", explanation: "Lock the screen every time, or take the laptop with you.", options: [["Lock the screen or take the laptop with you", true], ["Leave it open – two minutes is fine", false], ["Close only the email window", false], ["Turn the brightness down", false]] },
    { lesson: 3, type: "scenario", difficulty: 2, scenario: "You are on a busy train and your manager calls to discuss a client's financial results and pricing.", prompt: "What is the best response?", explanation: "Others can overhear. Offer to call back from a private place, or keep the conversation general.", options: [["Explain you are in public and call back from a private place", true], ["Discuss it quietly – nobody is listening", false], ["Put it on speaker so you can type notes", false], ["Discuss it but avoid saying the client's name once", false]] },
    { lesson: 3, type: "true_false", difficulty: 2, prompt: "True or false: shutting a laptop down (rather than sleep) when leaving it gives disk encryption the most protection.", explanation: "Full disk encryption protects data best when the device is fully powered off.", options: [["True", true], ["False", false]] },
    { lesson: 4, type: "multi", difficulty: 2, prompt: "Select ALL the good home router practices.", explanation: "Change the default admin password, use WPA2/WPA3 and keep firmware updated. Leaving the default password is unsafe.", options: [["Change the default admin password", true], ["Use WPA2 or WPA3 encryption", true], ["Keep the router firmware updated", true], ["Keep the default admin password so IT can help", false]] },
    { lesson: 4, type: "single", difficulty: 1, prompt: "What does CISA recommend about software updates?", explanation: "CISA recommends turning on automatic updates and installing updates as soon as possible.", options: [["Turn on automatic updates and install updates as soon as possible", true], ["Wait six months to see if updates cause problems", false], ["Only update once a year", false], ["Only update if something stops working", false]] },
    { lesson: 4, type: "single", difficulty: 2, prompt: "A website pop-up says \"Your browser is out of date – click here to install the update\". What should you do?", explanation: "Fake update pop-ups deliver malware. Update only from the device's settings or the official store.", options: [["Close it and update only through the browser's own settings", true], ["Click it – updates are important", false], ["Download it but do not run it", false], ["Forward the link to IT and click it anyway", false]] },
    { lesson: 4, type: "single", difficulty: 2, prompt: "According to the 2026 DBIR, what was the most common initial way into breached organisations?", explanation: "Vulnerability exploitation was the top initial access vector at 31%, which is why prompt updating matters.", options: [["Exploitation of vulnerabilities", true], ["Lost laptops", false], ["Printer faults", false], ["Weak Wi-Fi signals", false]] },
    { lesson: 5, type: "scenario", difficulty: 1, scenario: "On Saturday evening you realise your Biztat laptop was stolen from your car.", prompt: "What should you do?", explanation: "Report immediately so IT can lock the device and revoke access; then tell your manager and the police.", options: [["Report it to the IT Service Desk immediately, then tell your manager and the police", true], ["Wait until Monday and tell your manager", false], ["Buy a replacement and say nothing", false], ["Change your social media password only", false]] },
    { lesson: 5, type: "true_false", difficulty: 2, prompt: "True or false: losing your personal phone does not need to be reported if it has your Biztat email on it.", explanation: "Any device holding Biztat email or files must be reported so access can be revoked.", options: [["False", true], ["True", false]] },
    { lesson: 5, type: "single", difficulty: 1, prompt: "Why does Biztat stress a \"no blame\" approach to lost devices?", explanation: "Fast, honest reporting limits the damage; hiding a loss makes things far worse.", options: [["So people report quickly and damage is limited", true], ["Because lost devices never matter", false], ["So nobody needs to lock their laptop", false], ["Because IT cannot do anything anyway", false]] }
  ]
};
