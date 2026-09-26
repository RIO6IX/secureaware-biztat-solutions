import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "secureaware-main-"));
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

async function login(base, username = "security.admin", password = "AdminPass!2026") {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  const cookie = response.headers.get("set-cookie").split(";", 1)[0];
  return { body, cookie };
}

test("health endpoint works", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

test("login creates a session and me endpoint returns the user", async () => {
  await withServer(async (base) => {
    const auth = await login(base);
    const me = await fetch(`${base}/api/me`, { headers: { cookie: auth.cookie } });
    assert.equal(me.status, 200);
    const body = await me.json();
    assert.equal(body.user.username, "security.admin");
    assert.ok(body.csrfToken);
  });
});

test("employee cannot read admin audit log", async () => {
  await withServer(async (base) => {
    const auth = await login(base, "employee.demo", "EmployeePass!2026");
    const response = await fetch(`${base}/api/foundation/audit`, { headers: { cookie: auth.cookie } });
    assert.equal(response.status, 403);
  });
});

test("state changing request without csrf is rejected", async () => {
  await withServer(async (base) => {
    const auth = await login(base);
    const response = await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { cookie: auth.cookie } });
    assert.equal(response.status, 403);
  });
});

test("password change follows NIST SP 800-63B-4 length and blocklist rules", async () => {
  await withServer(async (base) => {
    const auth = await login(base, "consultant.demo", "ConsultantPass!2026");
    const change = (currentPassword, newPassword) => fetch(`${base}/api/auth/password`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: auth.cookie, "x-csrf-token": auth.body.csrfToken },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    assert.equal((await change("wrong-current-password", "correct horse battery staple")).status, 400);
    assert.equal((await change("ConsultantPass!2026", "Short!1a")).status, 400);
    assert.equal((await change("ConsultantPass!2026", "password1234567")).status, 400);
    // No composition rules: a long lower-case passphrase is accepted.
    assert.equal((await change("ConsultantPass!2026", "river lantern pepper orbit")).status, 200);
    await login(base, "consultant.demo", "river lantern pepper orbit");
  });
});

test("notifications are scoped to the signed-in user", async () => {
  await withServer(async (base) => {
    const auth = await login(base, "employee.demo", "EmployeePass!2026");
    const response = await fetch(`${base}/api/notifications`, { headers: { cookie: auth.cookie } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.notifications));
    const foreign = await fetch(`${base}/api/notifications/999999/read`, { method: "POST", headers: { cookie: auth.cookie, "x-csrf-token": auth.body.csrfToken } });
    assert.equal(foreign.status, 404);
  });
});

test("oversized request bodies are rejected with 413", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "x".repeat(1_100_000) })
    });
    assert.equal(response.status, 413);
  });
});
