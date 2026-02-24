import { PrismaClient } from "@prisma/client";
import pg from 'pg';
import { generateEmbedding } from '../src/lib/local-embeddings';

const prisma = new PrismaClient();

async function main() {
    console.log("🧠 [CEREBRO REINDEX] Iniciando indexación con Transformers.js (all-MiniLM-L6-v2)...");

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    // Asegurar extensión pgvector y RESETEAR dimensiones si es necesario
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
        console.log("✅ Extensión pgvector verificada.");

        // Comprobar dimensiones actuales
        const dimCheck = await pool.query(`
            SELECT atttypmod as dim 
            FROM pg_attribute 
            WHERE attrelid = 'repair_embeddings'::regclass 
            AND attname = 'embedding'
        `);

        // Si la dimensión no es 384, reseteamos la columna
        if (dimCheck.rows.length > 0 && dimCheck.rows[0].dim !== 384) {
            console.log("⚠️ Dimensiones incompatibles detectadas. Reseteando columna 'embedding' a 384...");
            await pool.query('ALTER TABLE repair_embeddings DROP COLUMN embedding');
            await pool.query('ALTER TABLE repair_embeddings ADD COLUMN embedding vector(384)');
        } else if (dimCheck.rows.length === 0) {
            await pool.query('ALTER TABLE repair_embeddings ADD COLUMN embedding vector(384)');
        }
    } catch (e) {
        console.warn("⚠️ No se pudo configurar pgvector:", (e as any).message);
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
            const vectorStr = `[${embedding.join(',')}]`;

            await pool.query(
                `INSERT INTO repair_embeddings ("id", "repairId", "ticketNumber", "deviceBrand", "deviceModel", "contentText", "embedding")
                 VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
                 ON CONFLICT ("repairId") DO UPDATE SET
                 "contentText" = EXCLUDED."contentText",
                 "embedding" = EXCLUDED."embedding"`,
                [
                    `emb_${repair.id}`,
                    repair.id,
                    repair.ticketNumber,
                    repair.deviceBrand,
                    repair.deviceModel,
                    contentText,
                    vectorStr
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
