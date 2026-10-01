// Course 6. OWASP Top 10:2025 category names and prevention points checked on top10.owasp.org
// on 2026-09-26.

const TOP10 = { title: "OWASP Top 10:2025", url: "https://top10.owasp.org/2025/" };
const A01 = { title: "OWASP Top 10:2025 – A01 Broken Access Control", url: "https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/" };
const A03 = { title: "OWASP Top 10:2025 – A03 Software Supply Chain Failures", url: "https://top10.owasp.org/2025/A03_2025-Software_Supply_Chain_Failures/" };
const A05 = { title: "OWASP Top 10:2025 – A05 Injection", url: "https://top10.owasp.org/2025/A05_2025-Injection/" };
const CS_SQLI = { title: "OWASP Cheat Sheet – SQL Injection Prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html" };
const CS_INPUT = { title: "OWASP Cheat Sheet – Input Validation", url: "https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html" };
const CS_XSS = { title: "OWASP Cheat Sheet – Cross Site Scripting Prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html" };
const CS_SECRETS = { title: "OWASP Cheat Sheet – Secrets Management", url: "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html" };
const CS_AUTHZ = { title: "OWASP Cheat Sheet – Authorization", url: "https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html" };
const CS_REVIEW = { title: "OWASP Cheat Sheet – Secure Code Review", url: "https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html" };
const DBIR_2026 = { title: "Verizon 2026 Data Breach Investigations Report (DBIR)", url: "https://www.verizon.com/business/resources/reports/dbir/" };

export default {
  slug: "secure-development-essentials",
  title: "Secure Development Essentials",
  category: "Application Security",
  level: "Intermediate",
  summary: "The OWASP Top 10:2025, input validation, parameterised queries, output encoding, secrets, dependencies and secure code review for Biztat developers.",
  description: "Biztat builds and maintains software for clients. This course gives developers a practical grounding in the current OWASP Top 10 (2025 edition) and the habits that prevent the most common flaws: validating input, never building queries from strings, encoding output, enforcing access control on the server, keeping secrets out of code, managing dependencies and reviewing code for security.",
  learningObjectives: [
    "Name the ten OWASP Top 10:2025 categories and give an example of each",
    "Prevent injection with parameterised queries and positive server-side input validation",
    "Prevent cross-site scripting with context-aware output encoding",
    "Enforce access control on the server, deny by default and check record ownership",
    "Keep secrets out of source code and manage third-party dependencies",
    "Apply a security checklist during code review"
  ],
  whyItMatters: [
    { stat: "31%", text: "of breaches in the 2026 DBIR began with the exploitation of a vulnerability – now the most common way in.", source: DBIR_2026 },
    { stat: "#1", text: "Broken Access Control remains the first category of the OWASP Top 10:2025.", source: TOP10 },
    { stat: "New", text: "Software Supply Chain Failures (A03) is a category in the 2025 edition, covering how software is built, distributed and updated.", source: A03 }
  ],
  durationMinutes: 45,
  audienceNote: "Mandatory for the Development department through the Training Needs Matrix; useful for anyone who writes scripts or configures systems.",
  cover: "code",
  passMark: 80,
  maxAttempts: 3,
  cooldownMinutes: 30,
  questionsPerAttempt: 10,
  openToAll: true,
  lessons: [
    {
      title: "The OWASP Top 10:2025",
      estimatedMinutes: 8,
      body: `## What it is

The OWASP Top 10 is a widely used awareness document that lists the most critical security risks to web applications. The current edition is **2025**.

1. **A01 Broken Access Control** – users can act outside their permissions, such as viewing someone else's record by changing an ID.
2. **A02 Security Misconfiguration** – insecure defaults, verbose errors, open storage, unnecessary features switched on.
3. **A03 Software Supply Chain Failures** – compromises in how software is built, distributed or updated, including vulnerable or malicious dependencies.
4. **A04 Cryptographic Failures** – sensitive data not protected, or protected with weak or misused cryptography.
5. **A05 Injection** – untrusted input is sent to an interpreter (database, browser, shell) and executed as commands. This includes SQL injection and cross-site scripting.
6. **A06 Insecure Design** – missing or ineffective security controls in the design itself.
7. **A07 Authentication Failures** – weak login, session or credential handling.
8. **A08 Software or Data Integrity Failures** – trusting code, updates or data without checking their integrity.
9. **A09 Security Logging and Alerting Failures** – attacks are not recorded or nobody is alerted.
10. **A10 Mishandling of Exceptional Conditions** – errors and unusual states handled in ways that fail open or leak information.

> [!NOTE] Awareness, not a complete standard
> The Top 10 is a starting point. For full requirements, teams use standards such as the OWASP Application Security Verification Standard (ASVS).

The rest of this course focuses on the habits that prevent the categories developers meet most often.`,
      keyTakeaways: [
        "The current edition is the OWASP Top 10:2025.",
        "Broken Access Control is still number one.",
        "Software Supply Chain Failures and Mishandling of Exceptional Conditions are categories in the 2025 edition."
      ],
      sources: [TOP10, A01, A03, A05]
    },
    {
      title: "Input validation and parameterised queries",
      estimatedMinutes: 9,
      interactive: "secure-code-review",
      body: `## Injection in one sentence

OWASP A05:2025 describes injection as a flaw that lets untrusted input reach an interpreter – a database, a browser or the command line – which then executes part of that input as commands.

## Never build queries from strings

\`\`\`Vulnerable – string concatenation (JavaScript)
const sql = "SELECT * FROM invoices WHERE client_id = " + request.query.clientId;
db.exec(sql);
\`\`\`

An attacker can send \`1 OR 1=1\` and read every client's invoices.

\`\`\`Safe – parameterised query (JavaScript, node:sqlite)
const invoices = db.prepare("SELECT * FROM invoices WHERE client_id = ?").all(clientId);
\`\`\`

The database receives the query and the value separately, so the value can never change the query's structure. OWASP's first recommendation is to use a safe API that provides a **parameterised interface** (or an ORM that does so).

## Validate input on the server

- Use **positive (allow-list) validation**: define what *is* allowed – type, length, format, range, enum – and reject everything else.
- Validate on the **server**. Browser checks help users but can be bypassed.
- Validation is a second layer, not a replacement for parameterisation: OWASP notes many applications must accept special characters.

> [!DO] Do this
> Validate every body, query and path value (type, length, enum, ID format), return 400 for invalid input and 413 for oversized requests – exactly what SecureAware's own API does.

Try the code review exercise below.`,
      keyTakeaways: [
        "Use parameterised queries or a safe API – never concatenate input into queries.",
        "Validate input on the server with allow-lists of type, length, format and range.",
        "Validation supports, but does not replace, parameterisation."
      ],
      sources: [A05, CS_SQLI, CS_INPUT]
    },
    {
      title: "Output encoding and cross-site scripting",
      estimatedMinutes: 8,
      body: `## How XSS works

Cross-site scripting (XSS) happens when untrusted data is placed into a web page in a way the browser treats as code. OWASP groups XSS with the other injection flaws in A05:2025.

\`\`\`Vulnerable – inserting untrusted HTML
element.innerHTML = "Welcome " + user.displayName;
\`\`\`

A display name such as \`<img src=x onerror=alert(document.cookie)>\` would run in every visitor's browser.

\`\`\`Safer – treat data as text
element.textContent = "Welcome " + user.displayName;
\`\`\`

## Defences

- **Encode output for its context** (HTML body, attribute, URL, JavaScript). Framework templating that escapes by default helps.
- Prefer **safe DOM APIs** such as \`textContent\` and \`setAttribute\` over \`innerHTML\`.
- If you must render rich text such as markdown, use a renderer that **escapes HTML first** and allows only a small set of elements.
- Add a strict **Content Security Policy** (for example \`script-src 'self'\` with no \`'unsafe-inline'\`) as defence in depth.
- Only allow \`http:\` and \`https:\` URLs in links – block \`javascript:\` URLs.

> [!EXAMPLE] In this app
> SecureAware never uses \`innerHTML\` for data. Lesson markdown is rendered by building DOM nodes directly, and the server sends a CSP that blocks inline scripts.`,
      keyTakeaways: [
        "XSS is untrusted data interpreted as code by the browser.",
        "Encode output for its context and prefer textContent over innerHTML.",
        "Use a strict Content Security Policy as a second layer."
      ],
      sources: [A05, CS_XSS]
    },
    {
      title: "Access control on the server",
      estimatedMinutes: 8,
      body: `## Still number one

OWASP A01:2025 Broken Access Control: users acting outside their intended permissions, leading to data disclosure, modification or destruction.

## Common mistakes

- Trusting a **user ID from the request** instead of the session – an *insecure direct object reference* (IDOR). OWASP's example: viewing or editing someone else's account by providing its identifier.
- Checking roles only in the **user interface** and not on the server.
- Forgetting the check on one endpoint, such as an export or an API used by a mobile app.

\`\`\`Vulnerable – identity from the request body
const userId = request.body.userId;
const attempts = db.prepare("SELECT * FROM quiz_attempts WHERE user_id = ?").all(userId);
\`\`\`

\`\`\`Safer – identity from the server-side session plus an ownership check
const attempt = db.prepare("SELECT * FROM quiz_attempts WHERE id = ?").get(attemptId);
if (!attempt || attempt.user_id !== session.user.id) return notFound();
\`\`\`

## OWASP prevention points

- **Deny by default**, except for public resources.
- Implement access control **once** and reuse it everywhere.
- Enforce **record ownership** rather than allowing any record to be read or changed.
- Log access control failures and alert on repeated attempts.

> [!DO] Do this
> Take the acting user only from the session, check role *and* object ownership on the server for every request, and return 404 rather than revealing that a record exists.`,
      keyTakeaways: [
        "Never trust a user ID sent by the client for the acting user.",
        "Deny by default and enforce record ownership on the server.",
        "Implement access checks once and reuse them for every endpoint."
      ],
      sources: [A01, CS_AUTHZ]
    },
    {
      title: "Secrets, dependencies and secure code review",
      estimatedMinutes: 9,
      body: `## Keep secrets out of code

API keys, database passwords, private keys and tokens must never be committed to source control – even in a private repository, and even "temporarily".

- Store secrets in an approved **secrets manager** or in environment variables injected at deployment.
- Give each secret the **least privilege** it needs and **rotate** it if it may have been exposed.
- Add secret scanning to your repository and CI pipeline.

> [!WARNING] Committed by mistake?
> Removing a secret in a later commit does not remove it from history. Treat it as exposed: revoke and rotate it, then report it to the Information Security team.

## Dependency and supply-chain risk (A03:2025)

OWASP's prevention points include:

- Keep a **Software Bill of Materials (SBOM)** of your components.
- Track **transitive** dependencies, not just the ones you added.
- **Remove** unused dependencies and features.
- **Continuously inventory** component versions and **monitor** sources such as CVE, NVD and OSV for vulnerabilities.

> [!NOTE] Fewer dependencies, smaller risk
> SecureAware deliberately uses only Node.js built-in modules, with no third-party runtime packages.

## Secure code review checklist

- Where does **untrusted input** enter, and is it validated?
- Are **queries parameterised** and output **encoded**?
- Is **authorisation** checked on the server for every action and object?
- Are **secrets** absent from the diff?
- Are **errors** handled without leaking details, and do they fail safely?
- Are security-relevant events **logged** without passwords, tokens or personal data?`,
      keyTakeaways: [
        "Never commit secrets; rotate any that may have been exposed.",
        "Know your dependencies (SBOM), remove unused ones and monitor for vulnerabilities.",
        "Review every change for input handling, authorisation, secrets, errors and logging."
      ],
      sources: [CS_SECRETS, A03, CS_REVIEW]
    }
  ],
  questions: [
    { lesson: 1, type: "single", difficulty: 1, prompt: "Which category is A01 in the OWASP Top 10:2025?", explanation: "Broken Access Control is A01 in the 2025 edition.", options: [["Broken Access Control", true], ["Injection", false], ["Cryptographic Failures", false], ["Security Misconfiguration", false]] },
    { lesson: 1, type: "single", difficulty: 2, prompt: "Which of these is a category in the OWASP Top 10:2025?", explanation: "Software Supply Chain Failures is A03 in the 2025 edition.", options: [["Software Supply Chain Failures", true], ["Slow Page Loading", false], ["Weak Colour Contrast", false], ["Too Many Microservices", false]] },
    { lesson: 1, type: "true_false", difficulty: 2, prompt: "True or false: in the OWASP Top 10:2025, cross-site scripting is covered under A05 Injection.", explanation: "OWASP's A05:2025 Injection category includes both SQL injection and cross-site scripting.", options: [["True", true], ["False", false]] },
    { lesson: 2, type: "single", difficulty: 2, prompt: "What is OWASP's preferred defence against SQL injection?", explanation: "Use a safe API with a parameterised interface so input can never change the query structure.", options: [["Parameterised queries (a safe API)", true], ["Removing quote characters from input", false], ["Hiding error messages only", false], ["Client-side validation", false]] },
    { lesson: 2, type: "scenario", difficulty: 2, scenario: "A pull request builds a query as: \"SELECT * FROM clients WHERE name = '\" + request.query.name + \"'\"", prompt: "What should the reviewer ask for?", explanation: "The query concatenates input and is injectable. It should use a parameterised query with a placeholder.", options: [["Rewrite it as a parameterised query with a placeholder", true], ["Approve it because the field is only a name", false], ["Wrap it in a try/catch", false], ["Add a comment explaining the risk", false]] },
    { lesson: 2, type: "single", difficulty: 2, prompt: "What is \"positive\" (allow-list) input validation?", explanation: "Define exactly what is allowed – type, length, format, range – and reject everything else.", options: [["Defining what is allowed and rejecting everything else", true], ["Blocking a list of known bad words", false], ["Trusting input from logged-in users", false], ["Validating only in the browser", false]] },
    { lesson: 2, type: "true_false", difficulty: 1, prompt: "True or false: validation in the browser is enough because users cannot change JavaScript.", explanation: "Attackers can bypass the browser entirely and call the API directly. Always validate on the server.", options: [["False", true], ["True", false]] },
    { lesson: 3, type: "single", difficulty: 2, prompt: "Which line safely displays a user's name in a web page?", explanation: "textContent treats the value as text, so any markup in the name is shown literally instead of running.", options: [["element.textContent = user.displayName", true], ["element.innerHTML = user.displayName", false], ["document.write(user.displayName)", false], ["eval(user.displayName)", false]] },
    { lesson: 3, type: "multi", difficulty: 3, prompt: "Select ALL the measures that help prevent cross-site scripting.", explanation: "Context-aware encoding, safe DOM APIs and a strict CSP all help; allowing javascript: URLs creates XSS.", options: [["Encode output for its context", true], ["Use textContent instead of innerHTML for data", true], ["Send a strict Content Security Policy", true], ["Allow javascript: URLs in user-supplied links", false]] },
    { lesson: 4, type: "scenario", difficulty: 2, scenario: "An API endpoint returns quiz attempts for whatever userId is sent in the request body. The front end always sends the logged-in user's id.", prompt: "What is the problem?", explanation: "This is an insecure direct object reference: any user can change the id. Identity must come from the server-side session with an ownership check.", options: [["Anyone can change the userId to read other people's data (IDOR)", true], ["Nothing – the front end sends the right id", false], ["The endpoint should use GET instead of POST", false], ["The response is too large", false]] },
    { lesson: 4, type: "single", difficulty: 2, prompt: "What does \"deny by default\" mean for access control?", explanation: "Unless a resource is public, access is refused unless a rule explicitly grants it.", options: [["Access is refused unless a rule explicitly allows it", true], ["Every user starts as an administrator", false], ["Only the home page is protected", false], ["Access is allowed until someone complains", false]] },
    { lesson: 4, type: "true_false", difficulty: 2, prompt: "True or false: hiding the Admin button in the user interface is enough to protect admin functions.", explanation: "Users can call the API directly. Roles must be checked on the server for every request.", options: [["False", true], ["True", false]] },
    { lesson: 5, type: "scenario", difficulty: 2, scenario: "You notice a developer committed a production database password to the repository last week, then removed it in a later commit.", prompt: "What should happen?", explanation: "Git history still holds the secret. Treat it as exposed: revoke and rotate it, and report it.", options: [["Treat it as exposed: rotate the password and report it", true], ["Nothing – it has been removed", false], ["Make the repository private", false], ["Rename the variable", false]] },
    { lesson: 5, type: "single", difficulty: 2, prompt: "What is an SBOM?", explanation: "A Software Bill of Materials lists the components and dependencies in your software, which OWASP recommends managing centrally.", options: [["A list of the components and dependencies in your software", true], ["A type of firewall", false], ["A code formatting standard", false], ["A password manager", false]] },
    { lesson: 5, type: "multi", difficulty: 2, prompt: "Select ALL the OWASP recommendations for managing software supply chain risk.", explanation: "OWASP recommends SBOMs, tracking transitive dependencies, removing unused ones and monitoring vulnerability sources.", options: [["Track transitive dependencies as well as direct ones", true], ["Remove unused dependencies", true], ["Monitor CVE, NVD and OSV for your components", true], ["Add as many libraries as possible to save time", false]] },
    { lesson: 5, type: "single", difficulty: 1, prompt: "Where should application secrets such as API keys be kept?", explanation: "Use an approved secrets manager or environment variables injected at deployment – never source code.", options: [["In an approved secrets manager or deployment environment variables", true], ["In a config file committed to the repository", false], ["In a comment at the top of the code", false], ["In the project's README", false]] }
  ]
};
