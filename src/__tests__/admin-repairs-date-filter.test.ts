import assert from "node:assert/strict";
import test from "node:test";

import {
    HISTORY_REPAIR_DATE_FILTER,
    resolveAdminRepairDateFilter,
    resolveAdminRepairDateSelection,
} from "../lib/admin-repairs-date-filter";

const referenceDate = new Date("2026-07-02T14:00:00.000Z");

test("defaults admin repairs date filter to today in Argentina", () => {
    assert.equal(resolveAdminRepairDateFilter(undefined, referenceDate), "2026-07-02");
    assert.equal(resolveAdminRepairDateSelection(null, referenceDate), "2026-07-02");
});

test("normalizes legacy history admin repairs filters to today", () => {
    assert.equal(resolveAdminRepairDateFilter(HISTORY_REPAIR_DATE_FILTER, referenceDate), "2026-07-02");
    assert.equal(resolveAdminRepairDateSelection(HISTORY_REPAIR_DATE_FILTER, referenceDate), "2026-07-02");
});

test("preserves month and concrete admin repairs date filters", () => {
    assert.equal(resolveAdminRepairDateFilter("MONTH", referenceDate), "MONTH");
    assert.equal(resolveAdminRepairDateSelection("2026-07-01", referenceDate), "2026-07-01");
});
