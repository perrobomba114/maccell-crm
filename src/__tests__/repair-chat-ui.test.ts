import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(`../components/repair-chat/${name}`, import.meta.url), "utf8");

test("chat widget exposes a movable accessible launcher and repair search", () => {
    const widget = read("repair-chat-widget.tsx");
    const inbox = read("repair-chat-inbox.tsx");
    const newPanel = read("repair-chat-new-panel.tsx");
    const thread = read("repair-chat-thread.tsx");
    assert.match(widget, /aria-label="Abrir chat interno de reparaciones"/);
    assert.match(widget, /drag/);
    assert.match(widget, /maccell:repair-chat-position:v1/);
    assert.match(widget, /preview\.ticketNumber/);
    assert.match(widget, /preview\.sender/);
    assert.match(inbox, /Archivados/);
    assert.match(inbox, /Cargar más chats/);
    assert.match(inbox, /Nuevo chat/);
    assert.match(newPanel, /Reparaciones disponibles/);
    assert.match(newPanel, /repair\.chat \? "Continuar" : "Iniciar"/);
    assert.match(newPanel, /Buscar por número, cliente o equipo/);
    assert.match(thread, /Nuevo chat/);
    assert.match(thread, /setNewChatOpen\(true\)/);
    assert.match(widget, /newChatOpen/);
    assert.match(widget, /RepairChatNewPanel/);
    assert.match(widget, /sm:w-\[820px\]/);
    const provider = read("repair-chat-provider.tsx");
    assert.match(provider, /newChatOpen/);
    assert.match(provider, /setNewChatOpen/);
    assert.doesNotMatch(provider, /if \(!query\.trim\(\)\) return dispatch/);
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
    assert.match(thread, /message\.readBySomeone/);
    assert.match(thread, /readers/);
    assert.match(thread, /Quién lo leyó/);
    assert.match(thread, /Cargar mensajes anteriores/);
    assert.match(thread, /Todavía no hay mensajes/);
    assert.match(thread, /currentUserId/);
    assert.match(composer, /onKeyDown/);
    assert.match(composer, /event\.key === "Enter"/);
    assert.match(composer, /!event\.shiftKey/);
    assert.match(composer, /event\.nativeEvent\.isComposing/);
    assert.match(composer, /aria-label="Enviar mensaje"/);
    assert.match(composer, /min-w-0/);
});

test("chat and header use different sounds at reduced volumes", () => {
    const provider = read("repair-chat-provider.tsx");
    const notificationBell = readFileSync(new URL("../components/ui/notification-bell.tsx", import.meta.url), "utf8");
    assert.match(provider, /chat\.mp3/);
    assert.match(provider, /CHAT_NOTIFICATION_VOLUME = 0\.3/);
    assert.doesNotMatch(provider, /new Audio\("\/notificacion\.mp3"\)/);
    assert.match(notificationBell, /HEADER_NOTIFICATION_VOLUME = 0\.45/);
    assert.doesNotMatch(notificationBell, /audio\.volume = 0\.6/);
});
