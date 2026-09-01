import assert from "node:assert/strict";
import test from "node:test";

import {
    applyQwenGroqSettings,
    buildGroqModelPlan,
    GROQ_KIMI_MODEL,
    GROQ_QWEN_MODEL,
    GROQ_VISION_FALLBACK_MODEL,
} from "@/lib/cerebro-v2/model-routing";

test("tries every Groq key with Qwen before moving to the text fallback", () => {
    const plan = buildGroqModelPlan(["key-1", "key-2"], "text");

    assert.deepEqual(plan.map(({ modelId, apiKey }) => [modelId, apiKey]), [
        [GROQ_QWEN_MODEL.id, "key-1"],
        [GROQ_QWEN_MODEL.id, "key-2"],
        [GROQ_KIMI_MODEL.id, "key-1"],
        [GROQ_KIMI_MODEL.id, "key-2"],
    ]);
});

test("tries every Groq key with Qwen before Llama Scout for vision", () => {
    const plan = buildGroqModelPlan(["key-1", "key-2"], "vision");

    assert.deepEqual(plan.map(({ modelId, apiKey }) => [modelId, apiKey]), [
        [GROQ_QWEN_MODEL.id, "key-1"],
        [GROQ_QWEN_MODEL.id, "key-2"],
        [GROQ_VISION_FALLBACK_MODEL.id, "key-1"],
        [GROQ_VISION_FALLBACK_MODEL.id, "key-2"],
    ]);
});

test("diagnosis enhancement uses only Qwen across the Groq key pool", () => {
    const plan = buildGroqModelPlan(["key-1", "key-2"], "diagnosis");

    assert.equal(GROQ_QWEN_MODEL.id, "qwen/qwen3.8-27b");
    assert.deepEqual(plan.map(({ modelId }) => modelId), [GROQ_QWEN_MODEL.id, GROQ_QWEN_MODEL.id]);
});

test("caps Qwen output without inflating short diagnosis requests", () => {
    const transformed = applyQwenGroqSettings({
        prompt: [],
        maxOutputTokens: 500,
        temperature: 0,
        topP: 0.2,
        providerOptions: { groq: { serviceTier: "on_demand" } },
    });

    assert.equal(transformed.temperature, 0.6);
    assert.equal(transformed.topP, 0.95);
    assert.equal(transformed.maxOutputTokens, 500);
    assert.deepEqual(transformed.providerOptions?.groq, {
        serviceTier: "on_demand",
        reasoningEffort: "default",
        reasoningFormat: "hidden",
    });
});

test("caps oversized Qwen requests at 2048 output tokens", () => {
    const transformed = applyQwenGroqSettings({ prompt: [], maxOutputTokens: 4096 });

    assert.equal(transformed.maxOutputTokens, 2048);
});
