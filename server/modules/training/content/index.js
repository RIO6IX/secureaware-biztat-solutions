import phishing from "./phishing-social-engineering.js";
import passwords from "./passwords-mfa.js";
import dataHandling from "./handling-client-personal-data.js";
import remoteWork from "./safe-remote-hybrid-work.js";
import incidents from "./incident-reporting.js";
import secureDevelopment from "./secure-development-essentials.js";

export const courses = [phishing, passwords, dataHandling, remoteWork, incidents, secureDevelopment];

// Training Needs Matrix seed. role "*" means every role; department null means every department.
export const matrixSeed = [
  { role: "*", department: null, slugs: ["phishing-social-engineering", "passwords-mfa", "handling-client-personal-data", "incident-reporting"], dueInDays: 30 },
  { role: "Department Manager", department: null, slugs: ["safe-remote-hybrid-work"], dueInDays: 45 },
  { role: "*", department: "Development", slugs: ["secure-development-essentials"], dueInDays: 45 },
  { role: "Security/HR Admin", department: null, slugs: ["phishing-social-engineering", "passwords-mfa", "handling-client-personal-data", "safe-remote-hybrid-work", "incident-reporting", "secure-development-essentials"], dueInDays: 30 },
  { role: "System Admin", department: null, slugs: ["phishing-social-engineering", "passwords-mfa", "handling-client-personal-data", "safe-remote-hybrid-work", "incident-reporting", "secure-development-essentials"], dueInDays: 30 }
];
