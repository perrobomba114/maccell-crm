import assert from "node:assert/strict";
import test from "node:test";

import { buildCerebroRequestBody, readCerebroApiError } from "@/lib/cerebro-v2/transport";

test("builds each request with the latest selected device", () => {
    const body = buildCerebroRequestBody({
        sessionId: "session-1",
        clientMessageId: "message-1",
        messages: [],
        brand: "Samsung",
        model: "SM-A405FN",
    });
    assert.deepEqual(body.deviceContext, { brand: "Samsung", model: "SM-A405FN" });
});

test("shows the server error instead of a generic connection error", async () => {
    const response = Response.json({ error: "Seleccioná marca y modelo antes de consultar" }, { status: 400 });
    assert.equal(await readCerebroApiError(response), "Seleccioná marca y modelo antes de consultar");
});
