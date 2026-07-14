import assert from "node:assert/strict";
import test from "node:test";

import type { CerebroSource } from "@/lib/cerebro-v2/types";
import { shouldLoadVisualEvidence } from "@/lib/cerebro-v2/visual-evidence";

const schematic: CerebroSource = {
    chunkId: "chunk-1",
    documentId: "document-1",
    sourceType: "PDF",
    authority: "TECHNICAL_DOCUMENT",
    brand: "SAMSUNG",
    model: "SM-A035",
    title: "SM-A035 plano esquemático completo",
    pageNumber: 19,
    content: "Confidential service guide. U1400 Digital Baseband Processor and interface signals.",
    score: 1,
};

test("loads schematic pages into vision even when OCR text looks readable", () => {
    assert.equal(shouldLoadVisualEvidence(schematic), true);
});

test("does not load an ordinary text repair into vision", () => {
    assert.equal(shouldLoadVisualEvidence({ ...schematic, sourceType: "REPAIR", pageNumber: null }), false);
});
