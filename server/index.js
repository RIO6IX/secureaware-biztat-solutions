import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const dataDir = path.join(root, "data");
const dbPath = process.env.SECUREAWARE_DB || path.join(dataDir, "secureaware.sqlite");
const port = Number(process.env.PORT || 4000);
const sessionIdleMs = Number(process.env.SESSION_IDLE_MINUTES || 30) * 60 * 1000;
const bodyLimitBytes = 1_000_000;

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Employee','Department Manager','Security/HR Admin','System Admin')),
  department TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  ip_address TEXT,
  created_at TEXT NOT NULL
);
`);

seedFoundation();

const statements = {
  userByUsername: db.prepare("SELECT * FROM users WHERE username = ? AND active = 1"),
  userById: db.prepare("SELECT * FROM users WHERE id = ? AND active = 1"),
  sessionById: db.prepare("SELECT * FROM sessions WHERE id = ?"),
  insertSession: db.prepare("INSERT INTO sessions (id,user_id,csrf_token,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?,?)"),
  refreshSession: db.prepare("UPDATE sessions SET expires_at = ?, last_seen_at = ? WHERE id = ?"),
  deleteSession: db.prepare("DELETE FROM sessions WHERE id = ?"),
  audit: db.prepare("INSERT INTO audit_events (actor_user_id,action,target,ip_address,created_at) VALUES (?,?,?,?,?)")
};

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);
    sendJson(response, error.status || 500, { message: error.publicMessage || "Server error" });
  });
});

async function handleRequest(request, response) {
  applySecurityHeaders(response);
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  if (url.pathname === "/api/health") return sendJson(response, 200, { ok: true });
  if (request.method === "POST" && url.pathname === "/api/auth/login") return login(request, response);
  if (request.method === "POST" && url.pathname === "/api/auth/logout") return logout(request, response);
  if (url.pathname.startsWith("/api/")) return api(request, response, url);
  return serveStatic(response, url.pathname);
}

async function api(request, response, url) {
  const context = requireSession(request, response);
  if (!context) return sendJson(response, 401, { message: "Authentication required" });
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.headers["x-csrf-token"] !== context.session.csrf_token) {
    audit(context.user.id, "CSRF_REJECTED", url.pathname, request);
    return sendJson(response, 403, { message: "Request verification failed" });
  }
  if (request.method === "GET" && url.pathname === "/api/me") {
    return sendJson(response, 200, { user: publicUser(context.user), csrfToken: context.session.csrf_token });
  }
  if (request.method === "GET" && url.pathname === "/api/foundation/audit") {
    if (!hasRole(context.user, ["Security/HR Admin", "System Admin"])) return sendJson(response, 403, { message: "Access denied" });
    return sendJson(response, 200, { auditEvents: auditRows() });
  }
  if (request.method === "GET" && url.pathname === "/api/foundation/audit.csv") {
    if (!hasRole(context.user, ["Security/HR Admin", "System Admin"])) return sendJson(response, 403, { message: "Access denied" });
    return sendCsv(response, auditRows());
  }
  return sendJson(response, 404, { message: "Not found" });
}

async function login(request, response) {
  const body = await readJson(request);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const user = statements.userByUsername.get(username);
  if (!user || isLocked(user) || !verifyPassword(password, user.password_salt, user.password_hash)) {
    if (user) registerFailedLogin(user);
    audit(user?.id ?? null, "LOGIN_FAILED", username || "unknown", request);
    return sendJson(response, 401, { message: "Invalid username or password" });
  }
  db.prepare("UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?").run(user.id);
  const now = new Date();
  const sessionId = token();
  const csrfToken = token();
  const expiresAt = new Date(now.getTime() + sessionIdleMs).toISOString();
  statements.insertSession.run(sessionId, user.id, csrfToken, expiresAt, now.toISOString(), now.toISOString());
  audit(user.id, "LOGIN_SUCCESS", user.username, request);
  response.setHeader("Set-Cookie", cookie("secureaware_session", sessionId, { httpOnly: true, sameSite: "Strict", maxAge: Math.floor(sessionIdleMs / 1000) }));
  return sendJson(response, 200, { user: publicUser(user), csrfToken });
}

function logout(request, response) {
  const sessionId = parseCookies(request).secureaware_session;
  const context = sessionId ? sessionContext(sessionId) : null;
  if (context && request.headers["x-csrf-token"] !== context.session.csrf_token) {
    audit(context.user.id, "CSRF_REJECTED", "/api/auth/logout", request);
    return sendJson(response, 403, { message: "Request verification failed" });
  }
  if (sessionId) statements.deleteSession.run(sessionId);
  if (context) audit(context.user.id, "LOGOUT", context.user.username, request);
  response.setHeader("Set-Cookie", cookie("secureaware_session", "", { httpOnly: true, sameSite: "Strict", maxAge: 0 }));
  return sendJson(response, 200, { ok: true });
}

function requireSession(request) {
  const sessionId = parseCookies(request).secureaware_session;
  if (!sessionId) return null;
  const context = sessionContext(sessionId);
  if (!context) return null;
  if (new Date(context.session.expires_at) <= new Date()) {
    statements.deleteSession.run(sessionId);
    return null;
  }
  const now = new Date();
  statements.refreshSession.run(new Date(now.getTime() + sessionIdleMs).toISOString(), now.toISOString(), sessionId);
  return context;
}

function sessionContext(sessionId) {
  const session = statements.sessionById.get(sessionId);
  if (!session) return null;
  const user = statements.userById.get(session.user_id);
  return user ? { user, session } : null;
}

function registerFailedLogin(user) {
  const count = user.failed_login_count + 1;
  const lockedUntil = count >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
  db.prepare("UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?").run(count, lockedUntil, user.id);
}

function isLocked(user) {
  return user.locked_until && new Date(user.locked_until) > new Date();
}

function hasRole(user, roles) {
  return roles.includes(user.role);
}

function audit(userId, action, target, request = null) {
  statements.audit.run(userId, action, String(target).slice(0, 240), request?.socket?.remoteAddress || null, new Date().toISOString());
}

function auditRows() {
  return db.prepare(`SELECT ae.id, ae.action, ae.target, ae.ip_address, ae.created_at, u.username, u.display_name
    FROM audit_events ae LEFT JOIN users u ON u.id = ae.actor_user_id
    ORDER BY ae.id DESC LIMIT 200`).all();
}

function seedFoundation() {
  if (db.prepare("SELECT COUNT(*) AS count FROM users").get().count) return;
  const now = new Date().toISOString();
  for (const user of [
    ["employee.demo", "Employee Demo", "Employee", "Finance", "EmployeePass!2026"],
    ["manager.demo", "Manager Demo", "Department Manager", "Finance", "ManagerPass!2026"],
    ["security.admin", "Security HR Admin", "Security/HR Admin", "Information Security", "AdminPass!2026"],
    ["system.admin", "System Admin", "System Admin", "IT", "SystemPass!2026"]
  ]) {
    const [username, name, role, department, password] = user;
    const hashed = hashPassword(password);
    db.prepare("INSERT INTO users (username,display_name,role,department,password_salt,password_hash,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(username, name, role, department, hashed.salt, hashed.hash, now);
  }
  db.prepare("INSERT INTO audit_events (action,target,created_at) VALUES (?,?,?)").run("SYSTEM_INITIALIZED", "SecureAware foundation seed", now);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}

function verifyPassword(password, salt, expectedHash) {
  const actual = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(actual, Buffer.from(expectedHash, "hex"));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > bodyLimitBytes) throw publicError(413, "Request body is too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw publicError(400, "Malformed JSON");
  }
}

function publicUser(user) {
  return { id: user.id, username: user.username, displayName: user.display_name, role: user.role, department: user.department };
}

function serveStatic(response, requestPath) {
  const resolved = path.normalize(path.join(publicDir, requestPath === "/" ? "index.html" : requestPath));
  const filePath = resolved.startsWith(publicDir) && fs.existsSync(resolved) && fs.statSync(resolved).isFile() ? resolved : path.join(publicDir, "index.html");
  response.writeHead(200, { "content-type": contentType(filePath) });
  fs.createReadStream(filePath).pipe(response);
}

function contentType(filePath) {
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

function sendCsv(response, rows) {
  const fields = ["id", "created_at", "username", "action", "target", "ip_address"];
  const csv = [fields.join(","), ...rows.map((row) => fields.map((field) => `"${String(row[field] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  response.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=audit.csv" });
  response.end(csv);
}

function applySecurityHeaders(response) {
  response.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("x-frame-options", "DENY");
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((pair) => {
    const index = pair.indexOf("=");
    return [decodeURIComponent(pair.slice(0, index).trim()), decodeURIComponent(pair.slice(index + 1).trim())];
  }));
}

function cookie(name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, "Path=/"];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function token() {
  return crypto.randomBytes(32).toString("base64url");
}

function publicError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.publicMessage = message;
  return error;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, "127.0.0.1", () => {
    console.log(`SecureAware running at http://127.0.0.1:${port}`);
  });
}

export default server;
