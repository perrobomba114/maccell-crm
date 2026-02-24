import { PrismaClient } from "@prisma/client";
import pg from 'pg';

const prisma = new PrismaClient();
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

async function embedText(text: string): Promise<number[] | null> {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'nomic-embed-text', input: text }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.embeddings?.[0] ?? null;
    } catch {
        return null;
    }
}

async function main() {
    console.log("🧠 Iniciando indexación de memoria técnica (Embeddings)...");

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    // Asegurar extensión pgvector
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
        console.log("✅ Extensión pgvector verificada.");
    } catch (e) {
        console.warn("⚠️ No se pudo activar pgvector automáticamente. Asegúrate que tu DB la soporte.");
    }

    const repairs = await prisma.repair.findMany({
        where: {
            diagnosis: { not: null },
            statusId: 5 // Solo finalizados exitosos
        }
    });

    console.log(`📊 Procesando ${repairs.length} reparaciones para memoria...`);

    let count = 0;
    for (const repair of repairs) {
        const contentText = `Problema: ${repair.problemDescription}. Diagnóstico: ${repair.diagnosis}`;
        const embedding = await embedText(contentText);

        if (embedding) {
            const vectorStr = `[${embedding.join(',')}]`;

            // Usar SQL Raw para insertar en pgvector
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
            if (count % 10 === 0) console.log(`... ${count} repairs indexed`);
        }
    }

    console.log(`✅ Indexación completada. ${count} reparaciones están ahora en la memoria de Cerebro.`);
    await pool.end();
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
