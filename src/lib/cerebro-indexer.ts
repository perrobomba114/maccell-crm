/**
 * MACCELL Cerebro — Indexador Incremental de Reparaciones
 *
 * Genera embeddings locales (Transformers.js / all-MiniLM-L6-v2)
 * para cada reparación terminada y los guarda en:
 *  1. RepairKnowledge → texto plano (para búsqueda híbrida)
 *  2. repair_embeddings   → vector 384-dims para pgvector (si disponible)
 */

import pg from 'pg';
import { generateEmbedding } from '@/lib/local-embeddings';

// Pool singleton para reutilizar conexiones
let _pool: pg.Pool | null = null;
function getPool() {
    if (!_pool) _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    return _pool;
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
    const document = lines.join('\n');

    try {
        const { db } = await import('@/lib/db');

        // ── Solo indexar en RAG vectorial (automático, silencioso) ──────────
        // La wiki (repairKnowledge) es SOLO manual — el técnico decide qué guardar
        // usando el botón "Guardar a Wiki" en Cerebro tras un buen diagnóstico.
        // Esto mantiene la wiki curada y de alta calidad.

        console.log(`[CEREBRO_INDEXER] 🧠 Generando embedding para: ${repair.ticketNumber}`);
        const embedding = await generateEmbedding(document);

        if (embedding) {
            const vectorStr = `[${embedding.join(',')}]`;
            try {
                await getPool().query(`
                    INSERT INTO repair_embeddings
                        (id, "repairId", "ticketNumber", "deviceBrand", "deviceModel", "contentText", embedding, "createdAt", "updatedAt")
                    VALUES
                        (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, now(), now())
                    ON CONFLICT ("repairId") DO UPDATE SET
                        "contentText" = EXCLUDED."contentText",
                        embedding     = EXCLUDED.embedding,
                        "updatedAt"   = now()
                `, [repair.id, repair.ticketNumber, repair.deviceBrand, repair.deviceModel, document, vectorStr]);
                console.log(`[CEREBRO_INDEXER] ✅ RAG indexado: ${repair.ticketNumber}`);
            } catch (pgErr: any) {
                console.warn(`[CEREBRO_INDEXER] ⚠️ pgvector no disponible: ${pgErr.message.slice(0, 80)}`);
            }
        } else {
            console.warn(`[CEREBRO_INDEXER] ⚠️ No se pudo generar embedding para: ${repair.ticketNumber}`);
        }

        return true;
    } catch (err: any) {
        console.error(`[CEREBRO_INDEXER] ❌ Error procesando ${repair.ticketNumber}:`, err.message);
        return false;
    }

}

// ─────────────────────────────────────────────────────────────────────────────
// Indexar reparaciones terminadas que no tienen embedding aún
// ─────────────────────────────────────────────────────────────────────────────
export async function indexPendingRepairs(): Promise<void> {
    const { db } = await import('@/lib/db');
    console.log('[CEREBRO_INDEXER] 🔍 Buscando reparaciones sin indexar...');

    try {
        // Obtener IDs ya indexados en pgvector (si está disponible)
        let existingIds = new Set<string>();
        try {
            const existingRes = await getPool().query('SELECT "repairId" FROM repair_embeddings');
            existingIds = new Set(existingRes.rows.map((r: any) => r.repairId));
            console.log(`[CEREBRO_INDEXER] Ya indexadas en pgvector: ${existingIds.size}`);
        } catch {
            console.warn('[CEREBRO_INDEXER] pgvector no disponible, indexando todo en wiki text.');
        }

        // Buscar reparaciones terminadas con diagnóstico
        const pending = await db.repair.findMany({
            where: {
                diagnosis: { not: null, notIn: [''] },
                statusId: { in: [5, 6, 7, 8, 9, 10] }, // Estados: terminadas
                NOT: { id: { in: Array.from(existingIds) } },
            },
            include: {
                observations: { select: { content: true } },
                parts: { include: { sparePart: { select: { name: true, brand: true } } } },
            },
            take: 30, // Procesar de a lotes para no saturar
        });

        if (pending.length === 0) {
            console.log('[CEREBRO_INDEXER] ✅ Todo está indexado. Nada que procesar.');
            return;
        }

        console.log(`[CEREBRO_INDEXER] ⚙️ Indexando ${pending.length} reparaciones...`);

        let success = 0;
        for (const repair of pending) {
            const ok = await indexRepair(repair as any);
            if (ok) success++;
        }

        console.log(`[CEREBRO_INDEXER] ✅ Completado: ${success}/${pending.length} reparaciones indexadas.`);
    } catch (err: any) {
        console.error('[CEREBRO_INDEXER] ❌ Error en indexación masiva:', err.message);
    }
}
