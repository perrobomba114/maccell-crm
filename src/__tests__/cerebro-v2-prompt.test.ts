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
    assert.match(prompt, /DIAGNÓSTICO PROBABLE/);
    assert.match(prompt, /MEDICIONES/);
    assert.match(prompt, /INTERVENCIÓN SUGERIDA/);
    assert.match(prompt, /FUENTES/);
    assert.match(prompt, /SOURCE chunk-1/);
    assert.match(prompt, /MISMA MARCA/);
    assert.doesNotMatch(prompt, /50\.000/);
});
