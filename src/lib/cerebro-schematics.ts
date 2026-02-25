/**
 * MACCELL Cerebro — Schematic Library (Fase 4)
 * Raw SQL para máxima robustez — no depende del cliente Prisma generado.
 */

import { db } from '@/lib/db';

interface SchematicMatch {
    brand: string;
    model: string;
    filename: string;
    text: string;
}

function extractDeviceHints(text: string): { brands: string[]; models: string[] } {
    const lower = text.toLowerCase();

    const BRANDS = [
        'iphone', 'samsung', 'xiaomi', 'motorola', 'lg', 'huawei',
        'oppo', 'vivo', 'realme', 'oneplus', 'google', 'pixel',
        'redmi', 'poco', 'nokia', 'sony', 'tcl', 'zte'
    ];

    const brands = BRANDS.filter(b => lower.includes(b));
    const modelRegex = /\b(a\d{1,2}s?|a\d{2}s?|s\d{1,2}(\+|ultra|fe)?|note\s?\d{1,2}|iphone\s?\d{1,2}(\s?pro(\s?max)?|\s?plus|\s?mini)?|redmi\s?\w+|poco\s?\w+|\d{1,2}t|\d{1,2}[a-z]?)\b/gi;
    const models = [...new Set((text.match(modelRegex) || []).map(m => m.trim().toLowerCase()))];

    return { brands, models };
}

export async function findSchematic(userMessage: string): Promise<SchematicMatch | null> {
    try {
        const { brands, models } = extractDeviceHints(userMessage);
        if (brands.length === 0 && models.length === 0) return null;

        const conditions: string[] = [];
        const params: string[] = [];
        let i = 1;

        for (const brand of brands) {
            conditions.push(`lower(device_brand) LIKE $${i}`);
            params.push(`%${brand}%`);
            i++;
        }
        for (const model of models) {
            conditions.push(`lower(device_model) LIKE $${i}`);
            params.push(`%${model}%`);
            i++;
        }

        const sql = `
            SELECT device_brand, device_model, filename, extracted_text
            FROM cerebro_schematics
            WHERE ${conditions.join(' OR ')}
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const rows = await db.$queryRawUnsafe<any[]>(sql, ...params);
        if (!rows || rows.length === 0) return null;

        const row = rows[0];
        console.log(`[CEREBRO] 📋 Schematic encontrado: ${row.device_brand} ${row.device_model}`);

        return {
            brand: row.device_brand,
            model: row.device_model,
            filename: row.filename,
            text: row.extracted_text
        };
    } catch (err: any) {
        console.warn('[CEREBRO] ⚠️ findSchematic error:', err.message?.slice(0, 80));
        return null;
    }
}

export function formatSchematicContext(match: SchematicMatch): string {
    return `\n\n### 📋 SCHEMATIC PRE-INDEXADO: ${match.brand} ${match.model} (${match.filename})\nUsá esta información del schematic EXCLUSIVAMENTE para el síntoma específico preguntado.\nNombrá los componentes reales, sus valores y testpoints.\n\n${match.text.slice(0, 4000)}`;
}
