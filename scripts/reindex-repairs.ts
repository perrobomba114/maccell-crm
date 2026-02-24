import { PrismaClient } from "@prisma/client";
import pg from 'pg';
import { generateEmbedding } from '../src/lib/local-embeddings';

const prisma = new PrismaClient();

async function main() {
    console.log("🧠 [CEREBRO REINDEX] Iniciando indexación con Transformers.js (all-MiniLM-L6-v2)...");

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    // Asegurar extensión o fallback a array estándar
    let useVector = true;
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
        console.log("✅ Extensión pgvector verificada.");
    } catch (e) {
        useVector = false;
        console.warn("⚠️ pgvector no disponible, usando arreglos estándar (double precision[]).");
    }

    try {
        // Comprobar si la columna existe y su tipo
        const colCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'repair_embeddings' AND column_name = 'embedding'
        `);

        if (colCheck.rows.length === 0) {
            const type = useVector ? 'vector(384)' : 'double precision[]';
            await pool.query(`ALTER TABLE repair_embeddings ADD COLUMN embedding ${type}`);
            console.log(`✅ Columna 'embedding' creada como ${type}.`);
        } else {
            const currentType = colCheck.rows[0].data_type;
            const targetType = useVector ? 'USER-DEFINED' : 'ARRAY'; // 'USER-DEFINED' es vector en pg

            if ((useVector && currentType !== 'USER-DEFINED') || (!useVector && currentType !== 'ARRAY')) {
                console.log(`⚠️ Tipo de columna incompatible (${currentType}). Reseteando a ${useVector ? 'vector' : 'array'}...`);
                await pool.query('ALTER TABLE repair_embeddings DROP COLUMN embedding');
                await pool.query(`ALTER TABLE repair_embeddings ADD COLUMN embedding ${useVector ? 'vector(384)' : 'double precision[]'}`);
            }
        }
    } catch (e) {
        console.error("❌ Error al configurar la tabla repair_embeddings:", (e as any).message);
        return;
    }

    const repairs = await prisma.repair.findMany({
        where: {
            diagnosis: { not: null, notIn: [""] },
            statusId: { in: [5, 6, 7, 8, 9, 10] } // Incluir entregados y diagnosticados
        }
    });

    console.log(`📊 Procesando ${repairs.length} reparaciones para la Wiki Semántica...`);

    let count = 0;
    for (const repair of repairs) {
        // Texto rico para el embedding
        const contentText = `${repair.deviceBrand} ${repair.deviceModel}. Problema: ${repair.problemDescription}. Solución: ${repair.diagnosis}`;

        // Usar el embedding local optimizado
        const embedding = await generateEmbedding(contentText);

        if (embedding) {
            const vectorData = useVector ? `[${embedding.join(',')}]` : embedding;
            const cast = useVector ? '::vector' : '';

            await pool.query(
                `INSERT INTO repair_embeddings ("id", "repairId", "ticketNumber", "deviceBrand", "deviceModel", "contentText", "embedding", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, $6, $7${cast}, NOW())
                 ON CONFLICT ("repairId") DO UPDATE SET
                 "contentText" = EXCLUDED."contentText",
                 "embedding" = EXCLUDED."embedding",
                 "updatedAt" = NOW()`,
                [
                    `emb_${repair.id}`,
                    repair.id,
                    repair.ticketNumber,
                    repair.deviceBrand,
                    repair.deviceModel,
                    contentText,
                    vectorData
                ]
            );
            count++;
            if (count % 25 === 0) console.log(`... ${count} reparaciones indexadas`);
        }
    }

    console.log(`✅ Indexación completada. ${count} reparaciones listas en Cerebro.`);
    await pool.end();
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
