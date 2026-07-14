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

test("expands no-power with missing backlight toward manufacturer repair sections", () => {
    const subsystems = inferDiagnosticSubsystems("No enciende y no da luz de fondo");
    const query = buildTechnicalSearchQuery({
        brand: "SAMSUNG",
        model: "SM-M127F",
        problem: "No enciende",
        latestText: "No da luz de fondo aunque carga normalmente",
        observations: [],
    });

    assert.ok(subsystems.includes("POWER"));
    assert.ok(subsystems.includes("DISPLAY"));
    assert.match(query, /POWER ON/);
    assert.match(query, /LCD/);
    assert.match(query, /PWR ON/);
});

test("interprets Argentine chip language as the SIM and RF subsystem", () => {
    const symptom = "Revisar antena / IMEI ok pero no lee chip";
    const subsystems = inferDiagnosticSubsystems(symptom);
    const query = buildTechnicalSearchQuery({
        brand: "SAMSUNG",
        model: "A03",
        problem: symptom,
        latestText: "no lee el chip",
        observations: [],
    });

    assert.ok(subsystems.includes("RF"));
    assert.match(query, /SIM CONNECTOR/);
    assert.match(query, /SIM DETECT/);
    assert.match(query, /BASEBAND/);
});
