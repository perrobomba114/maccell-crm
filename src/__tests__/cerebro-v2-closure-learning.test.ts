import assert from "node:assert/strict";
import test from "node:test";

import { buildClosureLearningRecord } from "@/lib/cerebro-v2/closure-learning";

const completeClosure = {
    symptom: "Enciende pero no da imagen",
    rootCause: "Conector FPC de display abierto",
    confirmingEvidence: "Continuidad abierta entre pin 12 del FPC y R1201",
    intervention: "Se rehizo la pista entre FPC y R1201",
    verification: "Imagen estable con módulo probado",
    affectedReferences: ["J1200", "R1201"],
    schematicPages: [],
    externalSources: [],
};

test("promotes only a complete Finalizado OK closure", () => {
    assert.equal(buildClosureLearningRecord("Finalizado OK", completeClosure).authority, "CONFIRMED_SUCCESS");
    assert.equal(buildClosureLearningRecord("Finalizado OK", { ...completeClosure, verification: "" }).authority, "INCOMPLETE");
    assert.equal(buildClosureLearningRecord("No reparado", completeClosure).authority, "FAILED");
});

test("redacts customer data from learning fields", () => {
    const result = buildClosureLearningRecord("Finalizado OK", {
        ...completeClosure,
        confirmingEvidence: "Cliente 1122334455, costo ARS 9000: continuidad abierta",
    });
    assert.doesNotMatch(result.closure.confirmingEvidence, /1122334455|ARS|9000/);
});
