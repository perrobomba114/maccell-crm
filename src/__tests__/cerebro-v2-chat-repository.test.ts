import assert from "node:assert/strict";
import test from "node:test";

import {
    createChatRepository,
    type ChatQueryAdapter,
} from "@/lib/cerebro-v2/chat-repository";

test("scopes session reads and deletes to the authenticated user", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const adapter: ChatQueryAdapter = {
        query: async (sql, params) => {
            calls.push({ sql, params });
            return [];
        },
    };
    const repository = createChatRepository(adapter);

    await repository.getSession("user-7", "4aefc8c0-31f4-4b6c-bf43-c8fb277d547f");
    await repository.deleteSession("user-7", "4aefc8c0-31f4-4b6c-bf43-c8fb277d547f");

    assert.equal(calls.length, 2);
    for (const call of calls) {
        assert.match(call.sql, /user_id = \$1/);
        assert.equal(call.params[0], "user-7");
    }
});

test("stores a message idempotently by client message id", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const adapter: ChatQueryAdapter = {
        query: async (sql, params) => {
            calls.push({ sql, params });
            return [];
        },
    };
    const repository = createChatRepository(adapter);

    await repository.appendMessage({
        userId: "user-9",
        sessionId: "4aefc8c0-31f4-4b6c-bf43-c8fb277d547f",
        clientMessageId: "client-1",
        role: "user",
        content: "No enciende",
        attachments: [],
        sources: [],
        promptVersion: null,
        provider: null,
        metadata: {},
    });

    assert.match(calls[0]?.sql ?? "", /ON CONFLICT \(session_id, client_message_id\) DO NOTHING/);
    assert.equal(calls[0]?.params[0], "user-9");
});

test("creates a chat session linked to a real repair", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const repository = createChatRepository({
        query: async (sql, params) => {
            calls.push({ sql, params });
            return [];
        },
    });

    await repository.createSession({
        userId: "tech-1",
        repairId: "repair-9",
        ticketNumber: "MAC1-99",
        brand: "SAMSUNG",
        model: "SM-A125M",
    });

    assert.match(calls[0]?.sql ?? "", /repair_id/);
    assert.deepEqual(calls[0]?.params, ["tech-1", "repair-9", "MAC1-99", "SAMSUNG", "SM-A125M"]);
});

test("persists guided metadata with each message", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const repository = createChatRepository({
        query: async (sql, params) => {
            calls.push({ sql, params });
            return [];
        },
    });

    await repository.appendMessage({
        userId: "tech-1",
        sessionId: "4aefc8c0-31f4-4b6c-bf43-c8fb277d547f",
        clientMessageId: "assistant-1",
        role: "assistant",
        content: "¿Qué consumo muestra?",
        attachments: [],
        sources: [],
        promptVersion: "v3",
        provider: "groq",
        metadata: {
            guidedQuestion: {
                id: "q-1",
                prompt: "¿Qué consumo muestra?",
                measurement: "Consumo",
                conditions: "Fuente limitada",
                options: [],
                sourceDocumentIds: [],
                allowFreeText: true,
            },
        },
    });

    assert.match(calls[0]?.sql ?? "", /metadata/);
    assert.match(String(calls[0]?.params.at(-1)), /guidedQuestion/);
});
