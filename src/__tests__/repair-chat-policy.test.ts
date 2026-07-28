import assert from "node:assert/strict";
import test from "node:test";

import { canAccessRepairChat, isRepairChatReadOnly } from "../lib/repair-chat/policy";

const repair = { branchId: "branch-a", assignedUserId: "tech-a", statusId: 3 };

test("authorizes administrators, same-branch vendors and the assigned technician", () => {
    assert.equal(canAccessRepairChat({ id: "admin", role: "ADMIN", branchId: null }, repair), true);
    assert.equal(canAccessRepairChat({ id: "vendor-a", role: "VENDOR", branchId: "branch-a" }, repair), true);
    assert.equal(canAccessRepairChat({ id: "tech-a", role: "TECHNICIAN", branchId: null }, repair), true);
});

test("rejects vendors from another branch and technicians no longer assigned", () => {
    assert.equal(canAccessRepairChat({ id: "vendor-b", role: "VENDOR", branchId: "branch-b" }, repair), false);
    assert.equal(canAccessRepairChat({ id: "tech-old", role: "TECHNICIAN", branchId: null }, repair), false);
});

test("archives chats only after delivery", () => {
    for (const statusId of [6, 10]) assert.equal(isRepairChatReadOnly(statusId), true);
    for (const statusId of [1, 2, 3, 4, 5, 7, 8, 9]) assert.equal(isRepairChatReadOnly(statusId), false);
});
