import assert from "node:assert/strict";
import test from "node:test";
import { summarizeTechnicianOutcomes } from "@/lib/technician-outcomes";

test("counts the latest finalization once and keeps technicians separate", () => {
    const summary = summarizeTechnicianOutcomes([
        { repairId: "a", userId: "tech", toStatus: { id: 7, name: "Sin reparación" } },
        { repairId: "a", userId: "tech", toStatus: { id: 5, name: "Listo" } },
        { repairId: "b", userId: "tech", toStatus: { id: 5, name: "Listo" } },
        { repairId: "a", userId: "other", toStatus: { id: 5, name: "Listo" } },
        { repairId: "c", userId: null, toStatus: { id: 5, name: "Listo" } },
    ]);
    assert.deepEqual(summary.get("tech"), { total: 2, outcomes: [
        { id: 5, name: "Listo", count: 1 }, { id: 7, name: "Sin reparación", count: 1 },
    ] });
    assert.equal(summary.get("other")?.total, 1);
    assert.equal(summary.size, 2);
});

test("returns no technician counts for an empty filtered period", () => {
    assert.equal(summarizeTechnicianOutcomes([]).size, 0);
});
