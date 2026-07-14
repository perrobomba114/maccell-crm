import assert from "node:assert/strict";
import test from "node:test";

import { buildCerebroSystemPrompt } from "@/lib/cerebro-v2/prompt";
import type { CerebroSource } from "@/lib/cerebro-v2/types";

test("SM-A405FN diagnostic context is exact, actionable and safe", () => {
  const sources: CerebroSource[] = [{
    chunkId: "79b11e1b-68aa-4f3c-93a3-017eff6db229",
    documentId: "71e3c55b-beb5-414f-bec8-320a8cf92844",
    sourceType: "PDF",
    authority: "TECHNICAL_DOCUMENT",
    brand: "SAMSUNG",
    model: "SM-A405FN",
    title: "SM-A405FN Manual de Servicio",
    pageNumber: 37,
    content: "Secuencia de alimentación. Registro 4f71d47b-b785-4abf-a375-c1bd02a2db67. Costo $ 99.999.",
    score: 0.96,
  }];

  const prompt = buildCerebroSystemPrompt("SAMSUNG", "SM-A405FN", sources);

  assert.match(prompt, /DISPOSITIVO: SAMSUNG SM-A405FN/);
  assert.match(prompt, /"pageNumber":37/);
  assert.match(prompt, /punto de prueba, instrumento\/escala y valor o comportamiento esperado/i);
  assert.match(prompt, /## CRITERIO DE DECISIÓN/);
  assert.doesNotMatch(prompt, /[0-9a-f]{8}-[0-9a-f-]{27}/i);
  assert.doesNotMatch(prompt, /99\.999/);
});
