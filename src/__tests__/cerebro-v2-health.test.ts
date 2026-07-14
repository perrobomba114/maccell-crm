import assert from "node:assert/strict";
import test from "node:test";

import { checkCerebroHealth } from "@/lib/cerebro-v2/health";

test("reports a degraded dependency without leaking its internal error", async () => {
    const health = await checkCerebroHealth({
        rag: async () => true,
        worker: async () => {
            throw new Error("secret.internal:8080 refused");
        },
        textProvider: () => true,
        visionProvider: () => true,
    });

    assert.equal(health.overall, "degraded");
    assert.deepEqual(health.worker, { ok: false, message: "Worker RAG no disponible" });
    assert.equal(JSON.stringify(health).includes("secret.internal"), false);
});

test("reports healthy when every required dependency responds", async () => {
    const health = await checkCerebroHealth({
        rag: async () => true,
        worker: async () => true,
        textProvider: () => true,
        visionProvider: () => true,
    });

    assert.equal(health.overall, "healthy");
});
