import assert from "node:assert/strict";
import test from "node:test";

import { getRepairChatMessageStyle } from "../lib/repair-chat/message-style";

test("uses green message bubbles for vendors", () => {
    const style = getRepairChatMessageStyle("VENDOR");
    assert.match(style.bubble, /bg-emerald-600/);
    assert.match(style.bubble, /text-white/);
});

test("uses blue message bubbles for technicians", () => {
    const style = getRepairChatMessageStyle("TECHNICIAN");
    assert.match(style.bubble, /bg-blue-600/);
    assert.match(style.bubble, /text-white/);
});

test("uses bordered black message bubbles for administrators", () => {
    const style = getRepairChatMessageStyle("ADMIN");
    assert.match(style.bubble, /bg-black/);
    assert.match(style.bubble, /border-zinc-500/);
    assert.match(style.bubble, /text-white/);
});
