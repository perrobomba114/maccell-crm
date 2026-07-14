import assert from "node:assert/strict";
import test from "node:test";

import { requestQueryEmbedding } from "../lib/cerebro-v2/worker-client";

test("accepts only finite BGE-M3 vectors with 1024 dimensions", async () => {
    process.env.RAG_INTERNAL_API_SECRET = "test-secret";
    const embedding = await requestQueryEmbedding("no enciende", async () => Response.json({ embedding: Array(1024).fill(0.1) }));
    assert.equal(embedding.length, 1024);
});

test("rejects an embedding with legacy dimensions", async () => {
    process.env.RAG_INTERNAL_API_SECRET = "test-secret";
    await assert.rejects(
        requestQueryEmbedding("no carga", async () => Response.json({ embedding: Array(384).fill(0.1) })),
        /invalid embedding/,
    );
});
