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
    assignedUserId?: string | null;
    deviceImages?: string[];
}): Promise<boolean> {

    // 1. Construir documento de texto para embedding y búsqueda
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
        const { db } = await import('@/lib/db');

        // 2. Guardar en RepairKnowledge (Base de Datos de Texto para RAG sin vectores)
        const title = `Reparación: ${repair.deviceBrand} ${repair.deviceModel} - ${repair.ticketNumber}`;
        const technicalSummary = [
            `Diagnóstico Técnico: ${repair.diagnosis || 'Sin diagnóstico detallado'}`,
            repair.observations?.length ? `Observaciones: ${repair.observations.map(o => o.content).join('. ')}` : '',
            repair.parts?.length ? `Repuestos utilizados: ${repair.parts.map(p => p.sparePart.name).join(', ')}` : ''
        ].filter(Boolean).join('\n\n');

        await db.repairKnowledge.create({
            data: {
                deviceBrand: repair.deviceBrand,
                deviceModel: repair.deviceModel,
                title: title,
                content: technicalSummary,
                problemTags: repair.problemDescription.split(' ').filter(word => word.length > 3),
                authorId: repair.assignedUserId || 'system',
                mediaUrls: repair.deviceImages || []
            }
        });

        console.log(`[CEREBRO_INDEXER] 🧠 Conocimiento guardado: ${repair.ticketNumber}`);

        // 3. Guardar Embedding (Vectorial - Solo si hay proveedor)
        const embedding = await embed(document);
        if (embedding) {
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
            console.log(`[CEREBRO_INDEXER] 📐 Vector indexado: ${repair.ticketNumber}`);
        }

        return true;
    } catch (err: any) {
        console.error(`[CEREBRO_INDEXER] Error procesando ${repair.ticketNumber}:`, err.message);
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
                diagnosis: { not: null, notIn: [""] },
                statusId: { in: [5, 6, 7, 8, 9, 10] } // Solo terminadas
            },
            include: {
                observations: { select: { content: true } },
                parts: { include: { sparePart: { select: { name: true, brand: true } } } },
            },
            take: 50,
        });

        if (pending.length === 0) {
            console.log('[CEREBRO_INDEXER] No hay reparaciones nuevas para indexar.');
            return;
        }

        console.log(`[CEREBRO_INDEXER] Procesando ${pending.length} reparaciones para la base de conocimientos...`);

        for (const repair of pending) {
            await indexRepair(repair as any);
        }
    } catch (err: any) {
        console.error('[CEREBRO_INDEXER] Error en indexación masiva:', err.message);
    }
}
