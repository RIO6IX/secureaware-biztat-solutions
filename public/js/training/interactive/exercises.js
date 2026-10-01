// Content for the sorter-based exercises. All organisations, people and addresses are fictional.
import { sorter } from "./sorter.js";

export const dataClassifier = sorter({
  title: "Exercise: classify the information",
  intro: "Choose Biztat's classification level for each item.",
  categories: ["Public", "Internal", "Confidential", "Restricted"],
  items: [
    { text: "A press release already published on the Biztat website", answer: "Public", why: "It has been approved for anyone to read." },
    { text: "The staff canteen menu and office opening hours", answer: "Internal", why: "For staff only, with little harm if seen by outsiders." },
    { text: "A proposal and price quote for a new client", answer: "Confidential", why: "Commercially sensitive and only for the people working on the bid." },
    { text: "A payroll export with employee NIC numbers and bank details", answer: "Restricted", why: "Personal and financial data that could cause serious harm if leaked." },
    { text: "The Wi-Fi password and the admin password for the office router", answer: "Restricted", why: "Credentials give direct access to systems." },
    { text: "Minutes of an internal team stand-up about office moves", answer: "Internal", why: "Internal business information with low impact." },
    { text: "A client's project plan shared with us under contract", answer: "Confidential", why: "Client business information shared for a specific purpose." },
    { text: "Medical certificates submitted with sick-leave requests", answer: "Restricted", why: "Health information is highly sensitive personal data." }
  ]
});

export const incidentTriage = sorter({
  title: "Exercise: report it or not?",
  intro: "Decide whether each situation should be reported to the security team.",
  categories: ["Report now", "Not an incident"],
  items: [
    { text: "You receive an MFA approval request you did not start.", answer: "Report now", why: "Someone probably has your password." },
    { text: "Your laptop asks you to restart to install a scheduled Windows update.", answer: "Not an incident", why: "Normal maintenance – restart to finish the update." },
    { text: "You emailed a client file to the wrong external address.", answer: "Report now", why: "Client data left Biztat – possibly a personal data breach." },
    { text: "A pop-up says your files are encrypted and demands payment.", answer: "Report now", why: "Likely ransomware – report immediately and follow instructions." },
    { text: "Someone you don't know follows you through the secure office door.", answer: "Report now", why: "Tailgating is a physical security incident." },
    { text: "The IT Service Desk emails the planned maintenance window announced last week.", answer: "Not an incident", why: "An expected, verified notice (check it through the usual channel if unsure)." },
    { text: "You find a USB stick labelled \"Salaries 2026\" in the car park.", answer: "Report now", why: "Hand it to IT unopened – it could be lost data or a baited device." },
    { text: "You clicked a link in a text message and entered your work password.", answer: "Report now", why: "Your credentials may be stolen – minutes matter." }
  ]
});

export const remoteRisk = sorter({
  title: "Exercise: safe or risky?",
  intro: "Decide whether each remote-working situation is safe or risky.",
  categories: ["Safe", "Risky"],
  items: [
    { text: "Working on client files over hotel Wi-Fi without the VPN", answer: "Risky", why: "Hotel networks are outside your control – connect to the VPN or use your hotspot." },
    { text: "Using your phone's personal hotspot and the company VPN at a café", answer: "Safe", why: "You control the network and traffic to Biztat is encrypted." },
    { text: "Leaving your unlocked laptop on the café table while you order", answer: "Risky", why: "Anyone can read or take it. Lock it and keep it with you." },
    { text: "Discussing a client's pricing on speakerphone on the train", answer: "Risky", why: "Other passengers can overhear confidential details." },
    { text: "Installing the router update from the router's own admin page", answer: "Safe", why: "Official updates fix security weaknesses." },
    { text: "Clicking a website pop-up that says \"Update your browser now\"", answer: "Risky", why: "Fake update prompts deliver malware – update only through official settings." },
    { text: "Using a privacy screen filter on a flight", answer: "Safe", why: "It stops people nearby reading your screen." },
    { text: "Keeping the router's default admin password because it's printed on the sticker", answer: "Risky", why: "Default passwords are widely known – change it to a unique passphrase." }
  ]
});

export const secureCodeReview = sorter({
  title: "Exercise: secure code review",
  intro: "Decide whether each code snippet is vulnerable or safe.",
  categories: ["Vulnerable", "Safe"],
  items: [
    { code: true, text: "db.exec(\"DELETE FROM notes WHERE id = \" + request.query.id);", answer: "Vulnerable", why: "String concatenation allows SQL injection. Use a parameterised query." },
    { code: true, text: "db.prepare(\"SELECT * FROM notes WHERE id = ? AND owner_id = ?\").get(noteId, session.user.id);", answer: "Safe", why: "Parameterised and checks ownership against the session user." },
    { code: true, text: "card.innerHTML = \"<h2>\" + course.title + \"</h2>\";", answer: "Vulnerable", why: "Untrusted text inserted as HTML enables XSS. Use textContent." },
    { code: true, text: "heading.textContent = course.title;", answer: "Safe", why: "The value is treated as text and cannot run as code." },
    { code: true, text: "const apiKey = \"sk_live_4f9a...\"; // TODO move later", answer: "Vulnerable", why: "Secrets must never be committed. Use a secrets manager or environment variable." },
    { code: true, text: "const userId = request.body.userId; loadAttempts(userId);", answer: "Vulnerable", why: "Identity from the request body is an IDOR. Use the server-side session." },
    { code: true, text: "if (!hasRole(session.user, [\"Security/HR Admin\"])) return forbidden();", answer: "Safe", why: "Role checked on the server before the action runs." },
    { code: true, text: "catch (error) { response.end(error.stack); }", answer: "Vulnerable", why: "Stack traces leak internal details. Log them and return a generic message." }
  ]
});
