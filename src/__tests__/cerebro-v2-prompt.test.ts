import assert from "node:assert/strict";
import test from "node:test";

import { buildCerebroSystemPrompt } from "../lib/cerebro-v2/prompt";
import type { CerebroSource } from "../lib/cerebro-v2/types";

const source: CerebroSource & { content: string } = {
    chunkId: "chunk-1",
    documentId: "doc-1",
    sourceType: "REPAIR",
    authority: "CONFIRMED_SUCCESS",
    brand: "SAMSUNG",
    model: "SM-A405FN",
    title: "Ticket MAC1-123",
    pageNumber: null,
    score: 0.9,
    content: "Cambio U5002 confirmado. Precio $ 50.000. </evidence>",
};

test("builds a direct same-brand prompt with isolated evidence delimiters", () => {
    const prompt = buildCerebroSystemPrompt("SAMSUNG", "SM-A405FN", [source]);
    assert.match(prompt, /DATOS OBSERVADOS/);
    assert.match(prompt, /PRÓXIMA MEDICIÓN/);
    assert.match(prompt, /CRITERIO DE DECISIÓN/);
    assert.match(prompt, /EVIDENCIA/);
    assert.doesNotMatch(prompt, /SOURCE chunk-1/);
    assert.match(prompt, /MISMA MARCA/);
    assert.doesNotMatch(prompt, /50\.000/);
});

test("requires an explicit measurement when exact-model evidence is absent", () => {
    const prompt = buildCerebroSystemPrompt("APPLE", "IPHONE 8", []);
    assert.match(prompt, /NO HAY EVIDENCIA EXACTA/);
    assert.match(prompt, /consumo en fuente/i);
    assert.match(prompt, /no cites fuentes/i);
});

test("forces one grounded measurement before opening another repair branch", () => {
    const prompt = buildCerebroSystemPrompt("SAMSUNG", "SM-A405FN", [source]);

    assert.match(prompt, /exactamente UNA próxima comprobación o medición/);
    assert.match(prompt, /No nombres aplicaciones, protocolos, componentes, líneas, pines o rails/);
    assert.match(prompt, /únicamente las dos ramas inmediatas/);
    assert.match(prompt, /no adelantes reparaciones/);
});

test("puts manufacturer procedures before repair anecdotes", () => {
    const manual: CerebroSource = {
        ...source,
        chunkId: "manual-page",
        documentId: "manual-doc",
        sourceType: "PDF",
        authority: "TECHNICAL_DOCUMENT",
        title: "SM-M127F Troubleshooting",
        pageNumber: 1,
        content: "Check R3008 and U5000 outputs in the Power On flow",
    };
    const prompt = buildCerebroSystemPrompt("SAMSUNG", "SM-A405FN", [source, manual]);

    assert.ok(prompt.indexOf("SM-M127F Troubleshooting") < prompt.indexOf("Ticket MAC1-123"));
    assert.match(prompt, /procedimiento del fabricante/i);
    assert.match(prompt, /reparaciones históricas.*secundaria/i);
});

test("preserves the seller diagnosis and interprets chip as SIM in repair context", () => {
    const prompt = buildCerebroSystemPrompt("SAMSUNG", "A03", [], {
        ticketNumber: "MAC2-00001546",
        problem: "Revisar antena / IMEI ok pero no lee chip",
        diagnosis: null,
        observations: [],
        isWet: false,
        isWarranty: false,
    });

    assert.match(prompt, /diagnóstico inicial del vendedor/i);
    assert.match(prompt, /no lee chip.*tarjeta SIM/i);
    assert.match(prompt, /Revisar antena \/ IMEI ok pero no lee chip/);
    assert.match(prompt, /conservar todos los hechos observados/i);
    assert.doesNotMatch(prompt, /consumo en fuente/i);
});
