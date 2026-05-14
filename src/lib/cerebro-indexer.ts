/**
 * MACCELL Cerebro — Indexador Incremental de Reparaciones
 *
 * Genera embeddings locales (Transformers.js / all-MiniLM-L6-v2)
 * para cada reparación terminada y los guarda en:
 *  1. repair_embeddings → vector 384-dims para pgvector (si disponible)
 *
 * La wiki (repairKnowledge) es SOLO manual — el técnico decide qué guardar
 * usando el botón "Guardar a Wiki" en Cerebro. Esto mantiene la wiki curada.
 */

import { generateEmbedding } from '@/lib/local-embeddings';

type ExistingRepairEmbeddingRow = {
    repairId: string;
};

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Flag de sesión para no reintentar pgvector una vez que confirmamos que
 * la extensión no está disponible en este servidor. Se resetea al reiniciar.
 */
let pgvectorUnavailable = false;

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

    // Detectar campo SOLUCIÓN desde diagnóstico u observaciones
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

        // Si ya confirmamos que pgvector no está disponible, no generamos
        // el embedding (ahorra CPU/mem del modelo Xenova en cada cron).
        if (pgvectorUnavailable) return true;

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
            } catch (pgErr: unknown) {
                // pgvector no está instalado en este servidor — marcar y silenciar
                // futuros intentos para no spamear logs ni desperdiciar recursos.
                pgvectorUnavailable = true;
                console.warn(`[CEREBRO_INDEXER] pgvector no disponible en este servidor — RAG semántico desactivado. Error: ${errorMessage(pgErr).slice(0, 120)}`);
            }
        }

        return true;
    } catch (err: unknown) {
        console.warn(`[CEREBRO_INDEXER] Error procesando ${repair.ticketNumber}: ${errorMessage(err)}`);
        return false;
    }

}

// ─────────────────────────────────────────────────────────────────────────────
// Indexar reparaciones terminadas que no tienen embedding aún
// ─────────────────────────────────────────────────────────────────────────────
export async function indexPendingRepairs(): Promise<void> {
    const { db } = await import('@/lib/db');

    // Si pgvector no está disponible no hay nada que indexar vectorialmente.
    if (pgvectorUnavailable) return;

    try {
        // Obtener IDs ya indexados en pgvector
        let existingIds = new Set<string>();
        try {
            const existingRes = await db.$queryRawUnsafe<ExistingRepairEmbeddingRow[]>('SELECT "repairId" FROM repair_embeddings');
            existingIds = new Set(existingRes.map(r => r.repairId));
        } catch {
            // pgvector no disponible — marcar y salir sin procesar
            pgvectorUnavailable = true;
            console.warn('[CEREBRO_INDEXER] pgvector no disponible — RAG semántico desactivado para esta sesión.');
            return;
        }

        const pending = await db.repair.findMany({
            where: {
                statusId: { in: [5, 6, 7, 8, 9, 10] },
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
            take: 50,
        });

        if (pending.length === 0) return;

        let success = 0;
        const BATCH_SIZE = 5;
        for (let i = 0; i < pending.length; i += BATCH_SIZE) {
            const batch = pending.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(batch.map(r => indexRepair(r)));
            success += results.filter(r => r.status === 'fulfilled' && r.value).length;
            // Si pgvector se marcó como no disponible durante el batch, abortar
            if (pgvectorUnavailable) break;
        }

        if (success > 0) {
            console.warn(`[CEREBRO_INDEXER] ${success}/${pending.length} reparaciones indexadas.`);
        }
    } catch (err: unknown) {
        console.warn(`[CEREBRO_INDEXER] Error en indexación masiva: ${errorMessage(err)}`);
    }
}
