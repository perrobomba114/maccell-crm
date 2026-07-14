import assert from "node:assert/strict";
import test from "node:test";

import { parseCerebroChatRequest } from "@/lib/cerebro-v2/chat-contract";

const sessionId = "4aefc8c0-31f4-4b6c-bf43-c8fb277d547f";

test("rejects a technical query without a model before persistence", () => {
    const result = parseCerebroChatRequest({
        sessionId,
        clientMessageId: "message-1",
        messages: [{ role: "user", parts: [{ type: "text", text: "No enciende" }] }],
        deviceContext: { brand: "Samsung", model: "" },
    });

    assert.equal(result.success, false);
    if (!result.success) {
        assert.equal(result.error, "Seleccioná marca y modelo antes de consultar");
    }
});

test("accepts a same-device technical query", () => {
    const result = parseCerebroChatRequest({
        sessionId,
        clientMessageId: "message-2",
        messages: [{ role: "user", parts: [{ type: "text", text: "Consume 0,08 A fijo" }] }],
        deviceContext: { brand: "Samsung", model: "SM-A405FN" },
    });

    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.data.deviceContext.model, "SM-A405FN");
    }
});

test("rejects PDF uploads in the unified technical chat", () => {
    const result = parseCerebroChatRequest({
        sessionId,
        clientMessageId: "message-3",
        messages: [{
            role: "user",
            parts: [{ type: "file", mediaType: "application/pdf", url: "data:application/pdf;base64,AAAA" }],
        }],
        deviceContext: { brand: "Samsung", model: "SM-A405FN" },
    });

    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.error, "Solo se pueden adjuntar imágenes");
});
