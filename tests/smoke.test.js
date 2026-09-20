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
