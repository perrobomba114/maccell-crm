/**
 * Cerebro AI — Web Search gratuito sin API key
 *
 * Estrategia de 2 capas:
 * 1. DuckDuckGo HTML scraping (sin API) → obtiene URLs relevantes
 * 2. Jina AI Reader (r.jina.ai) → extrae el contenido de las mejores URLs
 *
 * Fuentes priorizadas: iFixit, GSM Forum, Board Repair Talk, YouTube Tech
 * Sin costo, sin API keys, sin límites por pago.
 */

export interface WebSearchResult {
    title: string;
    url: string;
    content: string;
    source: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGERS — cuándo activar la búsqueda web
// ─────────────────────────────────────────────────────────────────────────────

const COMPONENT_TRIGGERS = [
    // Reemplazos y alternativas
    'reemplazo', 'alternativa', 'sustituto', 'equivalente', 'sustituir',
    'ic alternativo', 'chip alternativo', 'codigo alternativo',
    // Disponibilidad
    'donde consigo', 'dónde consigo', 'donde compro', 'dónde compro',
    'conseguir', 'precio', 'valor', 'stock',
    // Información técnica reciente
    'datasheet', 'hoja de datos', 'pinout', 'diagrama de pines',
    // Fallas conocidas / batch
    'batch', 'lote defectuoso', 'falla masiva', 'recall',
    'problema conocido', 'falla comun', 'falla común',
    // Actualizaciones
    'nuevo ic', 'ultima version', 'última versión', 'version actual',
    '2024', '2025',
];

const SPECIFIC_COMPONENT_PATTERNS = [
    // iPhone específicos
    /tristar/i, /hydra/i, /tigris/i, /maverick/i, /u2/i,
    /nand.*iphone/i, /iphone.*nand/i,
    /face id/i, /dot projector/i, /flood illuminator/i,
    // Samsung específicos
    /s2mpu/i, /max77\d+/i, /exynos.*pmic/i,
    // Componentes genéricos con código
    /u\d{3,4}/i, /ic\s+\d/i, /[a-z]{2,4}\d{4,}/i,
];

export function shouldTriggerWebSearch(
    query: string,
    ragResultCount: number,
    brand?: string
): boolean {
    const lower = query.toLowerCase();

    // Trigger explícito: el técnico pregunta por reemplazo/alternativa/etc.
    const hasWebKeyword = COMPONENT_TRIGGERS.some(kw => lower.includes(kw));
    if (hasWebKeyword) return true;

    // Trigger por componente específico mencionado + RAG insuficiente
    const hasComponentPattern = SPECIFIC_COMPONENT_PATTERNS.some(p => p.test(query));
    if (hasComponentPattern && ragResultCount < 2) return true;

    // RAG vacío para query sustancial
    if (ragResultCount === 0 && query.length > 30) return true;

    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// BÚSQUEDA EN DUCKDUCKGO sin API key
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrae URLs de resultados usando la API HTML de DDG (sin key, sin límite pagado)
 * Filtra por dominios de reparación conocidos.
 */
async function searchDDG(query: string, maxResults = 5): Promise<{ title: string; url: string }[]> {
    const REPAIR_DOMAINS = [
        'ifixit.com',
        'gsm-forum.com',
        'boardrepairguide.com',
        'jensa.io',
        'youtube.com',
        'xda-developers.com',
        'reddit.com/r/mobilerepair',
        'reddit.com/r/datarecovery',
    ];

    try {
        const searchQuery = `${query} reparacion electronica`;
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
            },
            signal: AbortSignal.timeout(6000),
        });

        if (!response.ok) return [];

        const html = await response.text();

        // Extraer URLs del HTML de DDG
        const linkRegex = /href="\/\/duckduckgo\.com\/l\/\?uddg=([^"&]+)/g;
        const titleRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([^<]+)<\/a>/g;

        const urls: string[] = [];
        const titles: string[] = [];

        let match;
        while ((match = linkRegex.exec(html)) !== null) {
            try {
                const decoded = decodeURIComponent(match[1]);
                urls.push(decoded);
            } catch { /* skip */ }
        }

        while ((match = titleRegex.exec(html)) !== null) {
            titles.push(match[1].trim().replace(/&amp;/g, '&').replace(/&#x27;/g, "'"));
        }

        // Priorizar dominios de reparación
        const ranked = urls
            .map((url, i) => ({ url, title: titles[i] || url }))
            .filter(r => {
                try {
                    const domain = new URL(r.url).hostname;
                    return REPAIR_DOMAINS.some(d => domain.includes(d));
                } catch { return false; }
            })
            .slice(0, maxResults);

        // Si no encontró en dominios preferidos, usar los primeros resultados válidos
        if (ranked.length === 0) {
            const fallback = urls
                .filter(u => u.startsWith('http') && !u.includes('duckduckgo'))
                .map((url, i) => ({ url, title: titles[i] || url }))
                .slice(0, 3);
            return fallback;
        }

        return ranked;
    } catch (err: any) {
        console.warn('[WEB_SEARCH] DDG error:', err.message?.slice(0, 80));
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// LECTOR DE PÁGINAS con Jina AI (r.jina.ai — gratuito, sin API key)
// ─────────────────────────────────────────────────────────────────────────────

async function readWithJina(url: string, maxChars = 2500): Promise<string> {
    try {
        const jinaUrl = `https://r.jina.ai/${url}`;

        const response = await fetch(jinaUrl, {
            headers: {
                'Accept': 'text/plain',
                'X-Return-Format': 'markdown',
                'X-No-Cache': 'true',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.warn(`[WEB_SEARCH] Jina ${response.status} for ${url.slice(0, 60)}`);
            return '';
        }

        const text = await response.text();
        // Limpiar y truncar
        return text
            .replace(/\[.*?\]\(.*?\)/g, match => match) // preservar links
            .replace(/\n{3,}/g, '\n\n')
            .trim()
            .slice(0, maxChars);
    } catch (err: any) {
        console.warn('[WEB_SEARCH] Jina error:', err.message?.slice(0, 80));
        return '';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca en la web usando DDG (sin API) + Jina Reader (sin API).
 * Retorna los mejores resultados en formato listo para inyectar en el prompt.
 */
export async function cerebroWebSearch(
    query: string,
    brand?: string
): Promise<string> {
    const refinedQuery = brand && brand !== 'Desconocido'
        ? `${brand} ${query}`
        : query;

    console.log(`[WEB_SEARCH] 🌐 Buscando: "${refinedQuery.slice(0, 80)}"`);

    // Paso 1: Obtener URLs de DDG
    const ddgResults = await searchDDG(refinedQuery, 4);

    if (ddgResults.length === 0) {
        console.log('[WEB_SEARCH] Sin resultados DDG');
        return '';
    }

    console.log(`[WEB_SEARCH] DDG encontró ${ddgResults.length} URLs`);

    // Paso 2: Leer el contenido de las primeras 2 URLs con Jina
    const readings = await Promise.allSettled(
        ddgResults.slice(0, 2).map(r => readWithJina(r.url))
    );

    const results: WebSearchResult[] = [];

    readings.forEach((settled, i) => {
        if (settled.status === 'fulfilled' && settled.value.length > 100) {
            const url = ddgResults[i].url;
            let source = 'Web';
            try {
                source = new URL(url).hostname.replace('www.', '');
            } catch { /* ok */ }

            results.push({
                title: ddgResults[i].title,
                url,
                content: settled.value,
                source,
            });
        }
    });

    if (results.length === 0) {
        console.log('[WEB_SEARCH] Jina no pudo leer ninguna URL');
        return '';
    }

    console.log(`[WEB_SEARCH] ✅ ${results.length} páginas leídas exitosamente`);

    return formatWebResults(results);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATEADOR
// ─────────────────────────────────────────────────────────────────────────────

function formatWebResults(results: WebSearchResult[]): string {
    const today = new Date().toLocaleDateString('es-AR');
    const blocks = results.map((r, i) =>
        `[🌐 FUENTE WEB ${i + 1} — ${r.source}]\nURL: ${r.url}\n${r.content}`
    );

    return `\n\n### 🌐 INFORMACIÓN WEB EN TIEMPO REAL (${today})
⚠️ INSTRUCCIÓN: Esta información es más reciente que tu entrenamiento. Si hay datos de reemplazo de componentes, ICs alternativos, o soluciones documentadas aquí para ESTA MARCA, deben tener PRIORIDAD sobre tu conocimiento base.
${blocks.join('\n\n')}
`;
}
