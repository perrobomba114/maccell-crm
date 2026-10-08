import assert from "node:assert/strict";
import test from "node:test";
import { getRepairTimerState } from "../lib/repairs/timer";
import { REPAIR_STATUS } from "../lib/repairs/status";

const start = "2026-10-08T18:00:00.000Z";
const now = Date.parse(start);
test("countdown preserves minutes beyond one hour", () => {
    assert.deepEqual(getRepairTimerState(start, 90, REPAIR_STATUS.IN_PROGRESS, now), { text: "90m 00s", overdue: false });
});
test("countdown keeps padded digits across minute boundaries", () => {
    assert.equal(getRepairTimerState(start, 10, REPAIR_STATUS.IN_PROGRESS, now + 1000).text, "09m 59s");
});
test("overdue resets when paused or extended", () => {
    assert.equal(getRepairTimerState(start, 10, REPAIR_STATUS.IN_PROGRESS, now + 600000).overdue, true);
    assert.deepEqual(getRepairTimerState(start, 10, REPAIR_STATUS.PAUSED, now + 600000), { text: "10 min", overdue: false });
    assert.equal(getRepairTimerState(start, 20, REPAIR_STATUS.IN_PROGRESS, now + 600000).overdue, false);
});
test("missing and invalid start dates are not overdue", () => {
    assert.deepEqual(getRepairTimerState(null, null, REPAIR_STATUS.IN_PROGRESS, now), { text: "-", overdue: false });
    assert.deepEqual(getRepairTimerState("invalid", 10, REPAIR_STATUS.IN_PROGRESS, now), { text: "-", overdue: false });
});
