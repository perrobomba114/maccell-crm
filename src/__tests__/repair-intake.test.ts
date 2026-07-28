import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
    appendPatternPoint,
    normalizeRepairIntake,
    readRepairIntakeFormData,
    serializePattern,
    summarizeRepairIntake,
} from "../lib/repairs/intake";
import {
    createInitialRepairFormState,
    createRepairFormReducer,
} from "../components/repairs/create-repair-form-state";

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

test("appends each pattern point only once", () => {
    assert.deepEqual(appendPatternPoint([1, 2], 2), [1, 2]);
    assert.deepEqual(appendPatternPoint([1, 2], 5), [1, 2, 5]);
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

test("changing intake to NONE clears a previously entered credential", () => {
    const initial = createInitialRepairFormState(new Date("2026-07-27T12:00:00.000Z"), "vendor-1");
    const withCode = createRepairFormReducer(initial, {
        type: "setIntake",
        value: {
            accessType: "CODE",
            accessCredential: "2580",
            hasSimCard: false,
            hasMemoryCard: false,
        },
    });
    const withoutCode = createRepairFormReducer(withCode, {
        type: "setAccessType",
        value: "NONE",
    });

    assert.equal(withoutCode.intake.accessCredential, null);
});

test("repair creation form integrates the typed intake section and reducer", () => {
    const source = readFileSync(new URL("../components/repairs/create-form.tsx", import.meta.url), "utf8");
    const fieldsSource = readFileSync(new URL("../components/repairs/create-repair-form-fields.tsx", import.meta.url), "utf8");

    assert.match(source, /useReducer/);
    assert.match(source, /summarizeRepairIntake/);
    assert.match(source, /<CreateRepairFormFields/);
    assert.match(source, /<RepairCreateConfirmDialog/);
    assert.match(fieldsSource, /<RepairIntakeFields/);
    assert.doesNotMatch(source, /\bany\b/);
});
