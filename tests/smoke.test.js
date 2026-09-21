import test from "node:test";
import assert from "node:assert/strict";
import server from "../server/index.js";

test("health endpoint works", async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/health`;
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  await new Promise((resolve) => server.close(resolve));
});

test("training dashboard exposes member 3 data", async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const dashboard = await fetch(`${base}/api/dashboard`).then((response) => response.json());
  assert.ok(dashboard.modules >= 3);
  const assigned = await fetch(`${base}/api/employee/assigned-training?username=finance.analyst01`).then((response) => response.json());
  assert.ok(assigned.assignedTraining.length >= 1);
  assert.equal(JSON.stringify(assigned).includes("answerIndex"), false);
  const compliance = await fetch(`${base}/api/compliance/training`).then((response) => response.json());
  assert.ok(compliance.rows.length >= 1);
  await new Promise((resolve) => server.close(resolve));
});
