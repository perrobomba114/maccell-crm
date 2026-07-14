import type { QueryResultRow } from "pg";

import { queryRag } from "./rag-db";
import type { CerebroPublicSource } from "./types";

export type ChatSession = {
    id: string;
    title: string;
    brand: string;
    model: string;
    createdAt: Date;
    updatedAt: Date;
};

export type ChatMessage = {
    id: string;
    clientMessageId: string;
    role: "user" | "assistant";
    content: string;
    attachments: string[];
    sources: CerebroPublicSource[];
    promptVersion: string | null;
    provider: string | null;
    createdAt: Date;
};

export type AppendChatMessageInput = {
    userId: string;
    sessionId: string;
    clientMessageId: string;
    role: ChatMessage["role"];
    content: string;
    attachments: readonly string[];
    sources: readonly CerebroPublicSource[];
    promptVersion: string | null;
    provider: string | null;
};

export type ChatQueryAdapter = {
    query<TRow extends QueryResultRow>(sql: string, params: readonly unknown[]): Promise<TRow[]>;
};

type SessionRow = QueryResultRow & ChatSession;
type MessageRow = QueryResultRow & ChatMessage;

const defaultAdapter: ChatQueryAdapter = { query: queryRag };

export function createChatRepository(adapter: ChatQueryAdapter = defaultAdapter) {
    return {
        listSessions: (userId: string) => adapter.query<SessionRow>(`
            SELECT id::text, title, brand, model,
                   created_at AS "createdAt", updated_at AS "updatedAt"
            FROM rag_chat_sessions
            WHERE user_id = $1
            ORDER BY updated_at DESC
            LIMIT 100
        `, [userId]),

        createSession: async (userId: string, brand: string, model: string) => {
            const rows = await adapter.query<SessionRow>(`
                INSERT INTO rag_chat_sessions (user_id, title, brand, model)
                VALUES ($1, 'Nuevo diagnóstico', $2, $3)
                RETURNING id::text, title, brand, model,
                          created_at AS "createdAt", updated_at AS "updatedAt"
            `, [userId, brand, model]);
            return rows[0] ?? null;
        },

        getSession: async (userId: string, sessionId: string) => {
            const rows = await adapter.query<SessionRow>(`
                SELECT id::text, title, brand, model,
                       created_at AS "createdAt", updated_at AS "updatedAt"
                FROM rag_chat_sessions
                WHERE user_id = $1 AND id = $2::uuid
                LIMIT 1
            `, [userId, sessionId]);
            return rows[0] ?? null;
        },

        listMessages: (userId: string, sessionId: string) => adapter.query<MessageRow>(`
            SELECT message.id::text, message.client_message_id AS "clientMessageId",
                   message.role, message.content, message.attachments,
                   message.sources, message.prompt_version AS "promptVersion",
                   message.provider, message.created_at AS "createdAt"
            FROM rag_chat_messages AS message
            JOIN rag_chat_sessions AS session ON session.id = message.session_id
            WHERE session.user_id = $1 AND session.id = $2::uuid
            ORDER BY message.created_at, message.id
        `, [userId, sessionId]),

        renameSession: async (userId: string, sessionId: string, title: string) => {
            const rows = await adapter.query<SessionRow>(`
                UPDATE rag_chat_sessions
                SET title = $3, updated_at = now()
                WHERE user_id = $1 AND id = $2::uuid
                RETURNING id::text, title, brand, model,
                          created_at AS "createdAt", updated_at AS "updatedAt"
            `, [userId, sessionId, title.slice(0, 80)]);
            return rows[0] ?? null;
        },

        deleteSession: (userId: string, sessionId: string) => adapter.query<QueryResultRow>(`
            DELETE FROM rag_chat_sessions
            WHERE user_id = $1 AND id = $2::uuid
            RETURNING id
        `, [userId, sessionId]),

        appendMessage: (input: AppendChatMessageInput) => adapter.query<QueryResultRow>(`
            INSERT INTO rag_chat_messages (
                session_id, client_message_id, role, content, attachments,
                sources, prompt_version, provider
            )
            SELECT session.id, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9
            FROM rag_chat_sessions AS session
            WHERE session.user_id = $1 AND session.id = $2::uuid
            ON CONFLICT (session_id, client_message_id) DO NOTHING
            RETURNING id
        `, [
            input.userId,
            input.sessionId,
            input.clientMessageId,
            input.role,
            input.content,
            JSON.stringify(input.attachments),
            JSON.stringify(input.sources),
            input.promptVersion,
            input.provider,
        ]),

        touchSession: (userId: string, sessionId: string, brand: string, model: string, title?: string) =>
            adapter.query<QueryResultRow>(`
                UPDATE rag_chat_sessions
                SET brand = $3, model = $4, updated_at = now(),
                    title = COALESCE($5, title)
                WHERE user_id = $1 AND id = $2::uuid
                RETURNING id
            `, [userId, sessionId, brand, model, title ?? null]),
    };
}

export const cerebroChatRepository = createChatRepository();
