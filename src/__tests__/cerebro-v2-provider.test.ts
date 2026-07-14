import assert from "node:assert/strict";
import test from "node:test";

import { selectCerebroProvider } from "../lib/cerebro-v2/provider";

test("tries every Groq key before OpenRouter without exposing secrets", async () => {
    const attempts: string[] = [];
    const selected = await selectCerebroProvider(
        ["groq-secret-one", "groq-secret-two"],
        "openrouter-secret",
        async (provider) => {
            attempts.push(provider.kind);
            if (provider.kind === "groq") throw new Error(`failed ${provider.apiKey}`);
        },
    );

    assert.equal(selected.kind, "openrouter");
    assert.deepEqual(attempts, ["groq", "groq", "openrouter"]);
    assert.equal(selected.maxRetries, 0);
    assert.doesNotMatch(selected.label, /secret/);
});

test("stops after the first healthy Groq key", async () => {
    let probes = 0;
    const selected = await selectCerebroProvider(["key-one", "key-two"], undefined, async () => {
        probes += 1;
    });
    assert.equal(selected.kind, "groq");
    assert.equal(probes, 1);
});
