/**
 * MACCELL Cerebro — Schematic Library (Fase 4)
 * Busca schematics pre-indexados por marca/modelo detectados en el mensaje.
 * Usa Prisma para persistencia correcta entre reinicios del servidor.
 */

import { db } from '@/lib/db';

interface SchematicMatch {
    brand: string;
    model: string;
    filename: string;
    text: string;
}

/**
 * Extrae menciones de marcas y modelos del texto del usuario.
 */
function extractDeviceHints(text: string): { brands: string[]; models: string[] } {
    const lower = text.toLowerCase();

    const BRANDS = [
        'iphone', 'samsung', 'xiaomi', 'motorola', 'lg', 'huawei',
        'oppo', 'vivo', 'realme', 'oneplus', 'google', 'pixel',
        'redmi', 'poco', 'nokia', 'sony', 'tcl', 'zte'
    ];

    const brands = BRANDS.filter(b => lower.includes(b));

    // Modelos: a10, a52, s21, note 10, iphone 13 pro, etc.
    const modelRegex = /\b(a\d{1,2}s?|a\d{2}s?|s\d{1,2}(\+|ultra|fe)?|note\s?\d{1,2}|iphone\s?\d{1,2}(\s?pro(\s?max)?|\s?plus|\s?mini)?|redmi\s?\w+|poco\s?\w+|\d{1,2}t|\d{1,2}[a-z]?)\b/gi;
    const models = [...new Set((text.match(modelRegex) || []).map(m => m.trim().toLowerCase()))];

    return { brands, models };
}

/**
 * Busca en cerebro_schematics el schematic más relevante para el mensaje.
 * Usa Prisma para persistencia segura.
 */
export async function findSchematic(userMessage: string): Promise<SchematicMatch | null> {
    try {
        const { brands, models } = extractDeviceHints(userMessage);
        if (brands.length === 0 && models.length === 0) return null;

        // Construimos condiciones OR para buscar por marca y/o modelo
        const conditions: any[] = [];

        for (const brand of brands) {
            conditions.push({ deviceBrand: { contains: brand, mode: 'insensitive' } });
        }
        for (const model of models) {
            conditions.push({ deviceModel: { contains: model, mode: 'insensitive' } });
        }

        if (conditions.length === 0) return null;

        const row = await (db as any).cerebroSchematic.findFirst({
            where: { OR: conditions },
            orderBy: { createdAt: 'desc' },
            select: { deviceBrand: true, deviceModel: true, filename: true, extractedText: true }
        });

        if (!row) return null;

        console.log(`[CEREBRO] 📋 Schematic encontrado: ${row.deviceBrand} ${row.deviceModel} (${row.filename})`);

        return {
            brand: row.deviceBrand,
            model: row.deviceModel,
            filename: row.filename,
            text: row.extractedText
        };
    } catch (err: any) {
        console.warn('[CEREBRO] ⚠️ findSchematic error:', err.message?.slice(0, 80));
        return null;
    }
}

/**
 * Formatea el contexto del schematic para inyectar en el system prompt.
 */
export function formatSchematicContext(match: SchematicMatch): string {
    return `\n\n### 📋 SCHEMATIC PRE-INDEXADO: ${match.brand} ${match.model} (${match.filename})\nUsá esta información del schematic EXCLUSIVAMENTE para el síntoma específico preguntado.\nNombrá los componentes reales, sus valores y testpoints.\n\n${match.text.slice(0, 4000)}`;
}
