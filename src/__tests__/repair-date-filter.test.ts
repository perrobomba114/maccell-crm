import assert from "node:assert/strict";
import test from "node:test";

import { getRepairDateFilterRange, normalizeRepairDateFilter } from "../lib/repair-date-filter";

test("treats an empty repair date filter as all history", () => {
    assert.equal(normalizeRepairDateFilter(""), "");
    assert.equal(getRepairDateFilterRange(""), null);
    assert.equal(getRepairDateFilterRange(null), null);
});

test("rejects invalid repair date filters before building ranges", () => {
    assert.equal(normalizeRepairDateFilter("2026-99-99"), "");
    assert.equal(normalizeRepairDateFilter("not-a-date"), "");
    assert.equal(getRepairDateFilterRange("not-a-date"), null);
});

test("builds an Argentina day range for repair date filters", () => {
    const range = getRepairDateFilterRange("2026-07-02");

    assert.equal(range?.start.toISOString(), "2026-07-02T03:00:00.000Z");
    assert.equal(range?.end.toISOString(), "2026-07-03T02:59:59.999Z");
});

test("builds an Argentina current-month range for the MONTH repair date filter", () => {
    const range = getRepairDateFilterRange("MONTH", new Date("2026-07-15T15:00:00.000Z"));

    assert.equal(range?.start.toISOString(), "2026-07-01T03:00:00.000Z");
    assert.equal(range?.end.toISOString(), "2026-08-01T02:59:59.999Z");
});
