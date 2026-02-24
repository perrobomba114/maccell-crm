/**
 * MACCELL Cerebro — Indexador Incremental de Reparaciones
 *
 * Usado por:
 * 1. instrumentation.ts → al arrancar el servidor (indexa pendientes)
 * 2. cerebro-actions.ts → cuando un técnico guarda un diagnóstico (indexa esa reparación)
 * 3. index-repairs-full.js → script manual de indexación completa
 */

import pg from 'pg';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://100.110.53.47:11434';
const EMBED_MODEL = 'nomic-embed-text';

// Pool singleton para reutilizar conexiones
let _pool: pg.Pool | null = null;
function getPool() {
    if (!_pool) _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    return _pool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generar embedding con nomic-embed-text
// ─────────────────────────────────────────────────────────────────────────────
async function embed(text: string): Promise<number[] | null> {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: EMBED_MODEL, input: text }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.embeddings?.[0] ?? null;
    } catch {
        return null;
    }
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

    const embedding = await embed(document);
    if (!embedding) {
        console.warn(`[CEREBRO_INDEXER] No se pudo generar embedding para ${repair.ticketNumber}`);
        return false;
    }

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
        // Si pgvector no está disponible, falla silencioso
        if (err.message?.includes('vector') || err.message?.includes('repair_embeddings')) {
            console.warn('[CEREBRO_INDEXER] pgvector no disponible — RAG deshabilitado');
        } else {
            console.error(`[CEREBRO_INDEXER] Error guardando ${repair.ticketNumber}:`, err.message);
        }
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Indexar reparaciones pendientes (llamado desde instrumentation.ts al arrancar)
// ─────────────────────────────────────────────────────────────────────────────
export async function indexPendingRepairs(): Promise<void> {
    // Importar Prisma aquí para evitar problemas con los module boundaries de Next.js
    const { db } = await import('@/lib/db');

    console.log('[CEREBRO_INDEXER] 🔍 Verificando reparaciones sin indexar...');

    try {
        // Obtener IDs que ya están indexados
        const existingRes = await getPool().query('SELECT "repairId" FROM repair_embeddings');
        const existingIds = new Set(existingRes.rows.map((r: any) => r.repairId));

        // Buscar reparaciones con diagnóstico que aún no están en la base vectorial
        const pending = await db.repair.findMany({
            where: {
                diagnosis: { not: null },
                id: { notIn: existingIds.size > 0 ? [...existingIds] : ['_none_'] }
            },
            include: {
                observations: { select: { content: true } },
                parts: { include: { sparePart: { select: { name: true, brand: true } } } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200, // Máximo 200 por arranque para no demorar
        });

        if (pending.length === 0) {
            console.log('[CEREBRO_INDEXER] ✅ Base de conocimiento actualizada — sin pendientes');
            return;
        }

        console.log(`[CEREBRO_INDEXER] 📋 ${pending.length} reparaciones para indexar...`);
        let indexed = 0;

        for (const repair of pending) {
            const ok = await indexRepair(repair);
            if (ok) indexed++;
            // Pequeña pausa entre requests para no saturar Ollama
            await new Promise(r => setTimeout(r, 200));
        }

        console.log(`[CEREBRO_INDEXER] 🎉 ${indexed}/${pending.length} reparaciones indexadas`);
    } catch (err: any) {
        console.error('[CEREBRO_INDEXER] Error:', err.message);
    }
}
