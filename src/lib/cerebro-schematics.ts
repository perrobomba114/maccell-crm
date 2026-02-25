/**
 * MACCELL Cerebro — Schematic Library
 * Fase 4: busca schematics pre-indexados en cerebro_schematics
 * según la marca/modelo detectados en el mensaje del técnico.
 */

import { db } from '@/lib/db';

interface SchematicMatch {
    brand: string;
    model: string;
    filename: string;
    text: string;
}

/**
 * Extrae menciones de marcas y modelos de dispositivos del texto del usuario.
 * Lista básica de marcas comunes — se puede expandir.
 */
function extractDeviceHints(text: string): { brands: string[]; models: string[] } {
    const lower = text.toLowerCase();

    const BRANDS = [
        'iphone', 'samsung', 'xiaomi', 'motorola', 'lg', 'huawei',
        'oppo', 'vivo', 'realme', 'oneplus', 'google', 'pixel',
        'redmi', 'poco', 'nokia', 'sony', 'tcl', 'zte'
    ];

    const brands = BRANDS.filter(b => lower.includes(b));

    // Modelos: busca patrones como "A52", "S21", "13 Pro", "11T", "XR", etc.
    const modelRegex = /\b(a\d{1,2}s?|s\d{1,2}(\+|ultra|fe)?|note\s?\d{1,2}|iphone\s?\d{1,2}(\s?pro(\s?max)?|\s?plus|\s?mini)?|redmi\s?\w+|poco\s?\w+|\d{1,2}t|\d{1,2}[a-z]?)\b/gi;
    const models = [...new Set((text.match(modelRegex) || []).map(m => m.trim()))];

    return { brands, models };
}

/**
 * Busca en cerebro_schematics el schematic más relevante para el mensaje.
 * Devuelve el texto del schematic si lo encuentra, null si no.
 */
export async function findSchematic(userMessage: string): Promise<SchematicMatch | null> {
    try {
        const { brands, models } = extractDeviceHints(userMessage);
        if (brands.length === 0 && models.length === 0) return null;

        // Construimos condiciones OR para buscar por marca y/o modelo
        const conditions: string[] = [];
        const params: string[] = [];
        let paramCount = 1;

        for (const brand of brands) {
            conditions.push(`lower(device_brand) LIKE $${paramCount}`);
            params.push(`%${brand}%`);
            paramCount++;
        }
        for (const model of models) {
            conditions.push(`lower(device_model) LIKE $${paramCount}`);
            params.push(`%${model}%`);
            paramCount++;
        }

        if (conditions.length === 0) return null;

        const rows = await db.$queryRawUnsafe<any[]>(
            `SELECT device_brand, device_model, filename, extracted_text
             FROM cerebro_schematics
             WHERE ${conditions.join(' OR ')}
             ORDER BY created_at DESC
             LIMIT 1`,
            ...params
        );

        if (!rows || rows.length === 0) return null;

        const row = rows[0];
        console.log(`[CEREBRO] 📋 Schematic encontrado: ${row.device_brand} ${row.device_model} (${row.filename})`);

        return {
            brand: row.device_brand,
            model: row.device_model,
            filename: row.filename,
            text: row.extracted_text
        };
    } catch (err: any) {
        // La tabla puede no existir todavía si nadie subió schematics
        console.warn('[CEREBRO] ⚠️ findSchematic error:', err.message?.slice(0, 80));
        return null;
    }
}

/**
 * Formatea el contexto del schematic para inyectar en el system prompt.
 * Se incluye solo el texto relevante (no el PDF completo).
 */
export function formatSchematicContext(match: SchematicMatch): string {
    return `\n\n### 📋 SCHEMATIC PRE-INDEXADO: ${match.brand} ${match.model} (${match.filename})\nUsá esta información del schematic EXCLUSIVAMENTE para el síntoma específico preguntado.\nNombrá los componentes reales, sus valores y testpoints.\n\n${match.text.slice(0, 4000)}`;
}
