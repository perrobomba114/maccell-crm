import assert from "node:assert/strict";
import test from "node:test";

import { buildLoraTrainingExample } from "@/lib/cerebro-v2/lora-dataset";

test("preserves the measurement and verification in the supervised answer", () => {
    const example = buildLoraTrainingExample({
        ticketNumber: "MAC-1",
        deviceBrand: "Samsung",
        deviceModel: "SM-A405FN",
        problemDescription: "No da imagen",
        symptom: "El equipo enciende pero no muestra imagen",
        rootCause: "FL2201 abierto",
        confirmingEvidence: "Continuidad abierta en FL2201",
        intervention: "Reemplazo de FL2201",
        verification: "Imagen estable tras reinicios",
        affectedReferences: ["FL2201"],
    });

    assert.match(example.messages[2].content, /Continuidad abierta en FL2201/);
    assert.match(example.messages[2].content, /Imagen estable tras reinicios/);
    assert.doesNotMatch(example.messages[2].content, /precio/i);
});
