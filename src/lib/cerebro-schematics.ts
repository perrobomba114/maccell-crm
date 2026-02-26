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

        // Búsqueda más agresiva: buscamos cada término del modelo y la marca por separado
        const searchTerms = [...new Set([...brands, ...models])];

        const row = await db.cerebroSchematic.findFirst({
            where: {
                OR: [
                    ...searchTerms.map(term => ({ deviceBrand: { contains: term, mode: 'insensitive' as const } })),
                    ...searchTerms.map(term => ({ deviceModel: { contains: term, mode: 'insensitive' as const } }))
                ]
            },
            orderBy: { createdAt: 'desc' }
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
        // La tabla puede no existir todavía si nadie subió schematics
        console.warn('[CEREBRO] ⚠️ findSchematic error:', err.message?.slice(0, 80));
        return null;
    }
}

/**
 * Formatea el contexto del schematic para inyectar en el system prompt.
 * 
 * MEJORA: Búsqueda de Ventana Inteligente.
 * Si el texto es muy largo, buscamos palabras clave del usuario dento de los 100k 
 * para extraer la 'ventana' más relevante, no solo los primeros 8k.
 */
export function formatSchematicContext(match: SchematicMatch, userQuery = ''): string {
    const limit = 8000;
    if (match.text.length <= limit) {
        return `\n\n### 📋 SCHEMATIC PRE-INDEXADO: ${match.brand} ${match.model} (${match.filename})\n\n${match.text}`;
    }

    // Buscar fragmento relevante
    const queryTerms = userQuery.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 3);

    let foundIndex = -1;
    for (const term of queryTerms) {
        const idx = match.text.toLowerCase().indexOf(term);
        if (idx !== -1) {
            foundIndex = idx;
            break;
        }
    }

    // Si no encontramos término, buscamos "Charging", "Power", "Display" como fallback
    if (foundIndex === -1) {
        const generalTerms = ['charge', 'pmu', 'power', 'vcc', 'display', 'image', 'backlight', 'audio'];
        for (const term of generalTerms) {
            const idx = match.text.toLowerCase().indexOf(term);
            if (idx !== -1) {
                foundIndex = idx;
                break;
            }
        }
    }

    let extracted = '';
    if (foundIndex === -1) {
        // Fallback: principio
        extracted = match.text.slice(0, limit) + '\n[...truncado por longitud...]';
    } else {
        // Ventana centrada o inicio desde el match
        const start = Math.max(0, foundIndex - 500);
        extracted = `[...Fragmento extraído de la sección relevante...]\n\n` +
            match.text.slice(start, start + limit) +
            '\n[...truncado por longitud...]';
    }

    return `\n\n### 📋 SCHEMATIC PRE-INDEXADO: ${match.brand} ${match.model} (${match.filename})\nUsá esta información del schematic EXCLUSIVAMENTE para el síntoma específico preguntado.\nNombrá los componentes reales, sus valores y testpoints.\n\n${extracted}`;
}
