import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 4000);

const daysFromNow = (offset) => {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const users = [
  { id: 1, name: "Nimal Perera", username: "nimal.manager", department: "Leadership", role: "Management", policiesAssigned: 6, policiesAcknowledged: 6, trainingAssigned: 4, trainingCompleted: 4, quizScore: 94, lastActivity: daysFromNow(-1) },
  { id: 2, name: "Ayesha Fernando", username: "ayesha.manager", department: "Leadership", role: "Management", policiesAssigned: 6, policiesAcknowledged: 5, trainingAssigned: 4, trainingCompleted: 4, quizScore: 88, lastActivity: daysFromNow(-2) },
  { id: 3, name: "Kavindu Silva", username: "kavindu.consultant", department: "Consulting", role: "Consultant", policiesAssigned: 5, policiesAcknowledged: 5, trainingAssigned: 4, trainingCompleted: 4, quizScore: 91, lastActivity: daysFromNow(-1) },
  { id: 4, name: "Dinithi Jayasinghe", username: "dinithi.consultant", department: "Consulting", role: "Consultant", policiesAssigned: 5, policiesAcknowledged: 4, trainingAssigned: 4, trainingCompleted: 3, quizScore: 76, lastActivity: daysFromNow(-4) },
  { id: 5, name: "Ravindu Senanayake", username: "ravindu.consultant", department: "Consulting", role: "Consultant", policiesAssigned: 5, policiesAcknowledged: 5, trainingAssigned: 4, trainingCompleted: 4, quizScore: 86, lastActivity: daysFromNow(-2) },
  { id: 6, name: "Tharushi Maduranga", username: "tharushi.marketing", department: "Marketing", role: "Marketing", policiesAssigned: 5, policiesAcknowledged: 4, trainingAssigned: 3, trainingCompleted: 2, quizScore: 68, lastActivity: daysFromNow(-7) },
  { id: 7, name: "Sahan Wijesinghe", username: "sahan.marketing", department: "Marketing", role: "Marketing", policiesAssigned: 5, policiesAcknowledged: 5, trainingAssigned: 3, trainingCompleted: 3, quizScore: 82, lastActivity: daysFromNow(-3) },
  { id: 8, name: "Isuru Gunawardena", username: "isuru.contractor", department: "Development", role: "External Contractor", policiesAssigned: 4, policiesAcknowledged: 3, trainingAssigned: 4, trainingCompleted: 2, quizScore: 64, lastActivity: daysFromNow(-9) },
  { id: 9, name: "Piumi Ekanayake", username: "piumi.intern", department: "Internship", role: "Intern", policiesAssigned: 4, policiesAcknowledged: 4, trainingAssigned: 3, trainingCompleted: 3, quizScore: 79, lastActivity: daysFromNow(-2) },
  { id: 10, name: "Chamod Rathnayake", username: "chamod.intern", department: "Internship", role: "Intern", policiesAssigned: 4, policiesAcknowledged: 3, trainingAssigned: 3, trainingCompleted: 2, quizScore: 72, lastActivity: daysFromNow(-6) }
];

const overdueItems = [
  { id: 1, userId: 8, category: "Policy", title: "Secure Development Policy v1.2", dueDate: daysFromNow(-9), severity: "high", reminderSent: false },
  { id: 2, userId: 6, category: "Training", title: "Phishing Awareness Refresher", dueDate: daysFromNow(-7), severity: "high", reminderSent: true },
  { id: 3, userId: 4, category: "Training", title: "Client Data Handling", dueDate: daysFromNow(-4), severity: "medium", reminderSent: false },
  { id: 4, userId: 2, category: "Policy", title: "Remote Working Policy v2.0", dueDate: daysFromNow(-3), severity: "medium", reminderSent: false },
  { id: 5, userId: 10, category: "Policy", title: "Acceptable Use Policy v1.0", dueDate: daysFromNow(-2), severity: "low", reminderSent: true }
];

let notifications = [
  { id: 1, type: "risk", title: "High-risk compliance item", message: "Secure Development Policy acknowledgement is 9 days overdue.", createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), read: false },
  { id: 2, type: "training", title: "Training completion improved", message: "Consulting reached 92% training completion this week.", createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), read: false },
  { id: 3, type: "policy", title: "Policy version published", message: "Remote Working Policy v2.0 is now included in compliance reporting.", createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), read: true },
  { id: 4, type: "report", title: "Weekly report ready", message: "The weekly executive compliance summary is ready to export.", createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), read: true }
];

let notificationSettings = {
  assignmentCreated: true,
  dueSoon: true,
  overdue: true,
  weeklyDigest: true
};

const auditEvents = [
  { id: 1, actor: "compliance.admin", action: "REPORT_VIEWED", target: "Executive compliance summary", createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
  { id: 2, actor: "system", action: "REMINDER_SENT", target: "Phishing Awareness Refresher", createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: 3, actor: "policy.admin", action: "POLICY_PUBLISHED", target: "Remote Working Policy v2.0", createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString() },
  { id: 4, actor: "training.admin", action: "TRAINING_ASSIGNED", target: "Client Data Handling", createdAt: new Date(Date.now() - 29 * 60 * 60 * 1000).toISOString() }
];

let nextPolicyId = 5;
let nextPolicyAssignmentId = 5;
let nextAcknowledgementId = 3;

const policies = [
  {
    id: 1,
    title: "Acceptable Use Policy",
    category: "Information Security",
    version: "1.0",
    owner: "Information Security",
    status: "published",
    effectiveDate: daysFromNow(-22),
    summary: "Defines approved use of Biztat Solutions systems, internet, email and company information assets.",
    content: "Employees must use company systems for approved business purposes, protect credentials, avoid unauthorized software and report suspected misuse."
  },
  {
    id: 2,
    title: "Password and MFA Policy",
    category: "Access Control",
    version: "1.1",
    owner: "IT Security",
    status: "published",
    effectiveDate: daysFromNow(-18),
    summary: "Sets passphrase, password manager and multi-factor authentication requirements.",
    content: "Passwords must be unique, protected and not shared. MFA must be enabled for approved business systems and unexpected prompts must be reported."
  },
  {
    id: 3,
    title: "Remote Work Security Policy",
    category: "Remote Work",
    version: "2.0",
    owner: "Human Resources",
    status: "published",
    effectiveDate: daysFromNow(-8),
    summary: "Explains secure remote access, device handling, network use and home-working expectations.",
    content: "Remote work requires approved devices, secure networks, screen privacy and company authorization before accessing client information."
  },
  {
    id: 4,
    title: "Secure Development Policy",
    category: "Application Security",
    version: "1.2",
    owner: "Engineering Security",
    status: "draft",
    effectiveDate: "",
    summary: "Draft policy for input validation, dependency review, secrets handling and secure release checks.",
    content: "Developers must validate input, keep dependencies reviewed, protect secrets and follow secure review practices before release."
  }
];

const policyAssignments = [
  { id: 1, policyId: 1, targetType: "role", targetValue: "Consultant", dueDate: daysFromNow(8), status: "assigned" },
  { id: 2, policyId: 2, targetType: "department", targetValue: "Marketing", dueDate: daysFromNow(12), status: "assigned" },
  { id: 3, policyId: 3, targetType: "department", targetValue: "Leadership", dueDate: daysFromNow(-3), status: "assigned" },
  { id: 4, policyId: 1, targetType: "user", targetValue: "isuru.contractor", dueDate: daysFromNow(-9), status: "assigned" }
];

const acknowledgements = [
  { id: 1, policyId: 1, policyVersion: "1.0", userId: 3, statement: "I have read and understood this policy.", acknowledgedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString() },
  { id: 2, policyId: 2, policyVersion: "1.1", userId: 6, statement: "I agree to follow this policy.", acknowledgedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString() }
];

let nextQuizAttemptId = 5;

const learningModules = [
  {
    id: 1,
    title: "Recognise and Report Phishing",
    category: "Email Security",
    durationMinutes: 20,
    audience: "All employees",
    source: "CISA Secure Our World",
    image: "/training-phishing.svg",
    summary: "Spot urgent requests, suspicious links, spoofed senders and unusual attachment behaviour before reporting through approved channels.",
    lessons: [
      {
        title: "Pause before acting",
        body: "Phishing messages often create pressure: urgent payment requests, account warnings, document links, fake delivery notices or unusual requests from someone who appears senior. Slow down and inspect the sender, domain, link destination and context before taking action."
      },
      {
        title: "Verify through a trusted channel",
        body: "When a message asks for money, credentials, confidential files or system access, verify the request outside the email thread. Use a known phone number, approved chat channel or the service portal rather than replying to the suspicious message."
      },
      {
        title: "Report instead of hiding it",
        body: "Reporting helps the security team warn others, block malicious links and preserve evidence. Do not forward suspicious content to coworkers unless your organisation's reporting process asks you to do that."
      }
    ],
    quiz: {
      passMark: 75,
      questions: [
        { prompt: "What is the safest response to a suspicious payment email?", options: ["Approve quickly", "Verify through an approved separate channel", "Forward to personal email", "Reply with credentials"], answerIndex: 1 },
        { prompt: "Which sign can indicate phishing?", options: ["Unexpected urgency", "Normal internal newsletter", "Approved helpdesk ticket", "Scheduled meeting note"], answerIndex: 0 },
        { prompt: "Where should the email be reported?", options: ["Approved reporting process", "Social media", "Personal inbox", "Deleted items only"], answerIndex: 0 }
      ]
    }
  },
  {
    id: 2,
    title: "Password Manager and MFA Habits",
    category: "Access Control",
    durationMinutes: 18,
    audience: "Employees and contractors",
    source: "CISA and NIST guidance",
    image: "/training-password.svg",
    summary: "Use unique passphrases, approved password managers and multi-factor authentication, then report unexpected approval prompts.",
    lessons: [
      {
        title: "Use unique credentials",
        body: "A reused password turns one breached website into a business account breach. Use approved password-manager generated passwords or passphrases so every work system has a different secret."
      },
      {
        title: "Treat MFA prompts as security signals",
        body: "A surprise MFA prompt can mean someone has your password and is trying to sign in. Deny the prompt, change the affected password through the approved process and report the event."
      },
      {
        title: "Protect recovery paths",
        body: "Attackers target recovery email, phone numbers and backup codes. Keep recovery information current, store backup codes safely and never share one-time passcodes with anyone."
      }
    ],
    quiz: {
      passMark: 70,
      questions: [
        { prompt: "Which password habit is strongest?", options: ["Reuse one memorable password", "Use an approved password manager", "Write passwords on paper", "Share passwords with coworkers"], answerIndex: 1 },
        { prompt: "Why report unexpected MFA prompts?", options: ["They may show credential misuse", "They improve performance", "They are always harmless", "They replace security policy"], answerIndex: 0 }
      ]
    }
  },
  {
    id: 3,
    title: "Policy Acknowledgement Responsibilities",
    category: "Governance",
    durationMinutes: 15,
    audience: "Policy assignees",
    source: "NIST SP 800-12 and SP 800-50",
    image: "/training-policy.svg",
    summary: "Understand why current-version policy acknowledgement is evidence, and how training supports policy enforcement.",
    lessons: [
      {
        title: "Read the current version",
        body: "Policy acknowledgement must connect to the exact policy version shown to the learner. If the policy changes, the new version needs its own acknowledgement evidence."
      },
      {
        title: "Know what you are accepting",
        body: "Acknowledgement means the user has read, understood and agrees to follow the policy. If the language is unclear, the correct action is to ask the policy owner or manager before acknowledging."
      },
      {
        title: "Training supports policy enforcement",
        body: "Awareness training explains how to follow policy in daily work. Completion, quiz marks and acknowledgement records give managers evidence for follow-up and improvement."
      }
    ],
    quiz: {
      passMark: 80,
      questions: [
        { prompt: "Why must acknowledgements track the policy version?", options: ["To prove the exact version read", "To hide policy changes", "To bypass managers", "To remove audit evidence"], answerIndex: 0 },
        { prompt: "What should users do if a policy is unclear?", options: ["Ask the owner or manager", "Ignore it", "Publish a new version alone", "Share passwords"], answerIndex: 0 }
      ]
    }
  }
];

const quizAttempts = [
  { id: 1, moduleId: 1, userId: 3, score: 100, status: "passed", submittedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() },
  { id: 2, moduleId: 1, userId: 6, score: 67, status: "failed", submittedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() },
  { id: 3, moduleId: 2, userId: 8, score: 50, status: "failed", submittedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString() },
  { id: 4, moduleId: 3, userId: 2, score: 100, status: "passed", submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() }
];

const trendByPeriod = {
  30: [72, 75, 77, 79, 82, 84, 86],
  60: [64, 67, 70, 73, 77, 81, 86],
  90: [58, 62, 66, 70, 75, 80, 86]
};

function percent(completed, total) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function riskFor(user) {
  const policyRate = percent(user.policiesAcknowledged, user.policiesAssigned);
  const trainingRate = percent(user.trainingCompleted, user.trainingAssigned);
  if (policyRate < 80 || trainingRate < 70 || user.quizScore < 70) return "high";
  if (policyRate < 100 || trainingRate < 100 || user.quizScore < 80) return "medium";
  return "low";
}

function filteredUsers(department) {
  return !department || department === "All"
    ? users
    : users.filter((user) => user.department === department);
}

function buildDashboard(department = "All", period = 30) {
  const selectedUsers = filteredUsers(department);
  const policiesAssigned = selectedUsers.reduce((sum, user) => sum + user.policiesAssigned, 0);
  const policiesAcknowledged = selectedUsers.reduce((sum, user) => sum + user.policiesAcknowledged, 0);
  const trainingAssigned = selectedUsers.reduce((sum, user) => sum + user.trainingAssigned, 0);
  const trainingCompleted = selectedUsers.reduce((sum, user) => sum + user.trainingCompleted, 0);
  const quizzesPassed = selectedUsers.filter((user) => user.quizScore >= 70).length;
  const policyRate = percent(policiesAcknowledged, policiesAssigned);
  const trainingRate = percent(trainingCompleted, trainingAssigned);
  const quizPassRate = percent(quizzesPassed, selectedUsers.length);
  const overallRate = Math.round((policyRate + trainingRate + quizPassRate) / 3);
  const selectedIds = new Set(selectedUsers.map((user) => user.id));
  const selectedOverdue = overdueItems
    .filter((item) => selectedIds.has(item.userId))
    .map((item) => ({
      ...item,
      user: users.find((user) => user.id === item.userId),
      daysOverdue: Math.max(1, Math.ceil((Date.now() - new Date(`${item.dueDate}T23:59:59Z`).getTime()) / 86400000))
    }));

  const departments = [...new Set(selectedUsers.map((user) => user.department))].map((name) => {
    const members = selectedUsers.filter((user) => user.department === name);
    const assignedPolicies = members.reduce((sum, user) => sum + user.policiesAssigned, 0);
    const acknowledgedPolicies = members.reduce((sum, user) => sum + user.policiesAcknowledged, 0);
    const assignedTraining = members.reduce((sum, user) => sum + user.trainingAssigned, 0);
    const completedTraining = members.reduce((sum, user) => sum + user.trainingCompleted, 0);
    const departmentPolicyRate = percent(acknowledgedPolicies, assignedPolicies);
    const departmentTrainingRate = percent(completedTraining, assignedTraining);
    const departmentQuizRate = percent(members.filter((user) => user.quizScore >= 70).length, members.length);
    return {
      name,
      employees: members.length,
      policyRate: departmentPolicyRate,
      trainingRate: departmentTrainingRate,
      overallRate: Math.round((departmentPolicyRate + departmentTrainingRate + departmentQuizRate) / 3)
    };
  });

  const risks = { low: 0, medium: 0, high: 0 };
  selectedUsers.forEach((user) => { risks[riskFor(user)] += 1; });
  const periodValues = trendByPeriod[period] || trendByPeriod[30];
  const trend = periodValues.map((value, index) => ({
    label: `W${index + 1}`,
    value: department === "All" ? value : Math.max(45, Math.min(99, value + overallRate - periodValues.at(-1)))
  }));

  return {
    filters: { department, period, departments: ["All", ...new Set(users.map((user) => user.department))] },
    summary: {
      overallRate,
      policyRate,
      trainingRate,
      quizPassRate,
      overdueCount: selectedOverdue.length,
      highRiskCount: risks.high,
      employees: selectedUsers.length,
      unreadNotifications: notifications.filter((notification) => !notification.read).length
    },
    trend,
    departments,
    risks,
    overdue: selectedOverdue,
    activity: auditEvents.slice(0, 6),
    lastUpdated: new Date().toISOString()
  };
}

function reportRows(type, department = "All") {
  const selectedUsers = filteredUsers(department);
  if (type === "executive") {
    return buildDashboard(department).departments.map((item) => ({
      department: item.name,
      employees: item.employees,
      policyCompliance: `${item.policyRate}%`,
      trainingCompletion: `${item.trainingRate}%`,
      overallCompliance: `${item.overallRate}%`
    }));
  }
  if (type === "policy") {
    return selectedUsers.map((user) => ({
      employee: user.name,
      department: user.department,
      assigned: user.policiesAssigned,
      acknowledged: user.policiesAcknowledged,
      compliance: `${percent(user.policiesAcknowledged, user.policiesAssigned)}%`,
      status: user.policiesAcknowledged === user.policiesAssigned ? "Compliant" : "Action required"
    }));
  }
  if (type === "training") {
    return selectedUsers.map((user) => ({
      employee: user.name,
      department: user.department,
      assigned: user.trainingAssigned,
      completed: user.trainingCompleted,
      quizScore: `${user.quizScore}%`,
      status: user.trainingCompleted === user.trainingAssigned && user.quizScore >= 70 ? "Completed" : "Action required"
    }));
  }
  return selectedUsers.map((user) => ({
    employee: user.name,
    department: user.department,
    role: user.role,
    policyRate: `${percent(user.policiesAcknowledged, user.policiesAssigned)}%`,
    trainingRate: `${percent(user.trainingCompleted, user.trainingAssigned)}%`,
    quizScore: `${user.quizScore}%`,
    risk: riskFor(user)
  }));
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  if (!rows.length) return "No data\n";
  const headers = Object.keys(rows[0]);
  return [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

function policyById(id) {
  return policies.find((policy) => policy.id === Number(id));
}

function policyMatches(user, assignment) {
  if (assignment.targetType === "department") return user.department === assignment.targetValue;
  if (assignment.targetType === "role") return user.role === assignment.targetValue;
  return user.username === assignment.targetValue;
}

function acknowledgementFor(userId, policy) {
  return acknowledgements.find((ack) => ack.userId === userId && ack.policyId === policy.id && ack.policyVersion === policy.version);
}

function policyStats(policy) {
  return {
    ...policy,
    assignmentCount: policyAssignments.filter((assignment) => assignment.policyId === policy.id).length,
    acknowledgementCount: acknowledgements.filter((ack) => ack.policyId === policy.id && ack.policyVersion === policy.version).length
  };
}

function policyComplianceRows() {
  return policyAssignments.flatMap((assignment) => users
    .filter((user) => policyMatches(user, assignment))
    .map((user) => {
      const policy = policyById(assignment.policyId);
      const acknowledgement = acknowledgementFor(user.id, policy);
      const overdue = assignment.dueDate && new Date(`${assignment.dueDate}T23:59:59Z`) < new Date();
      return {
        assignmentId: assignment.id,
        employee: user.name,
        department: user.department,
        role: user.role,
        policy: policy.title,
        version: policy.version,
        category: policy.category,
        dueDate: assignment.dueDate,
        status: acknowledgement ? "complete" : overdue ? "overdue" : "pending",
        acknowledgedAt: acknowledgement?.acknowledgedAt ?? null
      };
    }));
}

function assignedPoliciesFor(user) {
  return policyAssignments
    .filter((assignment) => policyMatches(user, assignment))
    .map((assignment) => {
      const policy = policyById(assignment.policyId);
      return { ...assignment, policy: policyStats(policy), acknowledgement: acknowledgementFor(user.id, policy) || null };
    });
}

function policyOverview() {
  const rows = policyComplianceRows();
  const complete = rows.filter((row) => row.status === "complete").length;
  return {
    summary: {
      policies: policies.length,
      publishedPolicies: policies.filter((policy) => policy.status === "published").length,
      assignments: policyAssignments.length,
      acknowledgements: acknowledgements.length,
      complianceRate: percent(complete, rows.length),
      overdue: rows.filter((row) => row.status === "overdue").length
    },
    policies: policies.map(policyStats),
    assignments: policyAssignments.map((assignment) => ({ ...assignment, policy: policyById(assignment.policyId) })),
    complianceRows: rows,
    acknowledgements: acknowledgements.map((ack) => ({ ...ack, user: users.find((user) => user.id === ack.userId), policy: policyById(ack.policyId) })),
    employee: users.find((user) => user.username === "isuru.contractor"),
    researchBasis: [
      { source: "NIST SP 800-12", use: "Uses signed acknowledgement as evidence that personnel read and understood current requirements." },
      { source: "NIST CSF 2.0 GV.PO", use: "Keeps policy governance visible through ownership, publication state and review evidence." },
      { source: "ISO/IEC 27002 policy practice", use: "Separates draft, published and archived policy states with controlled assignment." },
      { source: "OWASP ASVS", use: "Performs acknowledgement eligibility and version checks on the server." }
    ]
  };
}

function publicLearningModule(module) {
  return {
    ...module,
    quiz: {
      passMark: module.quiz.passMark,
      questionCount: module.quiz.questions.length,
      questions: module.quiz.questions.map((question, questionIndex) => ({
        id: `${module.id}-${questionIndex + 1}`,
        prompt: question.prompt,
        options: question.options.map((text, optionIndex) => ({ id: optionIndex, text }))
      }))
    }
  };
}

function bestQuizAttempt(userId, moduleId) {
  const attempts = quizAttempts.filter((attempt) => attempt.userId === userId && attempt.moduleId === moduleId);
  return attempts.find((attempt) => attempt.status === "passed") || attempts.at(-1) || null;
}

function learningRows() {
  return users.flatMap((user) => learningModules.map((module) => {
    const attempt = bestQuizAttempt(user.id, module.id);
    return {
      employee: user.name,
      department: user.department,
      module: module.title,
      score: attempt ? `${attempt.score}%` : "-",
      status: attempt?.status === "passed" ? "complete" : attempt ? "action required" : "not started",
      submittedAt: attempt?.submittedAt ?? null
    };
  }));
}

function learningOverview() {
  const rows = learningRows();
  const passed = rows.filter((row) => row.status === "complete").length;
  const scoredAttempts = quizAttempts.length;
  return {
    summary: {
      modules: learningModules.length,
      quizAttempts: scoredAttempts,
      completionRate: percent(passed, rows.length),
      passRate: percent(quizAttempts.filter((attempt) => attempt.status === "passed").length, scoredAttempts),
      averageScore: scoredAttempts ? Math.round(quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / scoredAttempts) : 0
    },
    modules: learningModules.map(publicLearningModule),
    rows,
    attempts: quizAttempts.map((attempt) => ({
      ...attempt,
      user: users.find((user) => user.id === attempt.userId),
      module: learningModules.find((module) => module.id === attempt.moduleId)
    })),
    researchBasis: [
      { source: "NIST SP 800-50 Rev. 1", use: "Role-based learning, program measurement and continuous improvement." },
      { source: "NIST CSF 2.0 PR.AT", use: "Personnel receive awareness training aligned to security responsibilities." },
      { source: "NISTIR 8420", use: "Completion rates, assessment scores and behaviour indicators support awareness measurement." },
      { source: "CISA Secure Our World", use: "Practical topics include phishing reporting, strong passwords, password managers and MFA." }
    ]
  };
}

function contentType(filePath) {
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function securityHeaders(contentTypeValue) {
  return {
    "content-type": contentTypeValue,
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()"
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, securityHeaders("application/json; charset=utf-8"));
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error("Request body is too large");
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function serveFile(response, requestPath) {
  const safeRequestPath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const resolved = path.resolve(publicDir, safeRequestPath);
  const relative = path.relative(publicDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    response.writeHead(404, securityHeaders("text/plain; charset=utf-8"));
    response.end("Not found");
    return;
  }
  const filePath = fs.existsSync(resolved) && fs.statSync(resolved).isFile() ? resolved : path.join(publicDir, "index.html");
  response.writeHead(200, securityHeaders(contentType(filePath)));
  fs.createReadStream(filePath).pipe(response);
}

async function handleApi(request, response, url) {
  const { pathname, searchParams } = url;

  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/compliance/dashboard") {
    sendJson(response, 200, buildDashboard(searchParams.get("department") || "All", Number(searchParams.get("period") || 30)));
    return true;
  }
  if (request.method === "GET" && pathname === "/api/policy/overview") {
    sendJson(response, 200, policyOverview());
    return true;
  }
  if (request.method === "GET" && pathname === "/api/learning/overview") {
    sendJson(response, 200, learningOverview());
    return true;
  }
  const learningSubmitMatch = pathname.match(/^\/api\/learning\/modules\/(\d+)\/submit$/);
  if (request.method === "POST" && learningSubmitMatch) {
    const module = learningModules.find((item) => item.id === Number(learningSubmitMatch[1]));
    if (!module) {
      sendJson(response, 404, { message: "Training module not found." });
      return true;
    }
    const body = await readJson(request);
    const user = users.find((entry) => entry.id === Number(body.userId)) || users.find((entry) => entry.username === body.username) || users[0];
    const answers = Array.isArray(body.answers) ? body.answers.map(Number) : [];
    const correct = module.quiz.questions.filter((question, index) => question.answerIndex === answers[index]).length;
    const score = Math.round((correct / module.quiz.questions.length) * 100);
    const attempt = {
      id: nextQuizAttemptId++,
      moduleId: module.id,
      userId: user.id,
      score,
      status: score >= module.quiz.passMark ? "passed" : "failed",
      submittedAt: new Date().toISOString()
    };
    quizAttempts.push(attempt);
    auditEvents.unshift({ id: Math.max(0, ...auditEvents.map((event) => event.id)) + 1, actor: user.username, action: "QUIZ_SUBMITTED", target: `${module.title} - ${score}%`, createdAt: attempt.submittedAt });
    sendJson(response, 201, { attempt });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/policy/policies") {
    const status = searchParams.get("status");
    const rows = status ? policies.filter((policy) => policy.status === status) : policies;
    sendJson(response, 200, { policies: rows.map(policyStats) });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/policy/policies") {
    const body = await readJson(request);
    if (!body.title || !body.content) {
      sendJson(response, 400, { message: "Title and content are required." });
      return true;
    }
    const policy = {
      id: nextPolicyId++,
      title: String(body.title).trim(),
      category: String(body.category || "Information Security").trim(),
      version: String(body.version || "1.0").trim(),
      owner: String(body.owner || "Information Security").trim(),
      status: body.status === "published" ? "published" : "draft",
      effectiveDate: String(body.effectiveDate || ""),
      summary: String(body.summary || "").trim(),
      content: String(body.content).trim()
    };
    policies.push(policy);
    auditEvents.unshift({ id: Math.max(0, ...auditEvents.map((event) => event.id)) + 1, actor: "policy.admin", action: "POLICY_CREATED", target: `${policy.title} v${policy.version}`, createdAt: new Date().toISOString() });
    sendJson(response, 201, { policy: policyStats(policy) });
    return true;
  }
  const policyActionMatch = pathname.match(/^\/api\/policy\/policies\/(\d+)\/(publish|archive)$/);
  if (request.method === "POST" && policyActionMatch) {
    const policy = policyById(policyActionMatch[1]);
    if (!policy) {
      sendJson(response, 404, { message: "Policy not found." });
      return true;
    }
    policy.status = policyActionMatch[2] === "publish" ? "published" : "archived";
    if (policy.status === "published" && !policy.effectiveDate) policy.effectiveDate = new Date().toISOString().slice(0, 10);
    auditEvents.unshift({ id: Math.max(0, ...auditEvents.map((event) => event.id)) + 1, actor: "policy.admin", action: `POLICY_${policy.status.toUpperCase()}`, target: `${policy.title} v${policy.version}`, createdAt: new Date().toISOString() });
    sendJson(response, 200, { policy: policyStats(policy) });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/policy/assignments") {
    const body = await readJson(request);
    if (!policyById(body.policyId)) {
      sendJson(response, 400, { message: "Valid policy is required." });
      return true;
    }
    const assignment = {
      id: nextPolicyAssignmentId++,
      policyId: Number(body.policyId),
      targetType: ["department", "role", "user"].includes(body.targetType) ? body.targetType : "department",
      targetValue: String(body.targetValue || "Consulting").trim(),
      dueDate: String(body.dueDate || daysFromNow(14)),
      status: "assigned"
    };
    policyAssignments.push(assignment);
    auditEvents.unshift({ id: Math.max(0, ...auditEvents.map((event) => event.id)) + 1, actor: "policy.admin", action: "POLICY_ASSIGNED", target: `${assignment.targetType}:${assignment.targetValue}`, createdAt: new Date().toISOString() });
    sendJson(response, 201, { assignment: { ...assignment, policy: policyById(assignment.policyId) } });
    return true;
  }
  const acknowledgeMatch = pathname.match(/^\/api\/policy\/policies\/(\d+)\/acknowledge$/);
  if (request.method === "POST" && acknowledgeMatch) {
    const policy = policyById(acknowledgeMatch[1]);
    if (!policy || policy.status !== "published") {
      sendJson(response, 400, { message: "Only published policies can be acknowledged." });
      return true;
    }
    const body = await readJson(request);
    const user = users.find((entry) => entry.id === Number(body.userId)) || users.find((entry) => entry.username === body.username) || users[0];
    if (!assignedPoliciesFor(user).some((entry) => entry.policy.id === policy.id)) {
      sendJson(response, 403, { message: "Policy is not assigned to this user." });
      return true;
    }
    const existing = acknowledgementFor(user.id, policy);
    if (existing) {
      sendJson(response, 200, { acknowledgement: existing });
      return true;
    }
    const acknowledgement = {
      id: nextAcknowledgementId++,
      policyId: policy.id,
      policyVersion: policy.version,
      userId: user.id,
      statement: String(body.statement || "I have read and understood this policy."),
      acknowledgedAt: new Date().toISOString()
    };
    acknowledgements.push(acknowledgement);
    auditEvents.unshift({ id: Math.max(0, ...auditEvents.map((event) => event.id)) + 1, actor: user.username, action: "POLICY_ACKNOWLEDGED", target: `${policy.title} v${policy.version}`, createdAt: acknowledgement.acknowledgedAt });
    sendJson(response, 201, { acknowledgement });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/reports") {
    const type = searchParams.get("type") || "executive";
    const department = searchParams.get("department") || "All";
    const titles = { executive: "Executive Compliance Summary", policy: "Policy Acknowledgement Report", training: "Training and Quiz Report", risk: "Employee Risk Review" };
    sendJson(response, 200, { title: titles[type] || titles.executive, type, department, generatedAt: new Date().toISOString(), rows: reportRows(type, department) });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/reports/export") {
    const type = searchParams.get("type") || "executive";
    const department = searchParams.get("department") || "All";
    response.writeHead(200, { ...securityHeaders("text/csv; charset=utf-8"), "content-disposition": `attachment; filename="secureaware-${type}-report.csv"` });
    response.end(toCsv(reportRows(type, department)));
    return true;
  }
  if (request.method === "GET" && pathname === "/api/notifications") {
    sendJson(response, 200, { notifications: notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), unreadCount: notifications.filter((notification) => !notification.read).length, settings: notificationSettings });
    return true;
  }
  if (request.method === "POST" && /^\/api\/notifications\/\d+\/read$/.test(pathname)) {
    const notification = notifications.find((item) => item.id === Number(pathname.split("/")[3]));
    if (!notification) {
      sendJson(response, 404, { message: "Notification not found" });
      return true;
    }
    notification.read = true;
    sendJson(response, 200, { notification });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/notifications/read-all") {
    notifications.forEach((notification) => { notification.read = true; });
    sendJson(response, 200, { ok: true });
    return true;
  }
  if (request.method === "PATCH" && pathname === "/api/notification-settings") {
    const body = await readJson(request);
    for (const key of Object.keys(notificationSettings)) if (typeof body[key] === "boolean") notificationSettings[key] = body[key];
    sendJson(response, 200, { settings: notificationSettings });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/reminders") {
    const body = await readJson(request);
    const item = overdueItems.find((entry) => entry.id === Number(body.itemId));
    if (!item) {
      sendJson(response, 404, { message: "Compliance item not found" });
      return true;
    }
    const user = users.find((entry) => entry.id === item.userId);
    item.reminderSent = true;
    const notification = { id: Math.max(0, ...notifications.map((entry) => entry.id)) + 1, type: "reminder", title: "Reminder sent", message: `${item.title} reminder sent to ${user.name}.`, createdAt: new Date().toISOString(), read: false };
    notifications = [notification, ...notifications];
    auditEvents.unshift({ id: Math.max(0, ...auditEvents.map((event) => event.id)) + 1, actor: "compliance.admin", action: "REMINDER_SENT", target: `${item.title} - ${user.name}`, createdAt: new Date().toISOString() });
    sendJson(response, 201, { notification, item });
    return true;
  }
  if (pathname.startsWith("/api/")) {
    sendJson(response, 404, { message: "API endpoint not found" });
    return true;
  }
  return false;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  try {
    if (await handleApi(request, response, url)) return;
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, securityHeaders("text/plain; charset=utf-8"));
      response.end("Method not allowed");
      return;
    }
    serveFile(response, url.pathname);
  } catch (error) {
    sendJson(response, 400, { message: error.message || "Request failed" });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, "127.0.0.1", () => console.log(`SecureAware running at http://127.0.0.1:${port}`));
}

export default server;
