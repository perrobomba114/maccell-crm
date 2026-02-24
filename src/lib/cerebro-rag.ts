/**
 * MACCELL Cerebro RAG — Búsqueda Semántica de Reparaciones (Cloud Ready)
 *
 * NOTA: Actualmente requiere un proveedor de embeddings (Ollama o Cloud).
 * Se ha desactivado temporalmente la conexión local para cumplir con la migración a la nube.
 */

import pg from 'pg';

// Pool de conexión reutilizable (singleton)
let pool: pg.Pool | null = null;
function getPool() {
    if (!pool) {
        pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    }
    return pool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vectorizar una consulta
// ─────────────────────────────────────────────────────────────────────────────
async function embedQuery(text: string): Promise<number[] | null> {
    // TODO: Implementar embeddings vía Gemini API o OpenAI vía OpenRouter si estuviera disponible.
    // Por ahora, devolvemos null para evitar errores de conexión local.
    return null;
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
        console.error('[RAG] Error en búsqueda semántica:', err.message);
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
