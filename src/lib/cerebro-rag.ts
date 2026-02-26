/**
 * MACCELL Cerebro RAG — Búsqueda Híbrida
 *
 * Fase 1.2: Combina búsqueda semántica (pgvector) + keyword (ILIKE)
 * con Reciprocal Rank Fusion para resultados más robustos.
 *
 * Por qué híbrida:
 *  - Semántica: entiende contexto y sinónimos ("se queda colgado" ≈ "freezing")
 *  - Keyword: exacta en términos técnicos ("PMIC A10", "U2 iPhone 13")
 *    que el vector puede no capturar bien si son muy específicos.
 */

import { db } from '@/lib/db';
import { generateEmbedding, calculateSimilarity } from '@/lib/local-embeddings';

export interface SimilarRepair {
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    contentText: string;
    similarity: number;
    status?: string;
    source?: 'semantic' | 'keyword' | 'hybrid' | 'wiki';
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

export function chunkText(text: string, chunkSize = 800, overlap = 80): string[] {
    if (text.length <= chunkSize) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        chunks.push(text.slice(start, start + chunkSize));
        start += (chunkSize - overlap);
    }
    return chunks;
}

/**
 * Reciprocal Rank Fusion — fusiona dos listas de resultados rankeadas.
 * k=60 es el estándar de la literatura académica.
 */
function rrfMerge(
    semanticResults: SimilarRepair[],
    keywordResults: SimilarRepair[],
    k = 60
): SimilarRepair[] {
    const scores = new Map<string, { item: SimilarRepair; score: number }>();

    const addList = (list: SimilarRepair[]) => {
        list.forEach((item, rank) => {
            const key = item.ticketNumber;
            let rrfScore = 1 / (k + rank + 1);

            const status = item.status?.toLowerCase() || '';

            // Ambos son valiosos, OK tiene prioridad máxima
            if (status.includes('ok')) {
                rrfScore *= 1.35;
            } else if (status.includes('entregado')) {
                rrfScore *= 1.25;
            }

            if (scores.has(key)) {
                scores.get(key)!.score += rrfScore;
                scores.get(key)!.item.source = 'hybrid';
            } else {
                scores.set(key, { item: { ...item }, score: rrfScore });
            }
        });
    };

    addList(semanticResults);
    addList(keywordResults);

    return Array.from(scores.values())
        .sort((a, b) => b.score - a.score)
        .map(({ item, score }) => ({
            ...item,
            similarity: Math.min(1, score * k) // normalizar a 0-1 aproximado
        }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Búsqueda semántica — pgvector
// ─────────────────────────────────────────────────────────────────────────────
async function semanticSearch(
    embedding: number[],
    limit: number,
    minSimilarity: number
): Promise<SimilarRepair[]> {
    try {
        const vectorStr = `[${embedding.join(',')}]`;
        const rows = await db.$queryRawUnsafe<any[]>(
            `SELECT re."ticketNumber", re."deviceBrand", re."deviceModel", re."contentText",
                    (1 - (re.embedding <=> $1::vector)) as similarity,
                    rs.name as status
             FROM "repair_embeddings" re
             LEFT JOIN repairs r ON re."repairId" = r.id
             LEFT JOIN repair_statuses rs ON r."statusId" = rs.id
             WHERE 1 - (re.embedding <=> $1::vector) >= $2
             ORDER BY re.embedding <=> $1::vector ASC
             LIMIT $3`,
            vectorStr, minSimilarity, limit
        );

        if (rows?.length > 0) {
            console.log(`[RAG] 🧠 Semántica: ${rows.length} resultados`);
            return rows.map(r => ({
                ticketNumber: r.ticketNumber,
                deviceBrand: r.deviceBrand,
                deviceModel: r.deviceModel,
                contentText: r.contentText,
                similarity: Number(r.similarity),
                status: r.status,
                source: r.ticketNumber.startsWith('wiki_') ? 'wiki' as const : 'semantic' as const
            }));
        }
    } catch (err: any) {
        console.warn(`[RAG] pgvector error: ${err.message.slice(0, 80)}`);
    }
    return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Búsqueda por keyword — ILIKE en repair_embeddings
// ─────────────────────────────────────────────────────────────────────────────
async function keywordSearch(
    query: string,
    limit: number
): Promise<SimilarRepair[]> {
    try {
        // Extraemos términos con >2 chars, filtramos stopwords básicas
        const STOPWORDS = new Set(['que', 'con', 'del', 'los', 'las', 'una', 'por', 'para', 'como', 'this', 'the']);
        const terms = query
            .toLowerCase()
            .replace(/[^\w\sáéíóúñü]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2 && !STOPWORDS.has(t))
            .slice(0, 6); // máx 6 términos para no saturar

        if (terms.length === 0) return [];

        // Construimos una condición ILIKE para cada término
        // Priorizamos matches en brand/model sobre el texto general
        const modelConditions = terms.map((_, i) => `re."deviceModel" ILIKE $${i + 1}`).join(' OR ');
        const brandConditions = terms.map((_, i) => `re."deviceBrand" ILIKE $${i + 1}`).join(' OR ');
        const contentConditions = terms.map((_, i) => `re."contentText" ILIKE $${i + 1}`).join(' OR ');
        const params = terms.map(t => `%${t}%`);

        const rows = await db.$queryRawUnsafe<any[]>(
            `SELECT re."ticketNumber", re."deviceBrand", re."deviceModel", re."contentText",
                    rs.name as status,
                    (
                        CASE WHEN (${modelConditions}) THEN 2.0 ELSE 0.0 END +
                        CASE WHEN (${brandConditions}) THEN 1.0 ELSE 0.0 END +
                        CASE WHEN (${contentConditions}) THEN 0.5 ELSE 0.0 END
                    ) as search_score
             FROM "repair_embeddings" re
             LEFT JOIN repairs r ON re."repairId" = r.id
             LEFT JOIN repair_statuses rs ON r."statusId" = rs.id
             WHERE (${modelConditions}) OR (${brandConditions}) OR (${contentConditions})
             ORDER BY search_score DESC
             LIMIT ${limit}`,
            ...params
        );

        if (rows?.length > 0) {
            console.log(`[RAG] 🔑 Keyword: ${rows.length} resultados (terms: ${terms.join(', ')})`);
            return rows.map(r => ({
                ticketNumber: r.ticketNumber,
                deviceBrand: r.deviceBrand,
                deviceModel: r.deviceModel,
                contentText: r.contentText,
                similarity: 0.7 + (Number(r.search_score) / 10), // Boost similarity based on score
                status: r.status,
                source: 'keyword' as const
            }));
        }
    } catch (err: any) {
        console.warn(`[RAG] keyword error: ${err.message.slice(0, 80)}`);
    }
    return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL — Búsqueda híbrida
// ─────────────────────────────────────────────────────────────────────────────
export async function findSimilarRepairs(
    userMessage: string,
    limit = 5,
    minSimilarity = 0.60
): Promise<SimilarRepair[]> {

    // Generar embedding una sola vez — se usa en ambas estrategias
    const embedding = await generateEmbedding(userMessage);

    // Las dos búsquedas corren en PARALELO para minimizar latencia
    const [semanticResults, keywordResults] = await Promise.allSettled([
        embedding ? semanticSearch(embedding, limit + 3, minSimilarity) : Promise.resolve([]),
        keywordSearch(userMessage, limit + 3)
    ]);

    const semantic = semanticResults.status === 'fulfilled' ? semanticResults.value : [];
    const keyword = keywordResults.status === 'fulfilled' ? keywordResults.value : [];

    // ── Caso 1: ambas tienen resultados → RRF merge ──────────────────────────
    if (semantic.length > 0 && keyword.length > 0) {
        const merged = rrfMerge(semantic, keyword);
        console.log(`[RAG] ⚡ Híbrida RRF: ${merged.slice(0, limit).length} resultados`);
        return merged.slice(0, limit);
    }

    // ── Caso 2: solo semántica ───────────────────────────────────────────────
    if (semantic.length > 0) {
        console.log(`[RAG] 🧠 Solo semántica: ${Math.min(semantic.length, limit)} resultados`);
        return semantic.slice(0, limit);
    }

    // ── Caso 3: solo keyword ─────────────────────────────────────────────────
    if (keyword.length > 0) {
        console.log(`[RAG] 🔑 Solo keyword: ${Math.min(keyword.length, limit)} resultados`);
        return keyword.slice(0, limit);
    }

    // ── Caso 4: fallback in-memory (si pgvector no está disponible) ──────────
    if (embedding) {
        try {
            const rows = await db.$queryRawUnsafe<any[]>(
                `SELECT "ticketNumber", "deviceBrand", "deviceModel", "contentText", "embedding"
                 FROM "repair_embeddings" LIMIT 500`
            );
            if (rows?.length > 0) {
                const results = rows
                    .map((row: any): SimilarRepair => ({
                        ticketNumber: row.ticketNumber,
                        deviceBrand: row.deviceBrand,
                        deviceModel: row.deviceModel,
                        contentText: row.contentText,
                        similarity: calculateSimilarity(embedding, typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding),
                        source: 'semantic'
                    }))
                    .filter(r => r.similarity >= minSimilarity)
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, limit);

                if (results.length > 0) {
                    console.log(`[RAG] 📦 Fallback in-memory: ${results.length} resultados`);
                    return results;
                }
            }
        } catch (err: any) {
            console.warn('[RAG] fallback in-memory error:', err.message);
        }
    }

    console.log('[RAG] Sin resultados.');
    return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Búsqueda rápida por texto (usada desde route.ts para wiki)
// ─────────────────────────────────────────────────────────────────────────────
export async function findKnowledgeByText(
    terms: string[],
    limit = 3
): Promise<{ brand: string; model: string; title: string; content: string }[]> {
    try {
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
            brand: r.deviceBrand, model: r.deviceModel,
            title: r.title, content: r.content,
        }));
    } catch {
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Formateador de contexto para el prompt
// ─────────────────────────────────────────────────────────────────────────────
export function formatRAGContext(repairs: SimilarRepair[]): string {
    const validRepairs = repairs.filter(r => r.similarity >= 0.65); // Umbral optimizado
    if (validRepairs.length === 0) return '';

    const lines = validRepairs.map((r, i) => {
        const isWiki = r.ticketNumber.startsWith('wiki_') || r.source === 'wiki';
        const status = r.status?.toLowerCase() || '';

        let label = '🔧 REFERENCIA';
        if (isWiki) label = '📘 WIKI';
        else if (status.includes('ok')) label = '✅ CASO ÉXITO';

        const ref = isWiki ? r.ticketNumber.replace('wiki_', 'WIKI-') : r.ticketNumber;

        return `[${label} #${i + 1} — Ref: ${ref}]
Equipo: ${r.deviceBrand} ${r.deviceModel}
Contenido: ${r.contentText.slice(0, 350)}
Confianza: ${Math.round(r.similarity * 100)}%`;
    });

    return `\n\n### 📂 REFERENCIAS TÉCNICAS EXTERNAS (RAG)
Usa estos casos SOLO si son altamente relevantes para el problema actual.
${lines.join('\n\n')}\n`;
}
