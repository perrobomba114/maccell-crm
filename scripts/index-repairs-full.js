#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║   MACCELL Cerebro — Indexador Completo de Historial de Reparaciones     ║
 * ║   para pgvector (RAG Semántico)                                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * DESCRIPCIÓN:
 *   Lee TODAS las reparaciones de la base de datos de MACCELL,
 *   construye un documento enriquecido por cada una, lo vectoriza con
 *   nomic-embed-text (vía Ollama) y lo guarda en la tabla repair_embeddings
 *   con pgvector. Esto permite a Cerebro buscar casos similares en tiempo real.
 *
 * PREREQUISITOS:
 *   1. PostgreSQL con pgvector: ejecutar scripts/setup-pgvector.sql primero
 *   2. Ollama corriendo con: ollama pull nomic-embed-text
 *   3. Variables de entorno: DATABASE_URL y OLLAMA_BASE_URL en .env
 *
 * USO:
 *   node scripts/index-repairs-full.js
 *
 * OPCIONES:
 *   --reset     Borra todos los embeddings existentes antes de indexar
 *   --only-new  Solo indexa reparaciones que no tienen embedding aún
 *   --ticket X  Indexa solo el ticket número X (para pruebas)
 *
 * EJEMPLO:
 *   node scripts/index-repairs-full.js --only-new
 *   node scripts/index-repairs-full.js --ticket MAC1-170
 *   node scripts/index-repairs-full.js --reset
 */

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://100.110.53.47:11434';
const EMBED_MODEL = 'nomic-embed-text';   // 768 dimensiones
const BATCH_SIZE = 5;                     // Requests paralelos a Ollama
const MIN_QUALITY = 0;                     // Indexar todas (filtrar luego por calidad)
const LOG_FILE = 'scripts/index-repairs.log';

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const ONLY_NEW = args.includes('--only-new');
const TICKET_FILTER = (() => { const i = args.indexOf('--ticket'); return i >= 0 ? args[i + 1] : null; })();

const prisma = new PrismaClient();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE CONSOLA
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
    reset: '\x1b[0m', bright: '\x1b[1m', green: '\x1b[32m',
    yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m',
    blue: '\x1b[34m', magenta: '\x1b[35m', gray: '\x1b[90m'
};
const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

function banner() {
    console.log('\n' + c('cyan', '╔════════════════════════════════════════════════╗'));
    console.log(c('cyan', '║  MACCELL Cerebro — Indexador de Reparaciones   ║'));
    console.log(c('cyan', '╚════════════════════════════════════════════════╝'));
    console.log(c('gray', `   Ollama: ${OLLAMA_URL}`));
    console.log(c('gray', `   Modelo: ${EMBED_MODEL}`));
    console.log(c('gray', `   Modo:   ${RESET ? 'RESET COMPLETO' : ONLY_NEW ? 'SOLO NUEVAS' : TICKET_FILTER ? `TICKET ${TICKET_FILTER}` : 'TODAS'}`));
    console.log();
}

function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}`;
    fs.appendFileSync(LOG_FILE, line + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 1: Verificar que pgvector y la tabla existen
// ─────────────────────────────────────────────────────────────────────────────

async function checkPgVector() {
    console.log(c('yellow', '🔍 Verificando pgvector...'));
    try {
        const res = await pool.query(`SELECT extname FROM pg_extension WHERE extname = 'vector'`);
        if (res.rows.length === 0) {
            console.error(c('red', '❌ pgvector NO está instalado.'));
            console.error(c('gray', '   Ejecutá: psql -d [tu_db] -f scripts/setup-pgvector.sql'));
            process.exit(1);
        }

        // Verificar que la columna vector existe
        const tableCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'repair_embeddings' AND column_name = 'embedding'
        `);
        if (tableCheck.rows.length === 0) {
            console.error(c('red', '❌ La tabla repair_embeddings no tiene columna vector.'));
            console.error(c('gray', '   Ejecutá: psql -d [tu_db] -f scripts/setup-pgvector.sql'));
            process.exit(1);
        }

        const countRes = await pool.query(`SELECT COUNT(*) FROM repair_embeddings`);
        const existing = parseInt(countRes.rows[0].count);
        console.log(c('green', `✅ pgvector OK — ${existing} embeddings existentes`));
        return existing;
    } catch (err) {
        console.error(c('red', `❌ Error de conexión a PostgreSQL: ${err.message}`));
        process.exit(1);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 2: Verificar que Ollama y nomic-embed-text están disponibles
// ─────────────────────────────────────────────────────────────────────────────

async function checkOllama() {
    console.log(c('yellow', '\n🔍 Verificando Ollama...'));
    try {
        const res = await fetch(`${OLLAMA_URL}/api/tags`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const hasModel = data.models?.some(m => m.name.startsWith('nomic-embed-text'));
        if (!hasModel) {
            console.error(c('red', '❌ nomic-embed-text no está descargado en Ollama'));
            console.error(c('gray', '   Ejecutá: ollama pull nomic-embed-text'));
            process.exit(1);
        }
        console.log(c('green', '✅ Ollama OK — nomic-embed-text disponible'));
    } catch (err) {
        console.error(c('red', `❌ No se puede conectar a Ollama: ${err.message}`));
        process.exit(1);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 3: Obtener reparaciones de la DB con TODOS los datos relacionados
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRepairs(existingIds) {
    console.log(c('yellow', '\n📋 Cargando reparaciones de MACCELL DB...'));

    const where = {};
    if (TICKET_FILTER) {
        where.ticketNumber = TICKET_FILTER;
    } else {
        // Solo indexar las que tienen algún contenido útil
        where.OR = [
            { diagnosis: { not: null } },
            { problemDescription: { not: '' } },
        ];
    }

    const repairs = await prisma.repair.findMany({
        where,
        include: {
            observations: {
                select: { content: true, createdAt: true }
            },
            parts: {
                include: {
                    sparePart: {
                        select: { name: true, brand: true, sku: true }
                    }
                }
            },
            status: { select: { name: true } },
            branch: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Filtrar solo las nuevas si --only-new
    const filtered = ONLY_NEW && existingIds.size > 0
        ? repairs.filter(r => !existingIds.has(r.id))
        : repairs;

    console.log(c('green', `✅ ${repairs.length} reparaciones encontradas`));
    if (ONLY_NEW) console.log(c('gray', `   → ${filtered.length} nuevas para indexar (${repairs.length - filtered.length} ya indexadas)`));

    return filtered;
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 4: Construir documento enriquecido (lo que se vectorizará)
// ─────────────────────────────────────────────────────────────────────────────

function buildEnrichedDocument(repair) {
    const lines = [];

    // --- Encabezado ---
    lines.push(`TICKET: ${repair.ticketNumber}`);
    lines.push(`DISPOSITIVO: ${repair.deviceBrand} ${repair.deviceModel}`);
    lines.push(`SUCURSAL: ${repair.branch?.name || 'N/A'}`);
    lines.push(`ESTADO: ${repair.status?.name || 'N/A'}`);
    lines.push(`FECHA INGRESO: ${repair.createdAt.toLocaleDateString('es-AR')}`);

    if (repair.finishedAt) {
        const days = Math.round((repair.finishedAt - repair.createdAt) / (1000 * 60 * 60 * 24));
        lines.push(`TIEMPO DE REPARACIÓN: ${days} día(s)`);
    }

    // --- Condiciones especiales ---
    const flags = [];
    if (repair.isWet) flags.push('INGRESÓ CON HUMEDAD/AGUA');
    if (repair.isWarranty) flags.push('ES GARANTÍA');
    if (flags.length > 0) lines.push(`CONDICIÓN: ${flags.join(', ')}`);

    // --- Problema reportado ---
    lines.push(`\nPROBLEMA REPORTADO:\n${repair.problemDescription}`);

    // --- Diagnóstico técnico ---
    if (repair.diagnosis) {
        lines.push(`\nDIAGNÓSTICO TÉCNICO:\n${repair.diagnosis}`);
    }

    // --- Observaciones del técnico ---
    if (repair.observations?.length > 0) {
        const obs = repair.observations
            .sort((a, b) => a.createdAt - b.createdAt)
            .map(o => `• ${o.content}`)
            .join('\n');
        lines.push(`\nOBSERVACIONES DEL TÉCNICO:\n${obs}`);
    }

    // --- Repuestos utilizados ---
    if (repair.parts?.length > 0) {
        const parts = repair.parts
            .map(p => `• ${p.sparePart.name} (${p.sparePart.brand}) x${p.quantity}`)
            .join('\n');
        lines.push(`\nREPUESTOS USADOS:\n${parts}`);
    }

    // --- Score de calidad ---
    lines.push(`\nCALIDAD DE DATOS: ${repair.dataQualityScore}/100`);

    return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 5: Vectorizar con nomic-embed-text
// ─────────────────────────────────────────────────────────────────────────────

async function getEmbedding(text) {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    });
    if (!res.ok) throw new Error(`Embed API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (!data.embeddings?.[0]) throw new Error('Respuesta de embeddings vacía');
    return data.embeddings[0]; // Array de 768 floats
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 6: Guardar en pgvector
// ─────────────────────────────────────────────────────────────────────────────

async function saveEmbedding(repair, document, embedding) {
    const vectorStr = `[${embedding.join(',')}]`;
    await pool.query(`
        INSERT INTO repair_embeddings (
            id, "repairId", "ticketNumber", "deviceBrand", "deviceModel",
            "contentText", embedding, "createdAt", "updatedAt"
        )
        VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, now(), now()
        )
        ON CONFLICT ("repairId") DO UPDATE SET
            "ticketNumber" = EXCLUDED."ticketNumber",
            "deviceBrand"  = EXCLUDED."deviceBrand",
            "deviceModel"  = EXCLUDED."deviceModel",
            "contentText"  = EXCLUDED."contentText",
            embedding      = EXCLUDED.embedding,
            "updatedAt"    = now()
    `, [
        repair.id,
        repair.ticketNumber,
        repair.deviceBrand,
        repair.deviceModel,
        document,
        vectorStr
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// PASO 7: Estadísticas de la indexación
// ─────────────────────────────────────────────────────────────────────────────

async function printStats(repairs) {
    console.log('\n' + c('cyan', '╔════════════════════════════════════════════════╗'));
    console.log(c('cyan', '║              ESTADÍSTICAS MACCELL DB           ║'));
    console.log(c('cyan', '╚════════════════════════════════════════════════╝'));

    // Por marca
    const brands = {};
    repairs.forEach(r => { brands[r.deviceBrand] = (brands[r.deviceBrand] || 0) + 1; });
    const topBrands = Object.entries(brands).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(c('bright', '\n📱 Top 5 marcas:'));
    topBrands.forEach(([brand, count]) => console.log(`   ${count.toString().padStart(4)} | ${brand}`));

    // Por modelo
    const models = {};
    repairs.forEach(r => { const k = `${r.deviceBrand} ${r.deviceModel}`; models[k] = (models[k] || 0) + 1; });
    const topModels = Object.entries(models).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log(c('bright', '\n📱 Top 10 modelos:'));
    topModels.forEach(([model, count]) => console.log(`   ${count.toString().padStart(4)} | ${model}`));

    // Con/sin diagnóstico
    const withDiag = repairs.filter(r => r.diagnosis).length;
    console.log(c('bright', '\n📊 Calidad de datos:'));
    console.log(`   Con diagnóstico: ${c('green', withDiag)} / ${repairs.length}`);
    console.log(`   Con partes:      ${c('green', repairs.filter(r => r.parts.length > 0).length)}`);
    console.log(`   Con humedad:     ${c('yellow', repairs.filter(r => r.isWet).length)}`);
    console.log(`   Garantías:       ${c('yellow', repairs.filter(r => r.isWarranty).length)}`);

    // Total en pgvector
    const pg_count = await pool.query('SELECT COUNT(*) FROM repair_embeddings');
    console.log(c('bright', '\n🧠 Base de conocimiento RAG:'));
    console.log(`   Total vectores en pgvector: ${c('green', pg_count.rows[0].count)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    banner();

    // Preparar log
    fs.writeFileSync(LOG_FILE, `=== MACCELL Index Run: ${new Date().toISOString()} ===\n`, { flag: 'a' });

    // 1. Verificaciones previas
    const existingCount = await checkPgVector();
    await checkOllama();

    // 2. Si --reset, borrar todo
    if (RESET) {
        process.stdout.write(c('yellow', '\n⚠️  Reset: borrando todos los embeddings... '));
        await pool.query('TRUNCATE TABLE repair_embeddings');
        console.log(c('green', 'OK'));
    }

    // 3. Obtener IDs existentes para el modo --only-new
    let existingIds = new Set();
    if (ONLY_NEW) {
        const res = await pool.query('SELECT "repairId" FROM repair_embeddings');
        existingIds = new Set(res.rows.map(r => r.repairId));
    }

    // 4. Cargar reparaciones
    const repairs = await fetchRepairs(existingIds);

    if (repairs.length === 0) {
        console.log(c('yellow', '\n✅ No hay reparaciones nuevas para indexar.'));
        await printStats(await prisma.repair.findMany({ include: { parts: true } }));
        return;
    }

    // 5. Procesar en lotes
    console.log(c('yellow', `\n⚡ Indexando ${repairs.length} reparaciones en lotes de ${BATCH_SIZE}...\n`));

    let indexed = 0, errors = 0, skipped = 0;
    const startTime = Date.now();
    const errorList = [];

    for (let i = 0; i < repairs.length; i += BATCH_SIZE) {
        const batch = repairs.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (repair) => {
            try {
                const document = buildEnrichedDocument(repair);
                const embedding = await getEmbedding(document);
                await saveEmbedding(repair, document, embedding);
                indexed++;
                log(`OK | ${repair.ticketNumber} | ${repair.deviceBrand} ${repair.deviceModel}`);
            } catch (err) {
                errors++;
                errorList.push({ ticket: repair.ticketNumber, error: err.message });
                log(`ERROR | ${repair.ticketNumber} | ${err.message}`);
            }

            // Progreso en tiempo real
            const total = indexed + errors + skipped;
            const pct = Math.round((total / repairs.length) * 100);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            const eta = total > 0 ? Math.round((elapsed / total) * (repairs.length - total)) : '?';
            process.stdout.write(
                `\r  ${c('green', `✅ ${indexed}`)} indexadas | ` +
                `${c('red', `❌ ${errors}`)} errores | ` +
                `${pct}% | ` +
                `${c('gray', `${elapsed}s / ETA: ${eta}s`)}`
            );
        }));
    }

    // 6. Resultado final
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n\n' + c('cyan', '═══════════════════════════════════════════'));
    console.log(c('bright', '  INDEXACIÓN COMPLETADA'));
    console.log(c('cyan', '═══════════════════════════════════════════'));
    console.log(`  ${c('green', '✅ Indexadas:')} ${indexed}`);
    console.log(`  ${c('red', '❌ Errores:')}   ${errors}`);
    console.log(`  ${c('gray', '⏱️  Tiempo:')}   ${totalTime}s`);
    console.log(`  ${c('gray', '📄 Log:')}      ${LOG_FILE}`);

    if (errorList.length > 0) {
        console.log(c('red', '\n  Tickets con error:'));
        errorList.forEach(e => console.log(c('gray', `    • ${e.ticket}: ${e.error}`)));
    }

    // 7. Estadísticas
    await printStats(repairs);

    // 8. Test de búsqueda de muestra
    console.log(c('yellow', '\n\n🧪 Test de búsqueda semántica — "iphone no enciende"...'));
    try {
        const testEmb = await getEmbedding('iphone no enciende consumo 0');
        const testRes = await pool.query(`
            SELECT "ticketNumber", "deviceBrand", "deviceModel",
                   LEFT("contentText", 100) as preview,
                   1 - (embedding <=> $1::vector) AS similarity
            FROM repair_embeddings
            WHERE 1 - (embedding <=> $1::vector) > 0.6
            ORDER BY embedding <=> $1::vector
            LIMIT 3
        `, [`[${testEmb.join(',')}]`]);

        if (testRes.rows.length > 0) {
            console.log(c('green', '  Resultados:'));
            testRes.rows.forEach((r, i) => {
                console.log(`  ${i + 1}. [${Math.round(r.similarity * 100)}%] ${r.deviceBrand} ${r.deviceModel} — Ticket: ${r.ticketNumber}`);
                console.log(c('gray', `     ${r.preview}...`));
            });
        } else {
            console.log(c('gray', '  Sin resultados (normal si se indexaron pocos tickets)'));
        }
    } catch (err) {
        console.log(c('gray', `  Test omitido: ${err.message}`));
    }

    console.log('\n' + c('green', '✅ ¡Base de conocimiento MACCELL lista para Cerebro RAG!\n'));
}

main()
    .catch(err => {
        console.error(c('red', `\n💥 Error fatal: ${err.message}`));
        log(`FATAL: ${err.message}`);
        process.exit(1);
    })
    .finally(async () => {
        await pool.end();
        await prisma.$disconnect();
    });
