import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("all technician take flows persist the assigned technician", () => {
    const take = readFileSync(new URL("../actions/repairs/take.ts", import.meta.url), "utf8");
    const assign = readFileSync(new URL("../actions/repairs/tech-assign.ts", import.meta.url), "utf8");
    assert.match(take, /assignedUserId:\s*userId/);
    assert.match(assign, /assignedUserId:\s*currentUser\.id/);
    assert.match(assign, /getCurrentUser\(\)/);
});
