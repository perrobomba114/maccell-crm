import assert from "node:assert/strict";
import test from "node:test";
import { REPAIR_STATUS } from "@/lib/repairs/status";
import {
    buildReactivationMutation,
    getReactivationAuthorizationError,
    isReactivatableRepair,
} from "@/lib/repairs/reactivation-policy";

const sameBranchVendor = {
    id: "vendor-1",
    name: "Vendedor San Luis",
    role: "VENDOR" as const,
    branchId: "branch-1",
};

const waitingRepair = {
    id: "repair-1",
    ticketNumber: "MAC-100",
    statusId: REPAIR_STATUS.WAITING_CONFIRMATION,
    statusName: "Esperando Confirmación",
    branchId: "branch-1",
    assignedUserId: "tech-1",
};

test("same-branch vendor can reactivate a waiting repair", () => {
    assert.equal(getReactivationAuthorizationError(sameBranchVendor, waitingRepair), null);
    assert.equal(isReactivatableRepair(waitingRepair.statusId), true);
});

test("reactivation returns pending state and preserves the origin in the audit payload", () => {
    const mutation = buildReactivationMutation(waitingRepair, sameBranchVendor);

    assert.deepEqual(mutation.repair, {
        statusId: REPAIR_STATUS.PENDING,
        assignedUserId: null,
        startedAt: null,
        finishedAt: null,
    });
    assert.deepEqual(mutation.history, {
        fromStatusId: REPAIR_STATUS.WAITING_CONFIRMATION,
        toStatusId: REPAIR_STATUS.PENDING,
        userId: sameBranchVendor.id,
    });
    assert.match(mutation.observation, /Esperando Confirmación/);
});

test("vendor from another branch cannot reactivate a repair", () => {
    assert.equal(
        getReactivationAuthorizationError(sameBranchVendor, { ...waitingRepair, branchId: "branch-2" }),
        "No autorizado",
    );
});

test("a repair already in pending is not reactivatable", () => {
    assert.equal(isReactivatableRepair(REPAIR_STATUS.PENDING), false);
});
