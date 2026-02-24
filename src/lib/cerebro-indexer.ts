/**
 * MACCELL Cerebro — Indexador Incremental de Reparaciones (Cloud Ready)
 *
 * NOTA: La generación de embeddings requiere un proveedor (Cloud o Local).
 * Actualmente configurado para saltar la generación si no hay un servicio activo.
 */

import pg from 'pg';

// Pool singleton para reutilizar conexiones
let _pool: pg.Pool | null = null;
function getPool() {
    if (!_pool) _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    return _pool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generar embedding
// ─────────────────────────────────────────────────────────────────────────────
async function embed(text: string): Promise<number[] | null> {
    // TODO: Implementar Cloud Embeddings (ej: Google Text Embedding API)
    // Se deshabilita Ollama local.
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Guardar o actualizar embedding de una reparación
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
}): Promise<boolean> {
    // Si no hay embedding, no podemos guardar en pgvector
    const embedding = await embed("...");
    if (!embedding) return false;

    // Construir documento
    const lines = [
        `TICKET: ${repair.ticketNumber}`,
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
        const vectorStr = `[${embedding.join(',')}]`;
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

        console.log(`[CEREBRO_INDEXER] ✅ Indexado: ${repair.ticketNumber}`);
        return true;
    } catch (err: any) {
        console.error(`[CEREBRO_INDEXER] Error guardando ${repair.ticketNumber}:`, err.message);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Indexar reparaciones pendientes
// ─────────────────────────────────────────────────────────────────────────────
export async function indexPendingRepairs(): Promise<void> {
    const { db } = await import('@/lib/db');
    console.log('[CEREBRO_INDEXER] 🔍 Verificación de reparaciones...');

    try {
        const existingRes = await getPool().query('SELECT "repairId" FROM repair_embeddings');
        const existingIds = new Set(existingRes.rows.map((r: any) => r.repairId));

        const pending = await db.repair.findMany({
            where: {
                diagnosis: { not: null },
                id: { notIn: existingIds.size > 0 ? [...existingIds] : ['_none_'] }
            },
            take: 10,
        });

        if (pending.length === 0) return;

        console.log(`[CEREBRO_INDEXER] Deshabilitado temporalmente (Sin Cloud Embedding Provider)`);
    } catch (err: any) {
        console.error('[CEREBRO_INDEXER] Error:', err.message);
    }
}
