import assert from "node:assert/strict";
import test from "node:test";

import { isPosDeliveryBlockedStatus, POS_DELIVERY_BLOCKED_STATUS_IDS, REPAIR_STATUS } from "@/lib/repairs/status";

test("POS blocks delivery for active technician work states", () => {
    assert.deepEqual(POS_DELIVERY_BLOCKED_STATUS_IDS, [
        REPAIR_STATUS.CLAIMED,
        REPAIR_STATUS.IN_PROGRESS,
        REPAIR_STATUS.PAUSED,
    ]);

    for (const statusId of POS_DELIVERY_BLOCKED_STATUS_IDS) {
        assert.equal(isPosDeliveryBlockedStatus(statusId), true);
    }
});

test("POS delivery policy allows delivery for ready and final statuses", () => {
    assert.equal(isPosDeliveryBlockedStatus(REPAIR_STATUS.OK), false);
    assert.equal(isPosDeliveryBlockedStatus(REPAIR_STATUS.NO_REPAIR), false);
    assert.equal(isPosDeliveryBlockedStatus(REPAIR_STATUS.DIAGNOSED), false);
    assert.equal(isPosDeliveryBlockedStatus(REPAIR_STATUS.WAITING_CONFIRMATION), false);
    assert.equal(isPosDeliveryBlockedStatus(REPAIR_STATUS.WAITING_PARTS), false);
    assert.equal(isPosDeliveryBlockedStatus(REPAIR_STATUS.INVOICED), false);
});
