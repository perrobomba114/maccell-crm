import assert from "node:assert/strict";
import test from "node:test";

import {
    decodeRepairChatCursor,
    encodeRepairChatCursor,
    hasAnyExternalReader,
    sendRepairChatMessageSchema,
} from "../lib/repair-chat/contracts";

test("accepts trimmed text or images and rejects empty messages", () => {
    assert.equal(sendRepairChatMessageSchema.parse({
        clientRequestId: "550e8400-e29b-41d4-a716-446655440000",
        content: "  Revisar pin  ",
        imageUrls: [],
    }).content, "Revisar pin");

    assert.equal(sendRepairChatMessageSchema.safeParse({
        clientRequestId: "550e8400-e29b-41d4-a716-446655440000",
        content: "",
        imageUrls: [],
    }).success, false);
});

test("round-trips an opaque pagination cursor", () => {
    const cursor = { id: "chat-1", at: "2026-07-28T04:00:00.000Z" };
    assert.deepEqual(decodeRepairChatCursor(encodeRepairChatCursor(cursor)), cursor);
});

test("turns receipts blue after any other participant reads", () => {
    const sentAt = "2026-07-28T04:00:00.000Z";
    assert.equal(hasAnyExternalReader("sender", sentAt, [{ userId: "sender", lastReadAt: sentAt }]), false);
    assert.equal(hasAnyExternalReader("sender", sentAt, [{ userId: "vendor", lastReadAt: "2026-07-28T04:00:01.000Z" }]), true);
});
