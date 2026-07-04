import assert from "node:assert/strict";
import test from "node:test";
import { getOriginalRepairTechnicianName } from "@/lib/repair-warranty-info";

test("uses the technician who finalized the original repair for warranty info", () => {
    const technicianName = getOriginalRepairTechnicianName({
        assignedTo: { name: "Tecnico Asignado" },
        statusHistory: [
            { user: { name: "Vendedor", role: "VENDOR" } },
            { user: { name: "Tecnico Final", role: "TECHNICIAN" } },
        ],
    });

    assert.equal(technicianName, "Tecnico Final");
});

test("falls back to the original assigned technician when final history is missing", () => {
    const technicianName = getOriginalRepairTechnicianName({
        assignedTo: { name: "Tecnico Asignado" },
        statusHistory: [],
    });

    assert.equal(technicianName, "Tecnico Asignado");
});
