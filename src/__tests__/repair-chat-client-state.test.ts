import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const provider = readFileSync(new URL("../components/repair-chat/repair-chat-provider.tsx", import.meta.url), "utf8");

test("keeps one event stream and does not use polling", () => {
    assert.equal(provider.match(/new EventSource/g)?.length, 1);
    assert.doesNotMatch(provider, /setInterval/);
    assert.doesNotMatch(provider, /state\.selected, userId/);
});

test("marks new messages read only while the selected conversation is open", () => {
    assert.match(provider, /openRef\.current/);
    assert.match(provider, /event\.type === "message\.created" && openRef\.current/);
    assert.match(provider, /markAsRead = true/);
});

test("queues a compact preview without changing the selected repair", () => {
    assert.match(provider, /type: "preview"/);
    assert.match(provider, /latest\.sender\.id !== userId/);
    assert.doesNotMatch(provider, /dispatch\(\{ type: "select"[^}]*payload\.repairId/);
});
