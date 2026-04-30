/**
 * MACCELL Cerebro — Indexador Incremental de Reparaciones
 *
 * Genera embeddings locales (Transformers.js / all-MiniLM-L6-v2)
 * para cada reparación terminada y los guarda en:
 *  1. RepairKnowledge → texto plano (para búsqueda híbrida)
 *  2. repair_embeddings   → vector 384-dims para pgvector (si disponible)
 */

import { generateEmbedding } from '@/lib/local-embeddings';

type ExistingRepairEmbeddingRow = {
    repairId: string;
};

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

// ─────────────────────────────────────────────────────────────────────────────
// Indexar una reparación individual
// ─────────────────────────────────────────────────────────────────────────────
export async function indexRepair(repair: {
    id: string;
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    problemDescription: string;
    diagnosis?: string | null;
    isWet?: boolean;
    observations?: Array<{ content: string }>;
    parts?: Array<{ sparePart: { name: string; brand: string } }>;
    assignedUserId?: string | null;
    deviceImages?: string[];
}): Promise<boolean> {

    // 1. Construir documento de texto para embedding
    const lines = [
        `DISPOSITIVO: ${repair.deviceBrand} ${repair.deviceModel}`,
        `PROBLEMA: ${repair.problemDescription}`,
    ];
    if (repair.isWet) lines.push('CONDICIÓN: INGRESÓ CON HUMEDAD/AGUA');
    if (repair.diagnosis) lines.push(`DIAGNÓSTICO: ${repair.diagnosis}`);
    if (repair.observations?.length) {
        lines.push(`OBSERVACIONES: ${repair.observations.map(o => o.content).join('. ')}`);
    }
    if (repair.parts?.length) {
        lines.push(`REPUESTOS: ${repair.parts.map(p => `${p.sparePart.name} (${p.sparePart.brand})`).join(', ')}`);
    }

    // Detectar y agregar campo SOLUCIÓN desde diagnóstico u observaciones
    const fixKeywords = ['reemplaz', 'realiz', 'sold', 'cambi', 'reballing', 'jumper', 'swap', 'arregl', 'recuper', 'reparar'];
    let solucion = '';
    if (repair.diagnosis) {
        if (fixKeywords.some(k => repair.diagnosis!.toLowerCase().includes(k))) {
            solucion = repair.diagnosis;
        }
    }
    if (!solucion && repair.observations?.length) {
        const lastObs = repair.observations[repair.observations.length - 1].content;
        if (fixKeywords.some(k => lastObs.toLowerCase().includes(k))) {
            solucion = lastObs;
        }
    }
    if (solucion) lines.push(`SOLUCIÓN: ${solucion}`);

    const document = lines.join('\n');

    try {
        const { db } = await import('@/lib/db');

        // ── Solo indexar en RAG vectorial (automático, silencioso) ──────────
        // La wiki (repairKnowledge) es SOLO manual — el técnico decide qué guardar
        // usando el botón "Guardar a Wiki" en Cerebro tras un buen diagnóstico.
        // Esto mantiene la wiki curada y de alta calidad.

        console.warn(`[DEBUG] [CEREBRO_INDEXER] 🧠 Generando embedding para: ${repair.ticketNumber}`);
        const embedding = await generateEmbedding(document);

        if (embedding) {
            const vectorStr = `[${embedding.join(',')}]`;
            try {
                await db.$executeRawUnsafe(`
                    INSERT INTO repair_embeddings
                        (id, "repairId", "ticketNumber", "deviceBrand", "deviceModel", "contentText", embedding, "createdAt", "updatedAt")
                    VALUES
                        (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, now(), now())
                    ON CONFLICT ("repairId") DO UPDATE SET
                        "contentText" = EXCLUDED."contentText",
                        embedding     = EXCLUDED.embedding,
                        "updatedAt"   = now()
                `, repair.id, repair.ticketNumber, repair.deviceBrand, repair.deviceModel, document, vectorStr);
                console.warn(`[DEBUG] [CEREBRO_INDEXER] ✅ RAG indexado: ${repair.ticketNumber}`);
            } catch (pgErr: unknown) {
                console.warn(`[CEREBRO_INDEXER] ⚠️ pgvector no disponible: ${errorMessage(pgErr).slice(0, 80)}`);
            }
        } else {
            console.warn(`[CEREBRO_INDEXER] ⚠️ No se pudo generar embedding para: ${repair.ticketNumber}`);
        }

        return true;
    } catch (err: unknown) {
        console.error(`[CEREBRO_INDEXER] ❌ Error procesando ${repair.ticketNumber}:`, errorMessage(err));
        return false;
    }

}

// ─────────────────────────────────────────────────────────────────────────────
// Indexar reparaciones terminadas que no tienen embedding aún
// ─────────────────────────────────────────────────────────────────────────────
export async function indexPendingRepairs(): Promise<void> {
    const { db } = await import('@/lib/db');
    console.warn('[DEBUG] [CEREBRO_INDEXER] 🔍 Buscando reparaciones sin indexar...');

    try {
        // Obtener IDs ya indexados en pgvector (si está disponible)
        let existingIds = new Set<string>();
        try {
            const existingRes = await db.$queryRawUnsafe<ExistingRepairEmbeddingRow[]>('SELECT "repairId" FROM repair_embeddings');
            existingIds = new Set(existingRes.map(r => r.repairId));
            console.warn(`[DEBUG] [CEREBRO_INDEXER] Ya indexadas en pgvector: ${existingIds.size}`);
        } catch {
            console.warn('[CEREBRO_INDEXER] pgvector no disponible, indexando todo en wiki text.');
        }

        // Buscar reparaciones terminadas: con diagnóstico O con observaciones
        // (más agresivo: cualquier reparación terminada con info útil)
        const pending = await db.repair.findMany({
            where: {
                statusId: { in: [5, 6, 7, 8, 9, 10] }, // Estados: terminadas
                NOT: { id: { in: Array.from(existingIds) } },
                OR: [
                    { diagnosis: { not: null, notIn: [''] } },
                    { observations: { some: {} } },
                    { parts: { some: {} } },
                ],
            },
            include: {
                observations: { select: { content: true } },
                parts: { include: { sparePart: { select: { name: true, brand: true } } } },
            },
            take: 50, // Procesar más reparaciones por lote
        });

        if (pending.length === 0) {
            console.warn('[DEBUG] [CEREBRO_INDEXER] ✅ Todo está indexado. Nada que procesar.');
            return;
        }

        console.warn(`[DEBUG] [CEREBRO_INDEXER] ⚙️ Indexando ${pending.length} reparaciones...`);

        let success = 0;
        const BATCH_SIZE = 5;
        for (let i = 0; i < pending.length; i += BATCH_SIZE) {
            const batch = pending.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(batch.map(r => indexRepair(r)));
            success += results.filter(r => r.status === 'fulfilled' && r.value).length;
        }

        console.warn(`[DEBUG] [CEREBRO_INDEXER] ✅ Completado: ${success}/${pending.length} reparaciones indexadas.`);
    } catch (err: unknown) {
        console.error('[CEREBRO_INDEXER] ❌ Error en indexación masiva:', errorMessage(err));
    }
}
