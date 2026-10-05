import assert from "node:assert/strict";
import test from "node:test";
import { validateFinishParts } from "../lib/repairs/finish-parts-policy";
import { REPAIR_STATUS } from "../lib/repairs/status";

test("closing requires an explicit parts decision and a real assignment", () => {
    for (const status of [REPAIR_STATUS.OK, REPAIR_STATUS.NO_REPAIR, REPAIR_STATUS.DIAGNOSED, REPAIR_STATUS.WAITING_PARTS]) {
        assert.ok(validateFinishParts(status, null, 2));
        assert.ok(validateFinishParts(status, "true", 0));
        assert.equal(validateFinishParts(status, "true", 1), null);
        assert.equal(validateFinishParts(status, "false", 0), null);
        assert.ok(validateFinishParts(status, "", 0));
    }
});

test("pausing does not require a parts decision", () => {
    assert.equal(validateFinishParts(REPAIR_STATUS.PAUSED, null, 0), null);
});
