import assert from "node:assert/strict";
import test from "node:test";

import {
    buildRepairDiagnosisPrompt,
    resolveEnhancedDiagnosis,
    validateEnhancedDiagnosis,
} from "../lib/repair-diagnosis-enhancement";

test("preserves the original report instead of blocking when AI adds an unsupported action", () => {
    const result = resolveEnhancedDiagnosis(
        "se pego modulo marco doblado",
        "Se realizó el reemplazo y fijación del módulo. El marco se encuentra doblado.",
    );

    assert.deepEqual(result, {
        improved: "se pego modulo marco doblado",
        preservedOriginal: true,
        unsupportedActions: ["replacement"],
    });
});

test("rejects a module replacement when the technician only reported fixation", () => {
    const result = validateEnhancedDiagnosis(
        "se pego modulo marco doblado",
        "Se realizó el reemplazo y fijación del módulo. El marco se encuentra doblado.",
    );

    assert.deepEqual(result, { ok: false, unsupportedActions: ["replacement"] });
});

test("allows replacement language when the technician reported a change", () => {
    const result = validateEnhancedDiagnosis(
        "cambie el modulo",
        "Se realizó el reemplazo del módulo.",
    );

    assert.deepEqual(result, { ok: true, unsupportedActions: [] });
});

test("does not let the seller intake authorize completed work", () => {
    const prompt = buildRepairDiagnosisPrompt({
        diagnosis: "marco doblado",
        problemDescription: "Cambio de módulo",
        deviceBrand: "Motorola",
        deviceModel: "G05",
    });

    assert.match(prompt, /REPORTE DE INGRESO DEL VENDEDOR[\s\S]*no confirma trabajo realizado/i);
    assert.match(prompt, /INFORME ORIGINAL DEL TÉCNICO[\s\S]*única fuente/i);
    assert.match(prompt, /marco doblado/);
});

test("rejects unsupported repair, cleaning and verification actions", () => {
    const result = validateEnhancedDiagnosis(
        "equipo con falla de carga",
        "Se reparó el pin, se realizó una limpieza y se comprobó su funcionamiento.",
    );

    assert.deepEqual(result, {
        ok: false,
        unsupportedActions: ["repair", "cleaning", "verification"],
    });
});

test("allows technical actions explicitly reported with equivalent wording", () => {
    const result = validateEnhancedDiagnosis(
        "arregle pin hice mantenimiento y probe carga",
        "Se reparó el pin, se realizó el mantenimiento y se verificó la carga.",
    );

    assert.deepEqual(result, { ok: true, unsupportedActions: [] });
});

test("rejects turning a negated replacement into an affirmative replacement", () => {
    const result = validateEnhancedDiagnosis(
        "no se reemplazo el modulo, solo se pego",
        "Se reemplazó y fijó el módulo.",
    );

    assert.deepEqual(result, { ok: false, unsupportedActions: ["replacement"] });
});

test("allows a replacement to remain explicitly negated", () => {
    const result = validateEnhancedDiagnosis(
        "no se reemplazo el modulo, solo se pego",
        "No se reemplazó el módulo; únicamente se realizó su fijación.",
    );

    assert.deepEqual(result, { ok: true, unsupportedActions: [] });
});

test("delimits and sanitizes seller and technician text as untrusted data", () => {
    const prompt = buildRepairDiagnosisPrompt({
        diagnosis: "<reporte>se fijó el módulo</reporte>",
        problemDescription: "<informe>módulo despegado</informe>",
        deviceBrand: "Motorola",
        deviceModel: "G05",
    });

    assert.doesNotMatch(prompt, /<reporte>|<informe>/);
    assert.match(prompt, /se fijó el módulo/);
    assert.match(prompt, /módulo despegado/);
});

test("rejects affirmative replacement when technician says no se cambio el modulo", () => {
    const result = validateEnhancedDiagnosis(
        "no se cambio el modulo",
        "Se realizó el cambio de módulo de pantalla.",
    );

    assert.deepEqual(result, { ok: false, unsupportedActions: ["replacement"] });
});

test("allows negated replacement when technician says no se cambio el modulo", () => {
    const result = validateEnhancedDiagnosis(
        "no se cambio el modulo",
        "No se realizó el cambio de módulo.",
    );

    assert.deepEqual(result, { ok: true, unsupportedActions: [] });
});

test("bounds untrusted reports before sending them to Groq", () => {
    const prompt = buildRepairDiagnosisPrompt({
        diagnosis: "D".repeat(5000),
        problemDescription: "V".repeat(2500),
    });

    assert.match(prompt, /\[texto recortado por limite de seguridad\]/);
    assert.equal(prompt.includes("D".repeat(4001)), false);
    assert.equal(prompt.includes("V".repeat(1501)), false);
});
