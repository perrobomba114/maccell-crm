/**
 * MACCELL Cerebro RAG — Búsqueda Semántica Optimizada
 */

import pg from 'pg';
import { generateEmbedding, calculateSimilarity } from '@/lib/local-embeddings';

// Pool de conexión reutilizable (singleton)
let pool: pg.Pool | null = null;
function getPool() {
    if (!pool) {
        pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    }
    return pool;
}

export interface SimilarRepair {
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    contentText: string;
    similarity: number;
}

/**
 * Divide un texto largo en pedazos (chunks) para mejor procesamiento de embeddings
 */
export function chunkText(text: string, chunkSize = 800, overlap = 80): string[] {
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = start + chunkSize;
        chunks.push(text.slice(start, end));
        start += (chunkSize - overlap);
    }

    return chunks;
}

/**
 * Búsqueda semántica principal — pgvector (Optimizado con Dot Product en SQL)
 */
export async function findSimilarRepairs(
    userMessage: string,
    limit = 5,
    minSimilarity = 0.65
): Promise<SimilarRepair[]> {

    const embedding = await generateEmbedding(userMessage);
    if (!embedding) {
        console.warn('[RAG] No se pudo generar embedding.');
        return [];
    }

    // ── Intento 1: pgvector ──────────────────────────────────────────────────
    try {
        const vectorStr = `[${embedding.join(',')}]`;
        // Usamos el operador <=> para similitud coseno (distancia)
        // O <#> para producto punto (negativo), que es más rápido si están normalizados
        const result = await getPool().query<SimilarRepair>(
            `SELECT
                "ticketNumber",
                "deviceBrand",
                "deviceModel",
                "contentText",
                1 - (embedding <=> $1::vector) AS similarity
            FROM repair_embeddings
            WHERE 1 - (embedding <=> $1::vector) >= $2
            ORDER BY embedding <=> $1::vector ASC
            LIMIT $3`,
            [vectorStr, minSimilarity, limit]
        );

        if (result.rows.length > 0) {
            console.log(`[RAG] 🎯 pgvector: ${result.rows.length} hallados.`);
            return result.rows;
        }
    } catch (err: any) {
        console.warn('[RAG] pgvector error/no disponible:', err.message.slice(0, 50));
    }

    // ── Fallback: Brute-force en memoria (Optimizado con Producto Punto) ──────
    try {
        const { db } = await import('@/lib/db');

        // Traemos los últimos registros de conocimiento para comparar
        const knowledgeItems = await (db as any).repairKnowledge.findMany({
            take: 150,
            orderBy: { createdAt: 'desc' },
        });

        if (!knowledgeItems || knowledgeItems.length === 0) return [];

        const results: SimilarRepair[] = [];

        // Procesamiento en paralelo para mayor velocidad
        await Promise.all(knowledgeItems.map(async (item: any) => {
            const itemText = `${item.deviceBrand} ${item.deviceModel} ${item.title} ${item.content}`;
            const chunks = chunkText(itemText, 600, 60);

            // Evaluamos el mejor chunk de cada item
            let bestSim = 0;
            for (const chunk of chunks) {
                const itemEmbed = await generateEmbedding(chunk);
                if (!itemEmbed) continue;

                const sim = calculateSimilarity(embedding, itemEmbed);
                if (sim > bestSim) bestSim = sim;
            }

            if (bestSim >= minSimilarity) {
                results.push({
                    ticketNumber: item.id,
                    deviceBrand: item.deviceBrand,
                    deviceModel: item.deviceModel,
                    contentText: `${item.title}\n${item.content}`,
                    similarity: bestSim,
                });
            }
        }));

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

    } catch (err: any) {
        console.error('[RAG] Error en fallback:', err.message);
        return [];
    }
}

/**
 * Búsqueda rápida por texto (Complementaria)
 */
export async function findKnowledgeByText(
    terms: string[],
    limit = 3
): Promise<{ brand: string; model: string; title: string; content: string }[]> {
    try {
        const { db } = await import('@/lib/db');
        const conditions = terms.filter(t => t.length > 2).map(term => ({
            OR: [
                { title: { contains: term, mode: 'insensitive' as const } },
                { content: { contains: term, mode: 'insensitive' as const } },
                { deviceModel: { contains: term, mode: 'insensitive' as const } },
                { deviceBrand: { contains: term, mode: 'insensitive' as const } },
            ]
        }));

        if (conditions.length === 0) return [];

        const rows = await (db as any).repairKnowledge.findMany({
            where: { OR: conditions },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return rows.map((r: any) => ({
            brand: r.deviceBrand,
            model: r.deviceModel,
            title: r.title,
            content: r.content,
        }));
    } catch (err: any) {
        return [];
    }
}

/**
 * Formateador de contexto para el prompt
 */
export function formatRAGContext(repairs: SimilarRepair[]): string {
    if (repairs.length === 0) return '';

    const lines = repairs.map((r, i) =>
        `[Caso ${i + 1} — ${r.deviceBrand} ${r.deviceModel} | Score: ${Math.round(r.similarity * 100)}%]\n${r.contentText}`
    );

    return `\n\n### 📂 BASE DE CONOCIMIENTO TÉCNICA (MACCELL):\n${lines.join('\n\n')}\n\n⚠️ Cerebro: Prioriza las soluciones de estos casos reales sobre cualquier otra suposición general.`;
}
