import test from "node:test";
import assert from "node:assert/strict";

import { isTechnicalRagOperational, type RagCoverageSnapshot } from "../lib/cerebro-v2/health-status";

const complete: RagCoverageSnapshot = {
    status: "idle", indexablePages: 10, pagesWithVectors: 10, currentChunks: 42,
    totalPdfDocuments: 4, matchedDocuments: 4, readyDocuments: 4, dimensions: 1024,
};

test("does not call RAG operational when the catalog is only partially indexed", () => {
    assert.equal(isTechnicalRagOperational({ ...complete, matchedDocuments: 3 }), false);
    assert.equal(isTechnicalRagOperational({ ...complete, pagesWithVectors: 9 }), false);
    assert.equal(isTechnicalRagOperational({ ...complete, status: "pending" }), false);
});

test("calls RAG operational only with complete 1024-dimensional coverage", () => {
    assert.equal(isTechnicalRagOperational(complete), true);
    assert.equal(isTechnicalRagOperational({ ...complete, dimensions: 384 }), false);
    assert.equal(isTechnicalRagOperational({ ...complete, currentChunks: 0 }), false);
});
