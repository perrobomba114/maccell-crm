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

test("assignment, transfer and status changes invalidate chat access immediately", () => {
    const migration = readFileSync(new URL("../../prisma/migrations/20260728030000_add_repair_internal_chat/migration.sql", import.meta.url), "utf8");
    assert.match(migration, /AFTER UPDATE OF "assignedUserId", "statusId" ON "repairs"/);
    assert.match(migration, /pg_notify\('repair_chat_events'/);
    assert.match(migration, /access\.changed/);
    assert.match(migration, /status\.changed/);
});
