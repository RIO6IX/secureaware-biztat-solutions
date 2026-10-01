import informationSecurity from "./information-security.js";
import acceptableUse from "./acceptable-use.js";
import passwordAuthentication from "./password-authentication.js";
import dataClassification from "./data-classification.js";
import remoteWork from "./remote-work.js";
import incidentReporting from "./incident-reporting.js";
import cleanDesk from "./clean-desk.js";
import byod from "./byod.js";

export { SRC } from "./sources.js";

export const policies = [informationSecurity, acceptableUse, passwordAuthentication, dataClassification, remoteWork, incidentReporting, cleanDesk, byod];

const EVERY_ROLE = ["Employee", "Department Manager", "Security/HR Admin", "System Admin"];

// Default assignments: all staff get the core four; Consulting and Development also get data
// handling and remote work. BYOD is assigned once it is published.
export const assignmentSeed = [
  ...["information-security-policy", "acceptable-use", "password-authentication", "incident-reporting"]
    .flatMap((slug) => EVERY_ROLE.map((role) => ({ slug, targetType: "role", targetValue: role, dueInDays: 30 }))),
  ...["data-classification", "remote-hybrid-work"]
    .flatMap((slug) => ["Consulting", "Development"].map((department) => ({ slug, targetType: "department", targetValue: department, dueInDays: 21 })))
];
