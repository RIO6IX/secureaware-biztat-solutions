// Administrative user lifecycle management. Security/HR administrators manage employees
// and department managers; only System Administrators can manage privileged accounts.

export const prefix = "/api/users";

const ADMIN_ROLES = ["Security/HR Admin", "System Admin"];
const ROLES = ["Employee", "Department Manager", ...ADMIN_ROLES];
const HR_MANAGED_ROLES = ["Employee", "Department Manager"];
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,39}$/;
const DEPARTMENT = /^[\p{L}\p{N}][\p{L}\p{N} .&/'()-]{0,59}$/u;

let foundation;

export function init(shared) {
  foundation = shared;
}

function send(response, status, body) {
  return foundation.sendJson(response, status, body);
}

function isSystemAdmin(user) {
  return user.role === "System Admin";
}

function canManage(actor, targetRole) {
  return isSystemAdmin(actor) || HR_MANAGED_ROLES.includes(targetRole);
}

function publicAdminUser(row, actor) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    department: row.department,
    active: Boolean(row.active),
    failedLoginCount: row.failed_login_count,
    lockedUntil: row.locked_until,
    createdAt: row.created_at,
    canManage: canManage(actor, row.role) && row.id !== actor.id
  };
}

function cleanText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validateProfile(body, actor, current = null) {
  const displayName = cleanText(body.displayName);
  const role = cleanText(body.role);
  const department = cleanText(body.department);
  if (displayName.length < 2 || displayName.length > 80) return { error: "Display name must be between 2 and 80 characters" };
  if (!ROLES.includes(role)) return { error: "Select a valid role" };
  if (!DEPARTMENT.test(department)) return { error: "Department must be between 1 and 60 characters and contain only standard name characters" };
  if (!canManage(actor, role)) return { forbidden: "Only a System Administrator can assign an administrator role" };
  if (current && !canManage(actor, current.role)) return { forbidden: "Only a System Administrator can manage this account" };
  return { displayName, role, department };
}

function target(id) {
  return foundation.db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

function activeSystemAdminCount() {
  return foundation.db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'System Admin' AND active = 1").get().count;
}

function protectSystemAccess(actor, current, nextRole = current.role, nextActive = Boolean(current.active)) {
  if (current.id === actor.id && (nextRole !== current.role || !nextActive)) return "You cannot change your own role or deactivate your own account";
  if (current.role === "System Admin" && current.active && (nextRole !== "System Admin" || !nextActive) && activeSystemAdminCount() <= 1) {
    return "At least one active System Administrator must remain";
  }
  return null;
}

function revokeSessions(userId) {
  foundation.db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

function audit(actor, action, targetName, request) {
  foundation.audit(actor.id, action, targetName, request);
}

function directory(actor, url) {
  const search = cleanText(url.searchParams.get("search")).slice(0, 80).toLowerCase();
  const role = url.searchParams.get("role") || "All";
  const department = cleanText(url.searchParams.get("department"));
  const status = url.searchParams.get("status") || "all";
  let users = foundation.db.prepare("SELECT * FROM users ORDER BY active DESC, display_name COLLATE NOCASE, username COLLATE NOCASE").all();
  if (search) users = users.filter((user) => [user.display_name, user.username, user.department, user.role].some((value) => value.toLowerCase().includes(search)));
  if (role !== "All") users = ROLES.includes(role) ? users.filter((user) => user.role === role) : [];
  if (department) users = users.filter((user) => user.department === department);
  if (status === "active") users = users.filter((user) => user.active);
  if (status === "inactive") users = users.filter((user) => !user.active);
  const all = foundation.db.prepare("SELECT role, department, active FROM users").all();
  return {
    currentUserId: actor.id,
    users: users.map((user) => publicAdminUser(user, actor)),
    summary: {
      total: all.length,
      active: all.filter((user) => user.active).length,
      inactive: all.filter((user) => !user.active).length,
      administrators: all.filter((user) => ADMIN_ROLES.includes(user.role) && user.active).length
    },
    filters: {
      roles: ["All", ...ROLES],
      departments: [...new Set(all.map((user) => user.department))].sort((a, b) => a.localeCompare(b))
    },
    permissions: {
      assignableRoles: isSystemAdmin(actor) ? ROLES : HR_MANAGED_ROLES,
      canManageAdministratorAccounts: isSystemAdmin(actor)
    }
  };
}

async function createUser(request, response, actor) {
  const body = await foundation.readJson(request, 8192);
  const username = cleanText(body.username).toLowerCase();
  if (!USERNAME.test(username)) return send(response, 400, { message: "Username must be 3–40 lowercase characters using letters, numbers, dots, hyphens or underscores" });
  if (foundation.db.prepare("SELECT 1 FROM users WHERE username = ?").get(username)) return send(response, 409, { message: "That username is already in use" });
  const profile = validateProfile(body, actor);
  if (profile.error) return send(response, 400, { message: profile.error });
  if (profile.forbidden) return send(response, 403, { message: profile.forbidden });
  const temporaryPassword = typeof body.temporaryPassword === "string" ? body.temporaryPassword : "";
  const passwordProblem = foundation.validatePasswordPolicy(temporaryPassword, { username });
  if (passwordProblem) return send(response, 400, { message: passwordProblem });
  const hashed = foundation.hashPassword(temporaryPassword.normalize("NFKC"));
  const now = new Date().toISOString();
  const result = foundation.db.prepare(`INSERT INTO users
    (username, display_name, role, department, password_salt, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(username, profile.displayName, profile.role, profile.department, hashed.salt, hashed.hash, now);
  audit(actor, "USER_CREATED", `${username} (${profile.role})`, request);
  const created = target(Number(result.lastInsertRowid));
  return send(response, 201, { user: publicAdminUser(created, actor) });
}

async function updateUser(request, response, actor, current) {
  const body = await foundation.readJson(request, 8192);
  const profile = validateProfile(body, actor, current);
  if (profile.error) return send(response, 400, { message: profile.error });
  if (profile.forbidden) return send(response, 403, { message: profile.forbidden });
  const protectedMessage = protectSystemAccess(actor, current, profile.role, Boolean(current.active));
  if (protectedMessage) return send(response, 400, { message: protectedMessage });
  const accessChanged = current.role !== profile.role || current.department !== profile.department;
  foundation.db.prepare("UPDATE users SET display_name = ?, role = ?, department = ? WHERE id = ?")
    .run(profile.displayName, profile.role, profile.department, current.id);
  if (accessChanged) revokeSessions(current.id);
  audit(actor, "USER_UPDATED", `${current.username}: ${current.role} -> ${profile.role}, ${current.department} -> ${profile.department}`, request);
  return send(response, 200, { user: publicAdminUser(target(current.id), actor), sessionsRevoked: accessChanged });
}

async function setStatus(request, response, actor, current) {
  if (!canManage(actor, current.role)) return send(response, 403, { message: "Only a System Administrator can manage this account" });
  const body = await foundation.readJson(request, 2048);
  if (typeof body.active !== "boolean") return send(response, 400, { message: "active must be true or false" });
  const protectedMessage = protectSystemAccess(actor, current, current.role, body.active);
  if (protectedMessage) return send(response, 400, { message: protectedMessage });
  foundation.db.prepare("UPDATE users SET active = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?").run(body.active ? 1 : 0, current.id);
  revokeSessions(current.id);
  audit(actor, body.active ? "USER_ACTIVATED" : "USER_DEACTIVATED", current.username, request);
  return send(response, 200, { user: publicAdminUser(target(current.id), actor) });
}

async function resetPassword(request, response, actor, current) {
  if (!canManage(actor, current.role)) return send(response, 403, { message: "Only a System Administrator can manage this account" });
  if (current.id === actor.id) return send(response, 400, { message: "Use My settings to change your own password" });
  const body = await foundation.readJson(request, 4096);
  const temporaryPassword = typeof body.temporaryPassword === "string" ? body.temporaryPassword : "";
  const problem = foundation.validatePasswordPolicy(temporaryPassword, current);
  if (problem) return send(response, 400, { message: problem });
  const hashed = foundation.hashPassword(temporaryPassword.normalize("NFKC"));
  foundation.db.prepare("UPDATE users SET password_salt = ?, password_hash = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?")
    .run(hashed.salt, hashed.hash, current.id);
  revokeSessions(current.id);
  audit(actor, "USER_PASSWORD_RESET", current.username, request);
  return send(response, 200, { ok: true });
}

export async function handle(request, response, url, context) {
  const actor = context.user;
  if (!foundation.hasRole(actor, ADMIN_ROLES)) {
    audit(actor, "USER_MANAGEMENT_ACCESS_DENIED", `${request.method} ${url.pathname}`, request);
    return send(response, 403, { message: "User management is restricted to Security/HR and System Administrators" });
  }

  const path = url.pathname.slice(prefix.length) || "/";
  if (path === "/" && request.method === "GET") return send(response, 200, directory(actor, url));
  if (path === "/" && request.method === "POST") return createUser(request, response, actor);

  const match = path.match(/^\/(\d{1,10})(?:\/(status|password))?$/);
  if (!match) return send(response, 404, { message: "Not found" });
  const current = target(Number(match[1]));
  if (!current) return send(response, 404, { message: "User not found" });
  if (!match[2] && request.method === "PUT") return updateUser(request, response, actor, current);
  if (match[2] === "status" && request.method === "POST") return setStatus(request, response, actor, current);
  if (match[2] === "password" && request.method === "POST") return resetPassword(request, response, actor, current);
  return send(response, 405, { message: "Method not allowed" });
}
