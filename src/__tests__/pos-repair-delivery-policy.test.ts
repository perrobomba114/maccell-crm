import assert from "node:assert/strict";
import test from "node:test";

import { isPosDeliveryBlockedStatus, POS_DELIVERY_BLOCKED_STATUS_IDS, REPAIR_STATUS } from "@/lib/repairs/status";

test("POS blocks delivery for technician-owned and ready repair states", () => {
    assert.deepEqual(POS_DELIVERY_BLOCKED_STATUS_IDS, [
        REPAIR_STATUS.CLAIMED,
        REPAIR_STATUS.IN_PROGRESS,
        REPAIR_STATUS.PAUSED,
        REPAIR_STATUS.OK,
    ]);

    for (const statusId of POS_DELIVERY_BLOCKED_STATUS_IDS) {
        assert.equal(isPosDeliveryBlockedStatus(statusId), true);
    }
});

test("POS delivery policy does not classify final invoiced state as blocked", () => {
    assert.equal(isPosDeliveryBlockedStatus(REPAIR_STATUS.INVOICED), false);
});
