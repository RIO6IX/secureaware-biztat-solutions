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
