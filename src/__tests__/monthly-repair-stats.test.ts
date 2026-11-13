import assert from "node:assert/strict";
import test from "node:test";
import { summarizeMonthlyRepairs } from "../lib/monthly-repair-stats";
import { reportMonth } from "../lib/date-utils";
import { REPAIR_STATUS as S } from "../lib/repairs/status";

test("a delivery does not turn an unrepaired device into a successful repair", () => {
    const events = [
        { repairId: "a", fromStatusId: S.IN_PROGRESS, toStatusId: S.OK },
        { repairId: "a", fromStatusId: S.IN_PROGRESS, toStatusId: S.NO_REPAIR },
        { repairId: "a", fromStatusId: S.NO_REPAIR, toStatusId: S.DELIVERED },
        { repairId: "a", fromStatusId: S.DELIVERED, toStatusId: S.DELIVERED },
        { repairId: "b", fromStatusId: S.OK, toStatusId: S.DELIVERED },
    ];
    assert.deepEqual(summarizeMonthlyRepairs(3, events, [{ id: "c", statusId: S.OK }]),
        { received: 3, resolved: 2, ok: 1, unrepaired: 1, delivered: 2 });
});

test("the default reporting month still belongs to December at midnight UTC on January 1", () => {
    const now = new Date("2027-01-01T02:59:59Z");
    assert.equal(reportMonth(null, null, now).toISOString().slice(0, 7), "2026-12");
    assert.equal(reportMonth("0", "2027", now).toISOString().slice(0, 7), "2027-01");
});
