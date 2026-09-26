import { h, formatDate } from "../core/dom.js";
import { badge } from "../core/ui.js";

export const STATUS = {
  not_started: ["Not started", "neutral"],
  in_progress: ["In progress", "info"],
  passed: ["Passed", "success"],
  failed_retake: ["Failed – retake available", "warning"],
  failed_locked: ["Failed – no attempts left", "danger"],
  overdue: ["Overdue", "danger"]
};

export const ADMIN_ROLES = ["Security/HR Admin", "System Admin"];
export const MANAGER_ROLES = ["Department Manager", ...ADMIN_ROLES];

export function statusBadge(status) {
  const [label, tone] = STATUS[status] || [status, "neutral"];
  return badge(label, tone);
}

export function dueLabel(state) {
  if (!state.dueDate) return null;
  const overdue = state.status === "overdue";
  return h("span", { class: ["due", overdue ? "due-overdue" : ""] }, overdue ? "Was due " : "Due ", formatDate(state.dueDate));
}

export const courseHref = (slug) => `#/training/${encodeURIComponent(slug)}`;
export const lessonHref = (slug, position) => `#/training/${encodeURIComponent(slug)}/lesson/${position}`;
export const quizHref = (slug) => `#/training/${encodeURIComponent(slug)}/quiz`;

// The next step a learner should take on a course, used by cards and the landing page.
export function nextStep(slug, state) {
  if (state.status === "passed" && state.certificateCode) return { label: "View certificate", href: `#/training/certificates/${state.certificateCode}` };
  if (state.inProgressAttemptId) return { label: "Resume quiz", href: quizHref(slug) };
  if (state.allLessonsComplete) return { label: state.attemptsUsed ? "Retake quiz" : "Take the quiz", href: quizHref(slug) };
  const done = new Set(state.completedPositions);
  let position = 1;
  while (done.has(position)) position += 1;
  return { label: done.size ? "Continue training" : "Start training", href: lessonHref(slug, position) };
}

export function minutes(value) {
  return `${value} min`;
}
