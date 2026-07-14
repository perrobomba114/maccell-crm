import assert from "node:assert/strict";
import test from "node:test";

import { cerebroInitialState, cerebroUiReducer } from "@/lib/cerebro-v2/ui-state";

test("starts with a clean V2 history and no legacy panel", () => {
    assert.deepEqual(cerebroInitialState.sessions, []);
    assert.equal(cerebroInitialState.activeSessionId, null);
    assert.equal("wikiOpen" in cerebroInitialState, false);
});

test("opens an inline PDF citation at its exact page", () => {
    const state = cerebroUiReducer(cerebroInitialState, {
        type: "open-source",
        source: {
            documentId: "doc-7",
            sourceType: "PDF",
            authority: "TECHNICAL_DOCUMENT",
            brand: "SAMSUNG",
            model: "SM-A405FN",
            title: "Manual",
            pageNumber: 7,
            excerpt: "VBAT",
        },
    });

    assert.equal(state.activeSource?.pageNumber, 7);
    assert.equal(state.sourcePanelOpen, true);
});
