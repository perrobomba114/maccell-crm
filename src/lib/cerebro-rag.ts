/**
 * MACCELL Cerebro RAG — Búsqueda Semántica Optimizada
 */

import { db } from '@/lib/db';
import { generateEmbedding, calculateSimilarity } from '@/lib/local-embeddings';

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
        if (!db) throw new Error("Database client not initialized");

        const vectorStr = `[${embedding.join(',')}]`;
        const rows = await db.$queryRawUnsafe<any[]>(
            `SELECT "ticketNumber", "deviceBrand", "deviceModel", "contentText", (1 - (embedding <=> $1::vector)) as similarity FROM "repair_embeddings" WHERE 1 - (embedding <=> $1::vector) >= $2 ORDER BY embedding <=> $1::vector ASC LIMIT $3`,
            vectorStr,
            minSimilarity,
            limit
        );

        if (rows && rows.length > 0) {
            console.log(`[RAG] 🎯 pgvector: ${rows.length} hallados.`);
            return rows.map(r => ({
                ticketNumber: r.ticketNumber,
                deviceBrand: r.deviceBrand,
                deviceModel: r.deviceModel,
                contentText: r.contentText,
                similarity: Number(r.similarity)
            }));
        }
    } catch (err: any) {
        console.warn(`[RAG] pgvector falló: ${err.message}`);
        // ── Intento 2: Fallback In-Memory sobre la tabla de embeddings ───────
        try {
            const rows = await db.$queryRawUnsafe<any[]>(
                `SELECT "ticketNumber", "deviceBrand", "deviceModel", "contentText", "embedding" FROM "repair_embeddings" LIMIT 500`
            );

            if (rows && rows.length > 0) {
                const results: SimilarRepair[] = rows.map((row: any): SimilarRepair => {
                    const rowEmbedding = typeof row.embedding === 'string'
                        ? JSON.parse(row.embedding)
                        : row.embedding;

                    return {
                        ticketNumber: row.ticketNumber,
                        deviceBrand: row.deviceBrand,
                        deviceModel: row.deviceModel,
                        contentText: row.contentText,
                        similarity: calculateSimilarity(embedding, rowEmbedding)
                    };
                })
                    .filter((r: SimilarRepair) => r.similarity >= minSimilarity)
                    .sort((a: SimilarRepair, b: SimilarRepair) => b.similarity - a.similarity)
                    .slice(0, limit);

                if (results.length > 0) return results;
            }
        } catch (memErr: any) {
            console.warn('[RAG] Fallback memoria falló:', memErr.message);
        }

        // ── Fallback: Brute-force en memoria (Optimizado con Producto Punto) ──────
        try {
            // Traemos los últimos registros de conocimiento para comparar
            const knowledgeItems = await (db as any).repairKnowledge.findMany({
                take: 100,
                orderBy: { createdAt: 'desc' },
            });

            if (knowledgeItems && knowledgeItems.length > 0) {
                const results: SimilarRepair[] = [];
                for (const item of knowledgeItems) {
                    const itemText = `${item.deviceBrand} ${item.deviceModel} ${item.title} ${item.content}`;
                    const chunks = chunkText(itemText, 600, 60);

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
                }
                if (results.length > 0) {
                    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
                }
            }
        } catch (err: any) {
            console.error('[RAG] Fallback brute-force falló:', err.message);
        }
    }

    return [];
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
        `[REFERENCIA TÉCNICA #${i + 1}]
Equipo: ${r.deviceBrand} ${r.deviceModel}
Historial: ${r.contentText}
Confianza: ${Math.round(r.similarity * 100)}%`
    );

    return `\n\n### 📂 CONOCIMIENTO TÉCNICO PROPIO (MACCELL)
Cerebro: Los siguientes casos son reparaciones REALES realizadas anteriormente en este local. 
👉 DEBES mencionar estos casos específicos en tu respuesta para que el técnico sepa que hay antecedentes.

${lines.join('\n\n')}

⚠️ INSTRUCCIÓN: Si el "Confianza" es mayor al 70%, utiliza esta información como la base principal de tu diagnóstico.`;
}
