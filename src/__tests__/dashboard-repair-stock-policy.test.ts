import assert from "node:assert/strict";
import test from "node:test";

import { buildRepairStockWhere } from "@/actions/statistics/repair-stock-policy";
import { REPAIR_STATUS } from "@/lib/repairs/status";

test("repair stock excludes delivered statuses and repairs linked to a sale", () => {
    assert.deepEqual(buildRepairStockWhere(), {
        statusId: { not: REPAIR_STATUS.DELIVERED },
        saleItems: { none: {} },
    });
});
