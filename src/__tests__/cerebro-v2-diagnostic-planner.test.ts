import assert from "node:assert/strict";
import test from "node:test";

import { buildTechnicalSearchQuery, inferDiagnosticSubsystems } from "@/lib/cerebro-v2/diagnostic-planner";

test("expands no-power searches toward the relevant schematic subsystems", () => {
    const subsystems = inferDiagnosticSubsystems("No enciende, consumo cero");
    const query = buildTechnicalSearchQuery({
        brand: "SAMSUNG",
        model: "SM-A125M",
        problem: "No enciende",
        latestText: "consumo cero",
        observations: [],
    });

    assert.ok(subsystems.includes("POWER"));
    assert.match(query, /VBAT|PMIC|POWER KEY/);
    assert.match(query, /SM-A125M/);
});
