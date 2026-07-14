import assert from "node:assert/strict";
import test from "node:test";

import { parseCerebroChatRequest } from "@/lib/cerebro-v2/chat-contract";

const sessionId = "4aefc8c0-31f4-4b6c-bf43-c8fb277d547f";

test("accepts a query without client-controlled device identity", () => {
    const result = parseCerebroChatRequest({
        sessionId,
        clientMessageId: "message-1",
        messages: [{ role: "user", parts: [{ type: "text", text: "No enciende" }] }],
    });

    assert.equal(result.success, true);
});

test("drops a manipulated device identity sent by an old client", () => {
    const result = parseCerebroChatRequest({
        sessionId,
        clientMessageId: "message-2",
        messages: [{ role: "user", parts: [{ type: "text", text: "Consume 0,08 A fijo" }] }],
        deviceContext: { brand: "Apple", model: "IPHONE 15" },
    });

    assert.equal(result.success, true);
    if (result.success) {
        assert.equal("deviceContext" in result.data, false);
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
    });

    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.error, "Solo se pueden adjuntar imágenes");
});

test("accepts a structured answer to the pending guided question", () => {
    const result = parseCerebroChatRequest({
        sessionId,
        clientMessageId: "message-4",
        messages: [{ role: "user", parts: [{ type: "text", text: "Pulso y vuelve a cero" }] }],
        guidedAnswer: { questionId: "question-1", optionId: "pulse-zero" },
    });

    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.guidedAnswer?.optionId, "pulse-zero");
});
