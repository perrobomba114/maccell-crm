import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminRepairSearchHref } from "../app/admin/sales/components/sale-detail-links";

test("builds an admin repairs search link from a repair sale item", () => {
    const href = buildAdminRepairSearchHref({
        repairId: "repair-1",
        name: "Ticket #99880001",
    });

    assert.equal(href, "/admin/repairs?q=99880001");
});

test("does not build a repair link for regular sale items", () => {
    const href = buildAdminRepairSearchHref({
        repairId: null,
        name: "Cable USB-C",
    });

    assert.equal(href, null);
});
