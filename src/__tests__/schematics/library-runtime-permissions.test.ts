import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockerfile = readFileSync(new URL("../../../Dockerfile", import.meta.url), "utf8");

test("CRM runtime user can read the schematic volume owned by the worker", () => {
  assert.match(dockerfile, /USER node/);
  assert.doesNotMatch(dockerfile, /uid 1001|gid 1001/);
});
