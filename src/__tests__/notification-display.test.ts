import assert from "node:assert/strict";
import test from "node:test";

import { getRepairEntryDisplay, getStockDiscrepancyDisplay } from "../lib/notification-display";

test("builds compact stock discrepancy display data including branch name", () => {
    const display = getStockDiscrepancyDisplay({
        type: "STOCK_DISCREPANCY",
        productName: "Flex iPhone",
        sku: "FX-001",
        branchName: "MACCELL 2",
        currentQuantity: 3,
        proposedQuantity: 1,
        adjustment: -2,
        reporterName: "Ana",
    });

    assert.deepEqual(display, {
        productName: "Flex iPhone",
        sku: "FX-001",
        branchName: "MACCELL 2",
        currentQuantity: 3,
        proposedQuantity: 1,
        adjustment: -2,
        reporterName: "Ana",
    });
});

test("ignores non stock discrepancy notification data", () => {
    assert.equal(getStockDiscrepancyDisplay({ type: "REPAIR_ENTRY" }), null);
    assert.equal(getStockDiscrepancyDisplay(null), null);
});

test("builds repair entry display data from notification action data", () => {
    assert.deepEqual(getRepairEntryDisplay({
        promisedDate: "02/07/2026",
        promisedTime: "15:30",
    }), {
        promisedDate: "02/07/2026",
        promisedTime: "15:30",
    });
});
