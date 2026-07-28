import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
    normalizeRepairIntake,
    readRepairIntakeFormData,
    serializePattern,
    summarizeRepairIntake,
} from "../lib/repairs/intake";

test("normalizes a trimmed code and accessory flags", () => {
    assert.deepEqual(normalizeRepairIntake({
        accessType: "CODE",
        accessCredential: " 2580 ",
        hasSimCard: "true",
        hasMemoryCard: "false",
    }), {
        success: true,
        data: {
            accessType: "CODE",
            accessCredential: "2580",
            hasSimCard: true,
            hasMemoryCard: false,
        },
    });
});

test("rejects a pattern with fewer than four unique points", () => {
    assert.deepEqual(normalizeRepairIntake({
        accessType: "PATTERN",
        accessCredential: "1-2-2-3",
        hasSimCard: "false",
        hasMemoryCard: "false",
    }), {
        success: false,
        error: "El patrón debe incluir al menos 4 puntos distintos.",
    });
});

test("clears stale credentials when the device has no code", () => {
    const result = normalizeRepairIntake({
        accessType: "NONE",
        accessCredential: "1234",
        hasSimCard: "false",
        hasMemoryCard: "true",
    });

    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.accessCredential, null);
});

test("serializes the selected pattern in order", () => {
    assert.equal(serializePattern([1, 2, 5, 8]), "1-2-5-8");
});

test("summarizes intake without returning the credential", () => {
    assert.deepEqual(summarizeRepairIntake({
        accessType: "CODE",
        accessCredential: "2580",
        hasSimCard: true,
        hasMemoryCard: true,
    }), {
        accessLabel: "Código/PIN registrado",
        accessoriesLabel: "SIM + Tarjeta de memoria",
    });
});

test("normalizes values read from FormData", () => {
    const formData = new FormData();
    formData.set("accessType", "PATTERN");
    formData.set("accessCredential", "1-2-5-8");
    formData.set("hasSimCard", "true");
    formData.set("hasMemoryCard", "true");

    assert.deepEqual(readRepairIntakeFormData(formData), {
        success: true,
        data: {
            accessType: "PATTERN",
            accessCredential: "1-2-5-8",
            hasSimCard: true,
            hasMemoryCard: true,
        },
    });
});

test("repair creation validates and persists normalized intake fields", () => {
    const source = readFileSync(new URL("../actions/repairs/create.ts", import.meta.url), "utf8");

    assert.match(source, /readRepairIntakeFormData\(formData\)/);
    assert.match(source, /accessType:\s*intakeResult\.data\.accessType/);
    assert.match(source, /accessCredential:\s*intakeResult\.data\.accessCredential/);
    assert.match(source, /hasSimCard:\s*intakeResult\.data\.hasSimCard/);
    assert.match(source, /hasMemoryCard:\s*intakeResult\.data\.hasMemoryCard/);
    assert.match(source, /statusId:\s*REPAIR_STATUS\.PENDING/);
    assert.doesNotMatch(source, /\bany\b/);
});
