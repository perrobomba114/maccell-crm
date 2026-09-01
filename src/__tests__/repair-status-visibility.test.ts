import assert from "node:assert/strict";
import test from "node:test";
import {
    TECHNICIAN_REPAIR_STATUS_IDS,
    VENDOR_ACTIVE_REPAIR_STATUS_IDS,
    VENDOR_HISTORY_STATUS_IDS,
    VENDOR_REACTIVATABLE_STATUS_IDS,
} from "@/lib/repairs/status-sets";

test("technician active set excludes diagnostic and waiting states", () => {
    assert.deepEqual([...TECHNICIAN_REPAIR_STATUS_IDS], [2, 3, 4]);
});

test("vendor active and history sets place waiting repairs in history", () => {
    assert.deepEqual([...VENDOR_ACTIVE_REPAIR_STATUS_IDS], [1, 2, 3, 4]);
    assert.deepEqual([...VENDOR_REACTIVATABLE_STATUS_IDS], [7, 8, 9]);
    assert.deepEqual([...VENDOR_HISTORY_STATUS_IDS], [5, 6, 7, 8, 9, 10]);
});
