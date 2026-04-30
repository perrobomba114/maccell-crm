/**
 * MACCELL Cerebro — Schematic Library
 * Fase 4: busca schematics pre-indexados en cerebro_schematics
 * según la marca/modelo detectados en el mensaje del técnico.
 */

import { db } from '@/lib/db';
import { TECHNICAL_DICTIONARY } from '@/lib/technical-dictionary';

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

        // Búsqueda más agresiva: buscamos cada término del modelo y la marca por separado
        const searchTerms = [...new Set([
            ...brands,
            ...models,
            ...models.flatMap(m => m.split(/\s+/)).filter(t => t.length > 1) // Split "iPhone 12 Pro Max" -> ["iPhone", "12", "Pro", "Max"]
        ])];

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

        console.warn(`[DEBUG] [CEREBRO] 📋 Schematic encontrado: ${row.deviceBrand} ${row.deviceModel} (${row.filename})`);

        return {
            brand: row.deviceBrand,
            model: row.deviceModel,
            filename: row.filename,
            text: row.extractedText
        };
    } catch (err: unknown) {
        // La tabla puede no existir todavía si nadie subió schematics
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[CEREBRO] ⚠️ findSchematic error:', message.slice(0, 80));
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
    const limit = 3000;
    if (match.text.length <= limit) {
        return `\n\n### 📋 SCHEMATIC PRE-INDEXADO: ${match.brand} ${match.model} (${match.filename})\n\n${match.text}`;
    }

    // Buscar fragmento relevante
    const queryTerms = userQuery.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 3);

    // Expandir términos de búsqueda usando el diccionario
    const searchTerms = [...queryTerms];
    queryTerms.forEach((t: string) => {
        if (TECHNICAL_DICTIONARY[t]) {
            searchTerms.push(...TECHNICAL_DICTIONARY[t]);
        }
    });

    let foundIndex = -1;
    for (const term of searchTerms) {
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

    return `\n\n### 📋 DATOS TÉCNICOS DEL ESQUEMA: ${match.brand} ${match.model} (${match.filename})
⚠️ INSTRUCCIÓN NIVEL 3: No des consejos genéricos.
1. Identificá los ICs involucrados (ej: U3300/Tigris, U2700/PMIC).
2. Buscá las líneas de alimentación principales (VBUS, VCC_MAIN, VDD).
3. Entregá valores exactos de Voltaje (V) y Caída de Tensión (mV) de los test points (TP) o pines visibles abajo.

${extracted}`;
}
