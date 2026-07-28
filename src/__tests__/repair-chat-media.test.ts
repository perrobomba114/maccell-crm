import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isSafeRepairChatImageName } from "../lib/repair-chat/media";

test("accepts generated image names and rejects traversal", () => {
    assert.equal(isSafeRepairChatImageName("550e8400-e29b-41d4-a716-446655440000.jpg"), true);
    assert.equal(isSafeRepairChatImageName("../secret.jpg"), false);
    assert.equal(isSafeRepairChatImageName("file.svg"), false);
});

test("generic upload route blocks private chat media", () => {
    const source = readFileSync(new URL("../app/api/uploads/[...path]/route.ts", import.meta.url), "utf8");
    assert.match(source, /filePathArray\[0\] === "repair-chat"/);
});
