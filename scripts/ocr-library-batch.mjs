#!/usr/bin/env node
import pg from 'pg';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import dotenv from 'dotenv';
import { recognizeTechnicalPage } from '../src/lib/schematics/technical-ocr.js';
import { saveDatabaseOcrPage } from '../src/lib/schematics/database.js';

dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
const libraryRoot = path.resolve(process.env.SCHEMATICS_ROOT ?? 'upload/schematics');

async function runBatch() {
    console.log('[OCR-BATCH] Starting schematics library OCR scan...');
    const client = await pool.connect();
    try {
        const query = `
            SELECT a.id, a.relative_path, a.sha256, a.metadata
            FROM schematics.assets a
            WHERE a.kind = 'pdf' AND a.metadata->>'status' = 'ready'
            AND NOT EXISTS (
                SELECT 1 FROM schematics.pages p
                WHERE p.asset_id = a.id AND length(trim(p.content)) > 20
            )
            ORDER BY a.created_at DESC
            LIMIT 50
        `;
        const res = await client.query(query);
        console.log(`[OCR-BATCH] Found ${res.rows.length} PDF assets pending text extraction.`);

        for (const row of res.rows) {
            const assetPath = path.join(libraryRoot, 'sources', row.relative_path);
            try {
                const fileStat = await stat(assetPath).catch(() => null);
                if (!fileStat) {
                    continue;
                }
                console.log(`[OCR-BATCH] Processing asset ${row.id} (${row.relative_path})...`);
                // Process page 1 as primary diagnostic reference
                const raster = path.join('/tmp', `batch-ocr-${row.id}-1`);
                const pageResult = await recognizeTechnicalPage(assetPath, raster, 1, 'spa+eng');
                if (pageResult && pageResult.text.trim()) {
                    await saveDatabaseOcrPage(row.id, row.sha256, 1, pageResult.text, pageResult.boxes, {
                        mtimeMs: fileStat.mtimeMs,
                        size: fileStat.size,
                    });
                    console.log(`[OCR-BATCH] Saved page 1 OCR for ${row.id} (${pageResult.text.length} chars)`);
                }
            } catch (err) {
                console.warn(`[OCR-BATCH] Skipping asset ${row.id} due to error: ${err.message}`);
            }
        }
    } finally {
        client.release();
        await pool.end();
    }
    console.log('[OCR-BATCH] Batch run completed.');
}

runBatch().catch((err) => {
    console.error('[OCR-BATCH] Fatal error:', err);
    process.exit(1);
});
