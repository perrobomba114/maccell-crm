import assert from "node:assert/strict";
import test from "node:test";

import {
    DEFAULT_LOCAL_CEREBRO_MODEL,
    parseLocalModelConfig,
    providerOrder,
} from "@/lib/cerebro-v2/local-provider";

test("uses the configured local endpoint before Groq", () => {
    assert.deepEqual(providerOrder({ baseUrl: "http://100.71.184.125:8000/v1", hasGroq: true }), ["local", "groq"]);
});

test("rejects a public local model endpoint", () => {
    assert.throws(() => parseLocalModelConfig({ baseUrl: "https://public.example.com/v1" }));
});

test("defaults text and vision to the production Qwen model alias", () => {
    assert.equal(
        parseLocalModelConfig({ baseUrl: "http://100.71.184.125:8000/v1" })?.model,
        DEFAULT_LOCAL_CEREBRO_MODEL,
    );
    assert.equal(DEFAULT_LOCAL_CEREBRO_MODEL, "Qwen3.6-35B-A3B-Q4_K_M");
});
