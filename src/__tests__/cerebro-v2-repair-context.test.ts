import assert from "node:assert/strict";
import test from "node:test";

import { ACTIVE_CEREBRO_REPAIR_STATUSES, buildCerebroRepairWhere } from "@/lib/cerebro-v2/repair-context";

test("technicians only receive active repairs assigned to themselves", () => {
    const where = buildCerebroRepairWhere({ id: "tech-7", role: "TECHNICIAN" });

    assert.deepEqual(where.statusId, { in: [...ACTIVE_CEREBRO_REPAIR_STATUSES] });
    assert.equal(where.assignedUserId, "tech-7");
});

test("administrators receive every active assigned repair", () => {
    const where = buildCerebroRepairWhere({ id: "admin-1", role: "ADMIN" });

    assert.deepEqual(where.statusId, { in: [...ACTIVE_CEREBRO_REPAIR_STATUSES] });
    assert.deepEqual(where.assignedUserId, { not: null });
});

test("unsupported roles cannot build a repair scope", () => {
    assert.throws(
        () => buildCerebroRepairWhere({ id: "vendor-1", role: "VENDOR" }),
        /sin acceso/i,
    );
});
