import assert from "node:assert/strict";
import test from "node:test";
import {
    formatRepairTimeMinutes,
    getAverageRepairTimeMinutes,
} from "@/lib/repair-time-metrics";

test("averages technician repair time from startedAt to finishedAt", () => {
    const average = getAverageRepairTimeMinutes([
        {
            startedAt: new Date("2026-07-04T12:00:00.000Z"),
            finishedAt: new Date("2026-07-04T13:30:00.000Z"),
        },
        {
            startedAt: new Date("2026-07-04T14:00:00.000Z"),
            finishedAt: new Date("2026-07-04T15:00:00.000Z"),
        },
    ]);

    assert.equal(average, 75);
    assert.equal(formatRepairTimeMinutes(average), "1h 15m");
});

test("uses a 15 minute fallback for tracked repairs without a usable start time", () => {
    const average = getAverageRepairTimeMinutes([
        {
            startedAt: null,
            finishedAt: new Date("2026-07-04T13:30:00.000Z"),
        },
        {
            startedAt: new Date("2026-07-04T14:00:00.000Z"),
            finishedAt: new Date("2026-07-04T14:00:30.000Z"),
        },
    ]);

    assert.equal(average, 15);
});
