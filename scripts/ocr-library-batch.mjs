#!/usr/bin/env node
import pg from 'pg';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { recognizeTechnicalPage } from '../src/lib/schematics/technical-ocr.js';
import { saveDatabaseOcrPage } from '../src/lib/schematics/database.js';

dotenv.config({ quiet: true });

const run = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
const libraryRoot = path.resolve(process.env.SCHEMATICS_ROOT ?? 'upload/schematics');

async function getPageCount(filePath) {
    try {
        const { stdout } = await run('pdfinfo', [filePath], { timeout: 10_000 });
        const match = stdout.match(/^Pages:\s+(\d+)/m);
        return match ? parseInt(match[1], 10) : 1;
    } catch {
        return 1;
    }
}

async function getImagePages(filePath) {
    try {
        const { stdout } = await run('pdfimages', ['-list', filePath], { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
        return [...new Set(stdout.split(/\r?\n/).flatMap(line => {
            const columns = line.trim().split(/\s+/);
            const page = Number(columns[0]);
            return Number.isSafeInteger(page) && page > 0 && columns[2] === 'image' && Number(columns[3]) >= 200 && Number(columns[4]) >= 200 ? [page] : [];
        }))];
    } catch {
        return [];
    }
}

async function resolveAssetPath(relativePath) {
    const candidates = [
        path.join(libraryRoot, relativePath),
        path.join(libraryRoot, 'sources', relativePath),
        path.join('/mnt/data2', relativePath.replace(/^sources\//, '')),
    ];
    for (const candidate of candidates) {
        const fileStat = await stat(candidate).catch(() => null);
        if (fileStat && fileStat.isFile()) return { path: candidate, stat: fileStat };
    }
    return null;
}

async function runBatch() {
    const args = process.argv.slice(2);
    const modelFilter = args.find((_, i, arr) => arr[i - 1] === '--model');
    const limitArg = args.find((_, i, arr) => arr[i - 1] === '--limit');
    const limit = limitArg ? parseInt(limitArg, 10) : 100;
    const forceAllPages = args.includes('--all-pages');
    const languages = process.env.SCHEMATICS_OCR_LANGUAGES ?? 'spa+eng';

    console.log(`[OCR-BATCH] Starting schematics library OCR scan (model: ${modelFilter ?? 'ALL'}, limit: ${limit})...`);
    const client = await pool.connect();
    try {
        let query = `
            SELECT a.id, a.relative_path, a.sha256, a.metadata
            FROM schematics.assets a
            WHERE a.kind = 'pdf' AND a.metadata->>'status' = 'ready'
        `;
        const params = [];
        if (modelFilter) {
            params.push(`%${modelFilter}%`);
            query += ` AND (a.metadata->>'model' ILIKE $${params.length} OR a.relative_path ILIKE $${params.length})`;
        }
        params.push(limit);
        query += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

        const res = await client.query(query, params);
        console.log(`[OCR-BATCH] Found ${res.rows.length} PDF assets matching criteria.`);

        let processedAssets = 0;
        let processedPages = 0;

        for (const row of res.rows) {
            const resolved = await resolveAssetPath(row.relative_path);
            if (!resolved) {
                console.warn(`[OCR-BATCH] File not found for asset ${row.id} (${row.relative_path})`);
                continue;
            }

            const { path: assetPath, stat: fileStat } = resolved;
            const totalPages = await getPageCount(assetPath);
            const imagePages = await getImagePages(assetPath);

            let pagesToOcr = forceAllPages || totalPages <= 25
                ? Array.from({ length: totalPages }, (_, i) => i + 1)
                : [...new Set([1, ...imagePages])].sort((a, b) => a - b);

            if (pagesToOcr.length === 0) pagesToOcr = [1];

            console.log(`[OCR-BATCH] Asset ${row.id} (${row.metadata?.model ?? row.relative_path}): ${totalPages} total pages, OCR on ${pagesToOcr.length} pages [${pagesToOcr.slice(0, 10).join(',')}${pagesToOcr.length > 10 ? '...' : ''}]`);

            for (const pageNum of pagesToOcr) {
                const raster = path.join('/tmp', `batch-ocr-${row.id}-${pageNum}`);
                try {
                    const pageResult = await recognizeTechnicalPage(assetPath, raster, pageNum, languages);
                    if (pageResult && pageResult.text.trim()) {
                        await saveDatabaseOcrPage(row.id, row.sha256, pageNum, pageResult.text, pageResult.boxes, {
                            mtimeMs: fileStat.mtimeMs,
                            size: fileStat.size,
                        });
                        processedPages++;
                    }
                } catch (pageErr) {
                    console.warn(`[OCR-BATCH] Page ${pageNum} error on ${row.id}: ${pageErr.message}`);
                }
            }
            processedAssets++;
        }
        console.log(`[OCR-BATCH] Completed. Processed ${processedAssets} assets and ${processedPages} OCR pages.`);
    } finally {
        client.release();
        await pool.end();
    }
}

runBatch().catch((err) => {
    console.error('[OCR-BATCH] Fatal error:', err);
    process.exit(1);
});

