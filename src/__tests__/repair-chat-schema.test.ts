import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");

test("defines one lazy chat per repair with messages and read cursors", () => {
    assert.match(schema, /model RepairChat \{/);
    assert.match(schema, /repairId\s+String\s+@unique/);
    assert.match(schema, /model RepairChatMessage \{/);
    assert.match(schema, /clientRequestId\s+String/);
    assert.match(schema, /@@unique\(\[senderId, clientRequestId\]\)/);
    assert.match(schema, /replyToId\s+String\?/);
    assert.match(schema, /model RepairChatReadCursor \{/);
    assert.match(schema, /@@unique\(\[chatId, userId\]\)/);
    assert.match(schema, /onDelete: Cascade/);
});
