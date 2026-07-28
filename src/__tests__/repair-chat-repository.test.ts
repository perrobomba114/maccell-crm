import assert from "node:assert/strict";
import test from "node:test";

import { buildAccessibleRepairWhere } from "../lib/repair-chat/repository";

test("scopes repair queries by role without client-side filtering", () => {
    assert.deepEqual(buildAccessibleRepairWhere({ id: "admin", role: "ADMIN", branchId: null }), {});
    assert.deepEqual(buildAccessibleRepairWhere({ id: "vendor", role: "VENDOR", branchId: "branch-a" }), { branchId: "branch-a" });
    assert.deepEqual(buildAccessibleRepairWhere({ id: "tech", role: "TECHNICIAN", branchId: null }), { assignedUserId: "tech" });
});
