import assert from "node:assert/strict";
import test from "node:test";

import {
    HISTORY_REPAIR_DATE_FILTER,
    formatAdminRepairCalendarDate,
    isDefaultAdminRepairDateFilter,
    parseAdminRepairCalendarDate,
    resolveAdminRepairDateFilter,
    resolveAdminRepairDateFilterForSearch,
    resolveAdminRepairDateSelection,
    resolveAdminRepairDateSelectionForSearch,
    shiftAdminRepairDateFilter,
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

test("parses admin repair calendar dates without UTC day shifts", () => {
    const parsed = parseAdminRepairCalendarDate("2026-07-01");

    assert.ok(parsed);
    assert.equal(parsed.getFullYear(), 2026);
    assert.equal(parsed.getMonth(), 6);
    assert.equal(parsed.getDate(), 1);
    assert.equal(formatAdminRepairCalendarDate(parsed), "2026-07-01");
});

test("shifts admin repair dates by calendar day", () => {
    assert.equal(shiftAdminRepairDateFilter("2026-07-01", 1, referenceDate), "2026-07-02");
    assert.equal(shiftAdminRepairDateFilter("2026-07-01", -1, referenceDate), "2026-06-30");
});

test("detects default admin repair date filters without forcing URL rewrites", () => {
    assert.equal(isDefaultAdminRepairDateFilter(undefined, referenceDate), true);
    assert.equal(isDefaultAdminRepairDateFilter(HISTORY_REPAIR_DATE_FILTER, referenceDate), true);
    assert.equal(isDefaultAdminRepairDateFilter("2026-07-02", referenceDate), true);
    assert.equal(isDefaultAdminRepairDateFilter("2026-07-01", referenceDate), false);
    assert.equal(isDefaultAdminRepairDateFilter("MONTH", referenceDate), false);
});

test("uses a global admin repairs date filter while searching without an explicit date", () => {
    assert.equal(resolveAdminRepairDateFilterForSearch(undefined, "s24", referenceDate), "");
    assert.equal(resolveAdminRepairDateSelectionForSearch(null, "MAC2-00001457", referenceDate), "");
});

test("preserves explicit admin repairs date filters while searching", () => {
    assert.equal(resolveAdminRepairDateFilterForSearch("2026-07-02", "s24", referenceDate), "2026-07-02");
    assert.equal(resolveAdminRepairDateFilterForSearch("MONTH", "s24", referenceDate), "MONTH");
});
