import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("withdrawing a repair keeps it unassigned until a technician claims it", () => {
    const take = readFileSync(new URL("../actions/repairs/take.ts", import.meta.url), "utf8");
    const assign = readFileSync(new URL("../actions/repairs/tech-assign.ts", import.meta.url), "utf8");
    const technicianPage = readFileSync(new URL("../app/technician/repairs/page.tsx", import.meta.url), "utf8");
    const withdrawalDialog = readFileSync(new URL("../components/repairs/take-repair-dialog.tsx", import.meta.url), "utf8");

    assert.match(take, /assignedUserId:\s*null/);
    assert.doesNotMatch(take, /assignedUserId:\s*userId/);
    assert.match(assign, /techTakeRepairAction[\s\S]*?assignedUserId:\s*null/);
    assert.match(assign, /assignTimeAction[\s\S]*?assignedUserId:\s*technicianId/);
    assert.match(assign, /assignTimeAction[\s\S]*?getCurrentUser\(\)[\s\S]*?currentUser\.id !== technicianId/);
    assert.match(assign, /assignTimeAction[\s\S]*?updateMany\([\s\S]*?assignedUserId:\s*repair\.assignedUserId/);
    assert.match(assign, /assignTimeAction[\s\S]*?if \(assigned\.count !== 1\)/);
    assert.match(technicianPage, /r\.statusId === 2 && !r\.assignedUserId/);
    assert.match(withdrawalDialog, /Reparación retirada correctamente\./);
    assert.doesNotMatch(withdrawalDialog, /Reparación asignada correctamente\./);
});

test("withdrawing uses a conditional pending-to-claimed transition", () => {
    const take = readFileSync(new URL("../actions/repairs/take.ts", import.meta.url), "utf8");
    assert.match(take, /updateMany\([\s\S]*?statusId:\s*REPAIR_STATUS\.PENDING[\s\S]*?assignedUserId:\s*null/);
    assert.match(take, /if \(withdrawn\.count !== 1\)/);
});

test("assignment, transfer and status changes invalidate chat access immediately", () => {
    const migration = readFileSync(new URL("../../prisma/migrations/20260728030000_add_repair_internal_chat/migration.sql", import.meta.url), "utf8");
    assert.match(migration, /AFTER UPDATE OF "assignedUserId", "statusId" ON "repairs"/);
    assert.match(migration, /pg_notify\('repair_chat_events'/);
    assert.match(migration, /access\.changed/);
    assert.match(migration, /status\.changed/);
});
