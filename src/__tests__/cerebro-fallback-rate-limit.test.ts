import assert from "node:assert/strict";
import test from "node:test";

import { createFallbackModel } from "@/lib/cerebro/models";

test("does not hammer the remaining Groq keys after an organization rate limit", async () => {
    const attempts: string[] = [];
    const rateLimited = {
        doGenerate: async () => {
            attempts.push("groq-1");
            throw Object.assign(new Error("rate limited"), { statusCode: 429 });
        },
        doStream: async () => {
            throw new Error("not used");
        },
    };
    const secondGroq = {
        doGenerate: async () => {
            attempts.push("groq-2");
            throw new Error("should not be called");
        },
        doStream: async () => {
            throw new Error("not used");
        },
    };
    const local = {
        doGenerate: async () => {
            attempts.push("local");
            return { finishReason: "stop" };
        },
        doStream: async () => {
            throw new Error("not used");
        },
    };

    const fallback = createFallbackModel([
        { instance: rateLimited, label: "Qwen 3.8", keyId: "groq-1", modelId: "qwen/qwen3.8-27b" },
        { instance: secondGroq, label: "Qwen 3.8", keyId: "groq-2", modelId: "qwen/qwen3.8-27b" },
        { instance: local, label: "Qwen local", keyId: "local", modelId: "local" },
    ], () => undefined);

    await fallback.doGenerate({});

    assert.deepEqual(attempts, ["groq-1", "local"]);
});
