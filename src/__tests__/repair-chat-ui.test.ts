import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(`../components/repair-chat/${name}`, import.meta.url), "utf8");

test("chat widget exposes a movable accessible launcher and repair search", () => {
    const widget = read("repair-chat-widget.tsx");
    const inbox = read("repair-chat-inbox.tsx");
    assert.match(widget, /aria-label="Abrir chat interno de reparaciones"/);
    assert.match(widget, /drag/);
    assert.match(widget, /maccell:repair-chat-position:v1/);
    assert.match(inbox, /Buscar reparación/);
    assert.match(inbox, /Archivados/);
});

test("thread supports replies, images, receipts and archived read-only mode", () => {
    const thread = read("repair-chat-thread.tsx");
    const composer = read("repair-chat-composer.tsx");
    assert.match(thread, /Responder/);
    assert.match(thread, /Leído/);
    assert.match(thread, /solo lectura/);
    assert.match(composer, /accept="image\/jpeg,image\/png,image\/webp"/);
    assert.match(thread, /backToInbox/);
    assert.doesNotMatch(thread, /location\.reload/);
});
