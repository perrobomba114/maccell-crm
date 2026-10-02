import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateVendorPrize, getVendorPrizeRange } from "../lib/vendor-prize";

test("uses the twelve completed Argentina months, excluding the current partial month", () => {
    const range = getVendorPrizeRange(new Date("2026-10-02T15:00:00Z"));
    assert.equal(range.start.toISOString(), "2025-10-01T03:00:00.000Z");
    assert.equal(range.endExclusive.toISOString(), "2026-10-01T03:00:00.000Z");
    const boundary = getVendorPrizeRange(new Date("2026-01-01T02:59:59Z"));
    assert.equal(boundary.start.toISOString(), "2024-12-01T03:00:00.000Z");
    assert.equal(boundary.endExclusive.toISOString(), "2025-12-01T03:00:00.000Z");
});

test("reports missing percentage against the monthly average, including zero-sales months", () => {
    assert.deepEqual(calculateVendorPrize(750, 12000), {
        currentMonthTotal: 750, monthlyAverage: 1000, remainingPercent: 25, achieved: false,
    });
    assert.equal(calculateVendorPrize(0, 12000).remainingPercent, 100);
    assert.equal(calculateVendorPrize(100, 1200).achieved, true);
});

test("reaching or exceeding the goal never produces a negative percentage", () => {
    for (const total of [1000, 1500]) {
        assert.equal(calculateVendorPrize(total, 12000).remainingPercent, 0);
        assert.equal(calculateVendorPrize(total, 12000).achieved, true);
    }
    assert.equal(calculateVendorPrize(999.99, 12000).remainingPercent, 0.1);
});

test("no positive historical baseline is not a fictitious prize", () => {
    for (const total of [0, -1, NaN, Infinity]) {
        assert.equal(calculateVendorPrize(100, total).remainingPercent, null);
        assert.equal(calculateVendorPrize(100, total).achieved, false);
    }
});
