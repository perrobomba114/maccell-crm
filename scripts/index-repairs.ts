/**
 * MACCELL Cerebro RAG — Script de Indexación de Reparaciones
 * 
 * Este script vectoriza todas las reparaciones históricas de MACCELL
 * usando nomic-embed-text (vía Ollama) y las guarda en repair_embeddings.
 * 
 * Cómo usar:
 *   npx tsx scripts/index-repairs.ts
 * 
 * Requisitos previos:
 *   1. Ollama corriendo con nomic-embed-text descargado
 *   2. PostgreSQL con pgvector habilitado (scripts/setup-pgvector.sql)
 */

import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://100.110.53.47:11434';
const BATCH_SIZE = 10; // Procesar de a 10 para no saturar Ollama

// ─────────────────────────────────────────────────────────────────────────────
// 1. Generar embedding con nomic-embed-text
// ─────────────────────────────────────────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[]> {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'nomic-embed-text',
            input: text,
        })
    });

    if (!res.ok) throw new Error(`Ollama embed error: ${res.statusText}`);
    const data = await res.json();
    return data.embeddings[0]; // Array de 768 floats
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Construir texto indexable de una reparación
// ─────────────────────────────────────────────────────────────────────────────
function buildRepairText(repair: any): string {
    const parts = [
        `Dispositivo: ${repair.deviceBrand} ${repair.deviceModel}`,
        `Problema: ${repair.problemDescription}`,
    ];
    if (repair.diagnosis) parts.push(`Diagnóstico: ${repair.diagnosis}`);
    if (repair.diagnosisEnriched) parts.push(`Diagnóstico enriquecido: ${repair.diagnosisEnriched}`);
    if (repair.isWet) parts.push('Ingresó con humedad/agua');
    return parts.join('. ');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Guardar embedding en PostgreSQL con pgvector (SQL raw)
// ─────────────────────────────────────────────────────────────────────────────
async function saveEmbedding(pool: pg.Pool, repair: any, embedding: number[], contentText: string) {
    const vectorStr = `[${embedding.join(',')}]`;
    await pool.query(
        `INSERT INTO repair_embeddings (id, "repairId", "ticketNumber", "deviceBrand", "deviceModel", "contentText", embedding, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, now(), now())
         ON CONFLICT ("repairId") DO UPDATE SET
           "contentText" = EXCLUDED."contentText",
           embedding = EXCLUDED.embedding,
           "updatedAt" = now()`,
        [repair.id, repair.ticketNumber, repair.deviceBrand, repair.deviceModel, contentText, vectorStr]
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — Indexar todas las reparaciones con diagnóstico
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
    console.log('🧠 MACCELL Cerebro — Iniciando indexación RAG...\n');

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    // Solo indexamos reparaciones que tienen diagnóstico (datos útiles)
    const repairs = await prisma.repair.findMany({
        where: {
            OR: [
                { diagnosis: { not: null } },
                { diagnosis: { not: '' } },
            ]
        },
        select: {
            id: true,
            ticketNumber: true,
            deviceBrand: true,
            deviceModel: true,
            problemDescription: true,
            diagnosis: true,
            isWet: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    console.log(`📋 Total de reparaciones con diagnóstico: ${repairs.length}`);
    console.log(`⚙️  Procesando en lotes de ${BATCH_SIZE}...\n`);

    let indexed = 0;
    let errors = 0;

    for (let i = 0; i < repairs.length; i += BATCH_SIZE) {
        const batch = repairs.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (repair) => {
            try {
                const text = buildRepairText(repair);
                const embedding = await getEmbedding(text);
                await saveEmbedding(pool, repair, embedding, text);
                indexed++;
                process.stdout.write(`\r✅ Indexadas: ${indexed}/${repairs.length} | ❌ Errores: ${errors}`);
            } catch (err: any) {
                errors++;
                console.error(`\n[ERROR] Ticket ${repair.ticketNumber}: ${err.message}`);
            }
        }));
    }

    console.log(`\n\n🎉 Indexación completa!`);
    console.log(`   ✅ Indexadas: ${indexed}`);
    console.log(`   ❌ Errores:  ${errors}`);
    console.log(`   📊 Total reparaciones disponibles para RAG: ${indexed}`);

    await pool.end();
    await prisma.$disconnect();
}

main().catch(console.error);
