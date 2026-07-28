import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { repairChatEventSchema } from "../lib/repair-chat/realtime";

test("realtime events contain routing metadata but no private message content", () => {
    const event = repairChatEventSchema.parse({
        eventId: "550e8400-e29b-41d4-a716-446655440000",
        type: "message.created",
        repairId: "repair-1",
        branchId: "branch-1",
        assignedUserId: "tech-1",
        occurredAt: "2026-07-28T04:00:00.000Z",
    });
    assert.equal("content" in event, false);
    assert.equal("imageUrls" in event, false);
});

test("SSE route authenticates and disables proxy buffering", () => {
    const source = readFileSync(new URL("../app/api/repair-chats/events/route.ts", import.meta.url), "utf8");
    assert.match(source, /getCurrentUser\(\)/);
    assert.match(source, /text\/event-stream/);
    assert.match(source, /X-Accel-Buffering/);
    assert.match(source, /request\.signal/);
});
