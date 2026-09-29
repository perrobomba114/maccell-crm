import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAdminRepairStatusId } from "@/lib/admin-repairs-status-filter";
import { buildAdminRepairsWhere, normalizeAdminRepairsQuery } from "@/lib/admin-repairs-query";
import { buildAdminRepairSearchParamUpdates } from "@/lib/admin-repairs-filter-updates";

test("accepts any positive status id and rejects malformed values", () => {
    assert.equal(normalizeAdminRepairStatusId("4"), 4);
    assert.equal(normalizeAdminRepairStatusId(10), 10);
    for (const value of ["ALL", "", "4x", -1, 1.5, null, [], Infinity]) assert.equal(normalizeAdminRepairStatusId(value), 0);
});

test("active status and technician filter use current assignment rather than finalizations", () => {
    const where = buildAdminRepairsWhere(normalizeAdminRepairsQuery({ statusId: 4, technicianId: "tech", branchId: "branch", warrantyOnly: true, date: "2026-09-29" }));
    assert.equal(where.statusId, 4);
    assert.equal(where.assignedUserId, "tech");
    assert.equal(where.branchId, "branch");
    assert.equal(where.isWarranty, true);
    const serialized = JSON.stringify(where);
    assert.ok(serialized.includes('"toStatusId":4'));
    assert.ok(!serialized.includes('"notIn"'));
    assert.ok(serialized.includes("2026-09-29T03:00:00.000Z"));
});

test("unfiltered technician ranking preserves finalized history attribution", () => {
    const where = buildAdminRepairsWhere(normalizeAdminRepairsQuery({ technicianId: "tech", date: "2026-09-29" }));
    assert.equal(where.assignedUserId, undefined);
    assert.ok(JSON.stringify(where).includes('"userId":"tech"'));
    assert.ok(JSON.stringify(where).includes('"notIn"'));
});

test("ticket lookup clears status along with other scoped filters", () => {
    assert.equal(buildAdminRepairSearchParamUpdates("MAC2-00002177").status, null);
});
