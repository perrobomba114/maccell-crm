/**
 * MACCELL Cerebro RAG — Búsqueda Semántica de Reparaciones
 *
 * Usa pgvector para encontrar reparaciones históricas similares
 * al problema actual y las inyecta como contexto en el prompt de Cerebro.
 *
 * NOTA: Este módulo NO lleva "use server" — es un módulo de server-side puro
 * importado desde API Routes, no desde componentes de cliente.
 */

import pg from 'pg';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://100.110.53.47:11434';

// Pool de conexión reutilizable (singleton)
let pool: pg.Pool | null = null;
function getPool() {
    if (!pool) {
        pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    }
    return pool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vectorizar una consulta con nomic-embed-text
// ─────────────────────────────────────────────────────────────────────────────
async function embedQuery(text: string): Promise<number[] | null> {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'nomic-embed-text', input: text }),
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.embeddings?.[0] ?? null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
export interface SimilarRepair {
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    contentText: string;
    similarity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Buscar reparaciones similares por similitud coseno en pgvector
// ─────────────────────────────────────────────────────────────────────────────
export async function findSimilarRepairs(
    userMessage: string,
    limit = 3,
    minSimilarity = 0.72
): Promise<SimilarRepair[]> {
    const embedding = await embedQuery(userMessage);
    if (!embedding) return [];

    try {
        const vectorStr = `[${embedding.join(',')}]`;
        const result = await getPool().query<SimilarRepair>(
            `SELECT
                "ticketNumber",
                "deviceBrand",
                "deviceModel",
                "contentText",
                1 - (embedding <=> $1::vector) AS similarity
            FROM repair_embeddings
            WHERE 1 - (embedding <=> $1::vector) >= $2
            ORDER BY embedding <=> $1::vector
            LIMIT $3`,
            [vectorStr, minSimilarity, limit]
        );
        return result.rows;
    } catch (err: any) {
        if (err.message?.includes('vector') || err.message?.includes('repair_embeddings')) {
            console.warn('[RAG] pgvector no está disponible aún. Cerebro funciona sin RAG.');
        } else {
            console.error('[RAG] Error en búsqueda semántica:', err.message);
        }
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatear resultados como contexto para el prompt de Cerebro
// ─────────────────────────────────────────────────────────────────────────────
export function formatRAGContext(repairs: SimilarRepair[]): string {
    if (repairs.length === 0) return '';

    const lines = repairs.map((r, i) =>
        `[Caso ${i + 1} — ${r.deviceBrand} ${r.deviceModel} | Ticket: ${r.ticketNumber} | Similitud: ${Math.round(r.similarity * 100)}%]\n${r.contentText}`
    );

    return `\n\n### 📂 BASE DE DATOS MACCELL — CASOS SIMILARES ENCONTRADOS:\n${lines.join('\n\n')}\n\nUsá estos casos reales como referencia principal para el diagnóstico. Si son relevantes, mencioná el número de ticket.`;
}
