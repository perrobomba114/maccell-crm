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

        // 2. Guardar en RepairKnowledge (texto plano)
        const title = `${repair.deviceBrand} ${repair.deviceModel} — ${repair.problemDescription.slice(0, 80)}`;
        const technicalSummary = [
            `Diagnóstico: ${repair.diagnosis || 'Sin diagnóstico detallado'}`,
            repair.observations?.length
                ? `Observaciones: ${repair.observations.map(o => o.content).join('. ')}`
                : '',
            repair.parts?.length
                ? `Repuestos: ${repair.parts.map(p => p.sparePart.name).join(', ')}`
                : ''
        ].filter(Boolean).join('\n\n');

        // Crear o actualizar entrada en la wiki técnica
        await (db as any).repairKnowledge.upsert({
            where: {
                // Usamos un unique constraint ficticio — si no existe lo creamos
                id: `auto_${repair.id}`,
            },
            create: {
                id: `auto_${repair.id}`,
                deviceBrand: repair.deviceBrand,
                deviceModel: repair.deviceModel,
                title,
                content: technicalSummary,
                problemTags: repair.problemDescription
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(w => w.length > 3),
                authorId: repair.assignedUserId || 'system',
                mediaUrls: repair.deviceImages || [],
            },
            update: {
                content: technicalSummary,
                updatedAt: new Date(),
            },
        }).catch(() => {
            // Si falla upsert (ej: no existe campo id en el schema), crear directamente
            return (db as any).repairKnowledge.create({
                data: {
                    deviceBrand: repair.deviceBrand,
                    deviceModel: repair.deviceModel,
                    title,
                    content: technicalSummary,
                    problemTags: repair.problemDescription
                        .toLowerCase()
                        .split(/\s+/)
                        .filter(w => w.length > 3),
                    authorId: repair.assignedUserId || 'system',
                    mediaUrls: repair.deviceImages || [],
                }
            });
        });

        console.log(`[CEREBRO_INDEXER] 📝 Wiki guardada: ${repair.ticketNumber}`);

        // 3. Generar embedding LOCAL (Transformers.js)
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
                console.log(`[CEREBRO_INDEXER] 📐 Vector indexado: ${repair.ticketNumber}`);
            } catch (pgErr: any) {
                // pgvector no disponible o tabla no existe — solo advertencia, no error fatal
                console.warn(`[CEREBRO_INDEXER] ⚠️ pgvector no disponible (solo wiki text): ${pgErr.message.slice(0, 80)}`);
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
