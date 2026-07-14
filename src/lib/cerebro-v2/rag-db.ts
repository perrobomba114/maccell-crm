import { Pool, type QueryResultRow } from "pg";

const globalForRag = globalThis as typeof globalThis & { cerebroRagPool?: Pool };

function createRagPool(): Pool {
    const connectionString = process.env.RAG_DATABASE_URL;
    if (!connectionString) {
        throw new Error("RAG_DATABASE_URL is required");
    }
    return new Pool({
        connectionString,
        max: 10,
        statement_timeout: 1_500,
        application_name: "maccell-cerebro-v2",
    });
}

export function getRagPool(): Pool {
    globalForRag.cerebroRagPool ??= createRagPool();
    return globalForRag.cerebroRagPool;
}

export async function queryRag<TRow extends QueryResultRow>(sql: string, params: readonly unknown[]): Promise<TRow[]> {
    const result = await getRagPool().query<TRow>(sql, [...params]);
    return result.rows;
}
