import { ADMIN_ROLES } from "./schema.js";

export const MANAGER_ROLES = ["Department Manager", ...ADMIN_ROLES];

export function isAdmin(user) {
  return ADMIN_ROLES.includes(user.role);
}

// Object-level rule used by every endpoint that returns another person's training data:
// admins see everyone, a manager sees only their own department, everyone else only themselves.
export function canViewUser(actor, target) {
  if (!target) return false;
  if (actor.id === target.id) return true;
  if (isAdmin(actor)) return true;
  return actor.role === "Department Manager" && actor.department === target.department;
}

// The department a team view is limited to. Managers are pinned to their own department
// whatever they ask for; admins may filter or see all.
export function teamDepartment(actor, requested) {
  if (actor.role === "Department Manager") return actor.department;
  return requested || null;
}
