import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secureaware-users-"));
process.env.SECUREAWARE_DB = path.join(tempDir, "test.sqlite");
const { default: server } = await import("../server/index.js");

async function withServer(run) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function login(base, username, password) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const body = await response.json();
  assert.equal(response.status, 200, body.message);
  return { cookie: response.headers.get("set-cookie").split(";", 1)[0], csrf: body.csrfToken, user: body.user };
}

function request(base, auth, pathname, method = "GET", body) {
  const headers = { cookie: auth.cookie };
  if (method !== "GET") headers["x-csrf-token"] = auth.csrf;
  if (body !== undefined) headers["content-type"] = "application/json";
  return fetch(`${base}${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

test("ordinary employees cannot access user management", async () => {
  await withServer(async (base) => {
    const employee = await login(base, "employee.demo", "EmployeePass!2026");
    assert.equal((await request(base, employee, "/api/users")).status, 403);
  });
});

test("Security/HR Admin manages ordinary accounts but cannot grant administrator roles", async () => {
  await withServer(async (base) => {
    const admin = await login(base, "security.admin", "AdminPass!2026");
    const createdResponse = await request(base, admin, "/api/users", "POST", {
      username: "new.employee",
      displayName: "New Employee",
      role: "Employee",
      department: "Marketing",
      temporaryPassword: "violet paper river lantern"
    });
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).user;

    const forbidden = await request(base, admin, "/api/users", "POST", {
      username: "new.admin",
      displayName: "New Admin",
      role: "Security/HR Admin",
      department: "Information Security",
      temporaryPassword: "copper meadow signal planet"
    });
    assert.equal(forbidden.status, 403);

    const updated = await request(base, admin, `/api/users/${created.id}`, "PUT", {
      displayName: "Marketing Manager",
      role: "Department Manager",
      department: "Marketing"
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).user.role, "Department Manager");

    const userSession = await login(base, "new.employee", "violet paper river lantern");
    const deactivated = await request(base, admin, `/api/users/${created.id}/status`, "POST", { active: false });
    assert.equal(deactivated.status, 200);
    assert.equal((await request(base, userSession, "/api/me")).status, 401);
  });
});

test("System Admin manages privileged accounts and cannot deactivate itself", async () => {
  await withServer(async (base) => {
    const system = await login(base, "system.admin", "SystemPass!2026");
    const createdResponse = await request(base, system, "/api/users", "POST", {
      username: "security.second",
      displayName: "Second Security Admin",
      role: "Security/HR Admin",
      department: "Information Security",
      temporaryPassword: "harbour mango silver compass"
    });
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).user;
    assert.equal(created.role, "Security/HR Admin");

    const selfStatus = await request(base, system, `/api/users/${system.user.id}/status`, "POST", { active: false });
    assert.equal(selfStatus.status, 400);

    const reset = await request(base, system, `/api/users/${created.id}/password`, "POST", { temporaryPassword: "forest window amber notebook" });
    assert.equal(reset.status, 200);
    await login(base, "security.second", "forest window amber notebook");

    const directory = await request(base, system, "/api/users?status=active&role=Security%2FHR%20Admin");
    assert.equal(directory.status, 200);
    const data = await directory.json();
    assert.ok(data.users.some((user) => user.username === "security.second"));
    assert.ok(data.permissions.assignableRoles.includes("System Admin"));
  });
});

test("user changes require CSRF and are written to the audit log", async () => {
  await withServer(async (base) => {
    const system = await login(base, "system.admin", "SystemPass!2026");
    const missingCsrf = await fetch(`${base}/api/users`, {
      method: "POST",
      headers: { cookie: system.cookie, "content-type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(missingCsrf.status, 403);

    const audit = await request(base, system, "/api/foundation/audit");
    const rows = (await audit.json()).auditEvents;
    assert.ok(rows.some((event) => event.action === "USER_CREATED"));
    assert.ok(rows.some((event) => event.action === "USER_PASSWORD_RESET"));
    assert.ok(rows.every((event) => !event.target.includes("forest window amber notebook")));
  });
});
