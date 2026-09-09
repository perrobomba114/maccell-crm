import assert from "node:assert/strict";
import test from "node:test";

import { createFallbackModel } from "@/lib/cerebro/models";

function waitForAbort(params: unknown): Promise<never> {
    assert.ok(params && typeof params === "object" && "abortSignal" in params);
    const signal = params.abortSignal;
    assert.ok(signal instanceof AbortSignal);
    return new Promise((_, reject) => {
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
}

const unusedStream = async () => ({ stream: new ReadableStream<Record<string, unknown>>() });

test("provider timeout preserves the request budget for the next model", async () => {
    const attempts: string[] = [];
    const request = new AbortController();
    const deadline = setTimeout(() => request.abort(new Error("global deadline reached")), 300);
    try {
        const fallback = createFallbackModel([
            { keyId: "slow", label: "slow", timeoutMs: 10, instance: {
                doGenerate: (params: unknown) => { attempts.push("slow"); return waitForAbort(params); }, doStream: unusedStream,
            } },
            { keyId: "ready", label: "ready", timeoutMs: 100, instance: {
                doGenerate: async (params: unknown) => {
                    attempts.push("ready");
                    assert.ok(params && typeof params === "object" && "abortSignal" in params && "maxOutputTokens" in params);
                    assert.ok(params.abortSignal instanceof AbortSignal && !params.abortSignal.aborted);
                    assert.equal(params.maxOutputTokens, 100);
                    return { finishReason: "stop", content: [{ type: "text", text: "ready" }] };
                }, doStream: unusedStream,
            } },
        ], () => undefined);
        const result = await fallback.doGenerate({ abortSignal: request.signal, maxOutputTokens: 100 });
        assert.deepEqual(attempts, ["slow", "ready"]);
        assert.equal(request.signal.aborted, false);
        assert.deepEqual(result.content, [{ type: "text", text: "ready" }]);
    } finally { clearTimeout(deadline); }
});

test("request cancellation stops generation without invoking remaining providers", async () => {
    const request = new AbortController();
    const cancellation = new Error("request cancelled");
    const attempts: string[] = [];
    const fallback = createFallbackModel([
        { keyId: "active", label: "active", timeoutMs: 1000, instance: {
            doGenerate: (params: unknown) => {
                attempts.push("active");
                queueMicrotask(() => request.abort(cancellation));
                return waitForAbort(params);
            }, doStream: unusedStream,
        } },
        { keyId: "unused", label: "unused", timeoutMs: 1000, instance: {
            doGenerate: async () => { attempts.push("unused"); return { finishReason: "stop" }; }, doStream: unusedStream,
        } },
    ], () => undefined);
    await assert.rejects(fallback.doGenerate({ abortSignal: request.signal }), error => error === cancellation);
    assert.deepEqual(attempts, ["active"]);
});

test("an already cancelled request does not select a provider", async () => {
    const request = new AbortController();
    const cancellation = new Error("already cancelled");
    request.abort(cancellation);
    const attempts: string[] = [];
    const fallback = createFallbackModel([{ keyId: "unused", label: "unused", instance: {
        doGenerate: async () => { attempts.push("unused"); return { finishReason: "stop" }; }, doStream: unusedStream,
    } }], () => attempts.push("selected"));
    await assert.rejects(fallback.doGenerate({ abortSignal: request.signal }), error => error === cancellation);
    assert.deepEqual(attempts, []);
});
