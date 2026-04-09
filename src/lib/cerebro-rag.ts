/**
 * MACCELL Cerebro RAG — Búsqueda Híbrida
 *
 * Fase 1.2: Combina búsqueda semántica (pgvector) + keyword (ILIKE)
 * con Reciprocal Rank Fusion para resultados más robustos.
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
 */
function rrfMerge(
    semanticResults: SimilarRepair[],
    keywordResults: SimilarRepair[],
    k = 60,
    preferredBrand = ''
): SimilarRepair[] {
    const scores = new Map<string, { item: SimilarRepair; score: number }>();
    const brandLower = preferredBrand.toLowerCase();

    const addList = (list: SimilarRepair[]) => {
        list.forEach((item, rank) => {
            const key = item.ticketNumber;
            let rrfScore = 1 / (k + rank + 1);

            const status = item.status?.toLowerCase() || '';

            // Boost por estado de reparación exitosa
            if (status.includes('ok')) {
                rrfScore *= 1.35;
            } else if (status.includes('entregado')) {
                rrfScore *= 1.25;
            }

            // Boost FUERTE por coincidencia de marca — evita mezcla de dispositivos
            if (brandLower && (item.deviceBrand?.toLowerCase().includes(brandLower) || brandLower.includes(item.deviceBrand?.toLowerCase() || ''))) {
                rrfScore *= 2.5;
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

    const scoreValues = Array.from(scores.values());
    if (scoreValues.length === 0) return [];

    const maxScore = Math.max(...scoreValues.map(v => v.score));

    return scoreValues
        .sort((a, b) => b.score - a.score)
        .map(({ item, score }) => ({
            ...item,
            similarity: score / maxScore
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
        const STOPWORDS = new Set(['que', 'con', 'del', 'los', 'las', 'una', 'por', 'para', 'como', 'this', 'the']);
        const terms = query
            .toLowerCase()
            .replace(/[^\w\sáéíóúñü]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2 && !STOPWORDS.has(t))
            .slice(0, 6);

        if (terms.length === 0) return [];

        const modelConditions = terms.map((_, i) => `re."deviceModel" ILIKE $${i + 1}`).join(' OR ');
        const brandConditions = terms.map((_, i) => `re."deviceBrand" ILIKE $${i + 1}`).join(' OR ');
        const contentConditions = terms.map((_, i) => `re."contentText" ILIKE $${i + 1}`).join(' OR ');
        const params = terms.map(t => `%${t}%`);

        const safeLimitKeyword = Math.min(Math.max(1, Math.floor(Number(limit))), 20);

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
             LIMIT ${safeLimitKeyword}`,
            ...params
        );

        if (rows?.length > 0) {
            console.log(`[RAG] 🔑 Keyword: ${rows.length} resultados (terms: ${terms.join(', ')})`);
            return rows.map(r => ({
                ticketNumber: r.ticketNumber,
                deviceBrand: r.deviceBrand,
                deviceModel: r.deviceModel,
                contentText: r.contentText,
                similarity: 0.7 + (Number(r.search_score) / 10),
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
// Query Expansion — enriquece la query con sinónimos técnicos del taller
// ─────────────────────────────────────────────────────────────────────────────
function expandQuery(query: string): string {
    const lower = query.toLowerCase();
    const expansions: string[] = [query];

    // Síntomas → términos técnicos equivalentes
    const map: [RegExp, string][] = [
        [/no enciende|no prende|muerto|dead/,        'no enciende boot rail VDD_MAIN PMIC'],
        [/no carga|no cobra|no charge/,              'no carga VBUS Tristar Hydra USB carga IC'],
        [/pantalla negra|sin imagen|no display/,     'pantalla negra backlight LCD OLED VSP VSN display'],
        [/pantalla rota|vidrio roto|crack/,          'pantalla rota módulo LCD display reemplazo'],
        [/reinicia|bootloop|loop|rebota/,            'reinicia bootloop PMIC CPU RAM error arranque'],
        [/no tiene señal|sin señal|no network/,      'sin señal baseband RF antena modem'],
        [/wifi|bluetooth|bt /,                       'wifi bluetooth chip RF antena'],
        [/cámara|camera|foto/,                       'cámara camera MIPI rail VDIG VANA'],
        [/audio|sonido|speaker|micrófono/,           'audio speaker micrófono codec amplificador'],
        [/tactil|touch|pantalla no responde/,        'táctil touch digitizer FPC'],
        [/face id|face unlock|reconocimiento/,       'face ID IR dot projector infrarrojo'],
        [/mojado|agua|humedad|wet/,                  'humedad agua corrosión limpieza oxidación'],
        [/golpe|caída|drop|impacto/,                 'golpe impacto CPU desoldada reballing BGA'],
        [/samsung/,                                  'Samsung Exynos Snapdragon PMIC'],
        [/iphone/,                                   'iPhone Apple Tristar Hydra NAND CPU'],
        [/xiaomi|redmi/,                             'Xiaomi Redmi MediaTek Snapdragon PMIC'],
        [/moto/,                                     'Motorola Moto Snapdragon UFS eMMC'],
        [/huawei/,                                   'Huawei HiSilicon Kirin'],
        [/realme|oppo/,                              'Realme OPPO MTK Dimensity'],
    ];

    for (const [pattern, expansion] of map) {
        if (pattern.test(lower)) {
            expansions.push(expansion);
        }
    }

    // Deduplicar y unir
    const unique = [...new Set(expansions.join(' ').split(' '))];
    return unique.slice(0, 30).join(' '); // máx 30 tokens para el embedding
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL — Búsqueda híbrida
// ─────────────────────────────────────────────────────────────────────────────
export async function findSimilarRepairs(
    userMessage: string,
    limit = 7,
    minSimilarity = 0.52,
    preferredBrand = ''
): Promise<SimilarRepair[]> {
    const expandedQuery = expandQuery(userMessage);
    const embedding = await generateEmbedding(expandedQuery);

    const [semanticResults, keywordResults] = await Promise.allSettled([
        embedding ? semanticSearch(embedding, limit + 3, minSimilarity) : Promise.resolve([]),
        keywordSearch(expandedQuery, limit + 3)
    ]);

    let semantic = semanticResults.status === 'fulfilled' ? semanticResults.value : [];
    let keyword = keywordResults.status === 'fulfilled' ? keywordResults.value : [];

    // Si la marca es conocida, boost a los resultados de la misma marca
    // y deprioriá/penalizá los de otras marcas con symptom overlap
    const brandLower = preferredBrand.toLowerCase();
    if (brandLower && brandLower !== 'desconocido') {
        const isSameBrand = (r: SimilarRepair) =>
            r.deviceBrand?.toLowerCase().includes(brandLower) ||
            brandLower.includes(r.deviceBrand?.toLowerCase() || '');

        // Marca como wiki los de la misma marca para que siempre pasen el filtro
        // Reducir similarity de otras marcas para que no compitan
        semantic = semantic.map(r => isSameBrand(r) ? r : { ...r, similarity: r.similarity * 0.5 });
        keyword = keyword.map(r => isSameBrand(r) ? r : { ...r, similarity: r.similarity * 0.5 });
    }

    if (semantic.length > 0 && keyword.length > 0) {
        const merged = rrfMerge(semantic, keyword, 60, preferredBrand);
        console.log(`[RAG] ⚡ Híbrida RRF (marca: ${preferredBrand || 'cualquiera'}): ${merged.slice(0, limit).length} resultados`);
        return merged.slice(0, limit);
    }

    if (semantic.length > 0) {
        console.log(`[RAG] 🧠 Solo semántica: ${Math.min(semantic.length, limit)} resultados`);
        return semantic.slice(0, limit);
    }

    if (keyword.length > 0) {
        console.log(`[RAG] 🔑 Solo keyword: ${Math.min(keyword.length, limit)} resultados`);
        return keyword.slice(0, limit);
    }

    if (embedding) {
        const retryThreshold = 0.42;
        if (minSimilarity > retryThreshold) {
            const retry = await semanticSearch(embedding, limit, retryThreshold);
            if (retry.length > 0) {
                console.log(`[RAG] 🧠 Semántica (Retry threshold): ${retry.length} resultados`);
                return retry;
            }
        }

        try {
            const rows = await db.$queryRawUnsafe<any[]>(
                `SELECT "ticketNumber", "deviceBrand", "deviceModel", "contentText", "embedding"
                 FROM "repair_embeddings" LIMIT 100`
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
                    .filter(r => r.similarity >= retryThreshold)
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
// Formateador de contexto para el prompt
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrae campos etiquetados del texto del documento indexado.
 * Funciona con el formato: CAMPO: valor\n generado por cerebro-indexer.
 */
function parseRepairContent(text: unknown): { problema: string; diagnostico: string; solucion: string; repuestos: string } {
    const empty = { problema: '', diagnostico: '', solucion: '', repuestos: '' };
    if (typeof text !== 'string' || !text.trim()) return empty;
    const extract = (label: string): string => {
        try {
            const match = text.match(new RegExp(`${label}:\\s*([^\\n]+)`));
            return match?.[1]?.trim() ?? '';
        } catch { return ''; }
    };
    return {
        problema: extract('PROBLEMA'),
        diagnostico: extract('DIAGNÓSTICO|DIAGNOSTICO'),
        solucion: extract('SOLUCIÓN|SOLUCION'),
        repuestos: extract('REPUESTOS'),
    };
}

export function formatRAGContext(repairs: SimilarRepair[]): string {
    const validRepairs = repairs.filter(r => r.similarity >= 0.55);
    if (validRepairs.length === 0) return '';

    const lines = validRepairs.map((r) => {
        const isWiki = r.ticketNumber.startsWith('wiki_') || r.source === 'wiki';
        const status = r.status?.toLowerCase() || '';

        let label = '🔧 REFERENCIA';
        if (isWiki) label = '📘 WIKI';
        else if (status.includes('ok')) label = '✅ CASO ÉXITO';

        const ref = isWiki ? r.ticketNumber.replace('wiki_', 'WIKI-') : r.ticketNumber;
        const conf = Math.round(r.similarity * 100);

        const parsed = parseRepairContent(r.contentText);
        const hasStructure = parsed.problema || parsed.diagnostico || parsed.solucion;

        const cap = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s;

        if (hasStructure) {
            const fieldLines: string[] = [
                `[${label} — Ref: ${ref} | Confianza: ${conf}%]`,
                `Equipo: ${r.deviceBrand} ${r.deviceModel}`,
            ];
            if (parsed.problema)    fieldLines.push(`Problema: ${cap(parsed.problema, 200)}`);
            if (parsed.diagnostico) fieldLines.push(`Diagnóstico: ${cap(parsed.diagnostico, 250)}`);
            if (parsed.solucion)    fieldLines.push(`Solución: ${cap(parsed.solucion, 300)}`);
            if (parsed.repuestos)   fieldLines.push(`Repuestos: ${cap(parsed.repuestos, 150)}`);
            return fieldLines.join('\n');
        }

        // Fallback al texto plano si no se pudieron extraer los campos
        return `[${label} — Ref: ${ref} | Confianza: ${conf}%]
Equipo: ${r.deviceBrand} ${r.deviceModel}
Historia: ${(r.contentText ?? '').slice(0, 600)}`;
    });

    const body = lines.join('\n\n');
    const cappedBody = body.length > 4000 ? body.slice(0, 4000) + '\n…[truncado]' : body;
    return `\n\n### 📚 HISTORIAL DE REPARACIONES REALES (WIKI/Maccell)
Usa esta sección como tu fuente de VERDAD técnica. Si un componente ID o solución aparece aquí, incorporalo en tu respuesta. Menciona el ticket Ref si lo usas.
${cappedBody}\n`;
}
