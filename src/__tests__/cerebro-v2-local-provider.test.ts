import assert from "node:assert/strict";
import test from "node:test";

import { parseLocalModelConfig, providerOrder } from "@/lib/cerebro-v2/local-provider";

test("uses the configured local endpoint before Groq", () => {
    assert.deepEqual(providerOrder({ baseUrl: "http://100.71.184.125:8000/v1", hasGroq: true }), ["local", "groq"]);
});

test("rejects a public local model endpoint", () => {
    assert.throws(() => parseLocalModelConfig({ baseUrl: "https://public.example.com/v1" }));
});
