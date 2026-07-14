import assert from "node:assert/strict";
import test from "node:test";

import { formatExternalResearch, needsExternalResearch } from "@/lib/cerebro-v2/external-research";

test("uses external research only without sufficiently strong local evidence", () => {
    assert.equal(needsExternalResearch([]), true);
    assert.equal(needsExternalResearch([{ authority: "TECHNICAL_DOCUMENT", score: 0.8 } as never]), false);
});

test("labels external sources as unverified", () => {
    const text = formatExternalResearch([{ title: "Prueba", url: "https://example.com", snippet: "Medir primero", provider: "Google" }]);
    assert.match(text ?? "", /NO_VERIFICADAS/);
    assert.match(text ?? "", /https:\/\/example.com/);
});
