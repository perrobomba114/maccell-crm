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
    // Síntomas diagnósticos — siempre buscar soluciones documentadas
    'no enciende', 'no prende', 'no carga', 'no cargando', 'no arranca',
    'pantalla negra', 'sin imagen', 'sin video', 'sin backlight',
    'bootloop', 'boot loop', 'reinicia solo', 'se reinicia',
    'no conecta', 'sin señal', 'sin red', 'no hay señal',
    'no carga batería', 'no reconoce batería',
    'corto', 'cortocircuito', 'quemado',
    'mojado', 'cayó al agua', 'oxidado',
    'pantalla rota', 'touch no funciona', 'no responde',
    'no reconoce sim', 'sim no detecta',
    'cámara no funciona', 'face id no funciona',
    'no sound', 'sin audio', 'microfono', 'micrófono',
    'hot', 'se calienta', 'sobrecalentamiento',
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
    _brand?: string
): boolean {
    const lower = query.toLowerCase();

    // Trigger explícito: el técnico pregunta por reemplazo/alternativa/etc.
    const hasWebKeyword = COMPONENT_TRIGGERS.some(kw => lower.includes(kw));
    if (hasWebKeyword) return true;

    // Trigger por componente específico mencionado + RAG insuficiente
    const hasComponentPattern = SPECIFIC_COMPONENT_PATTERNS.some(p => p.test(query));
    if (hasComponentPattern && ragResultCount < 2) return true;

    // RAG vacío o escaso para query sustancial
    if (ragResultCount < 2 && query.length > 20) return true;

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
        // Internacionales técnicos
        'ifixit.com',
        'gsm-forum.com',
        'boardrepairguide.com',
        'jensa.io',
        'xda-developers.com',
        'reddit.com/r/mobilerepair',
        'reddit.com/r/datarecovery',
        'rossmanngroup.com',
        'phoneguru.org',
        // LatAm / Español
        'forosdeelectronica.com',
        'taringa.net',
        'celulares.com',
        'reparaciondecelulares.net',
        'comunidadelectronicos.com',
        'tutoelectro.com',
        'tecnoreparaciones.com',
        'electroforos.com',
        // YouTube (tutoriales en español)
        'youtube.com',
    ];

    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

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

        // Si no encontró suficientes en dominios preferidos, completar con resultados generales
        if (ranked.length < 2) {
            const extra = urls
                .filter(u => u.startsWith('http') && !u.includes('duckduckgo') && !ranked.some(r => r.url === u))
                .map(u => ({ url: u, title: titles[urls.indexOf(u)] || u }))
                .slice(0, maxResults - ranked.length);
            return [...ranked, ...extra];
        }

        return ranked;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[WEB_SEARCH] DDG error:', message.slice(0, 80));
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH DIRECTO + EXTRACCIÓN DE TEXTO HTML (sin dependencias externas)
// ─────────────────────────────────────────────────────────────────────────────

/** Encuentra el índice de inicio del contenido principal usando marcadores conocidos */
function findContentStart(html: string): number {
    const CONTENT_MARKERS = [
        // iFixit wiki / guías
        'itemprop="text"',
        'wikiRenderedText',
        'guide-steps',
        // Foros phpBB / XDA / GSM Forum
        'class="post_body"',
        'class="postbody"',
        'class="message-body"',
        'class="postcontent"',
        // WordPress / blogs genéricos
        'class="entry-content"',
        'class="post-content"',
        'class="article-body"',
        // Semánticos HTML5
        '<main',
        '<article',
    ];

    for (const marker of CONTENT_MARKERS) {
        const idx = html.indexOf(marker);
        if (idx !== -1) {
            // Avanzar hasta el cierre del tag de apertura
            const tagEnd = html.indexOf('>', idx);
            return tagEnd !== -1 ? tagEnd + 1 : idx;
        }
    }
    return -1;
}

function extractTextFromHtml(html: string, maxChars: number): string {
    // 1. Eliminar bloques de ruido antes de procesar
    let cleaned = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
        .replace(/<header[\s\S]*?<\/header>/gi, ' ')
        .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
        .replace(/<form[\s\S]*?<\/form>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');

    // 2. Intentar aislar el bloque de contenido principal
    const contentStart = findContentStart(cleaned);
    if (contentStart !== -1) {
        // Tomar hasta 30k chars desde el inicio del contenido (suficiente para cualquier artículo)
        cleaned = cleaned.slice(contentStart, contentStart + 30000);
    }

    // 3. Convertir etiquetas estructurales en texto legible
    cleaned = cleaned
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<h[1-6][^>]*>/gi, '\n## ')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(td|th)[^>]*>/gi, ' | ')
        .replace(/<\/tr>/gi, '\n');

    // 4. Quitar tags restantes y decodificar entidades HTML
    return cleaned
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\s{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, maxChars);
}

async function fetchPage(url: string, maxChars = 3000): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
                'Cache-Control': 'no-cache',
            },
            signal: AbortSignal.timeout(8000),
            redirect: 'follow',
        });

        if (!response.ok) {
            console.warn(`[WEB_FETCH] ${response.status} para ${url.slice(0, 60)}`);
            return '';
        }

        const html = await response.text();
        const text = extractTextFromHtml(html, maxChars);

        if (text.length < 150) {
            console.warn(`[WEB_FETCH] Contenido muy corto (${text.length} chars) en ${url.slice(0, 60)}`);
            return '';
        }

        return text;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[WEB_FETCH] Error:', message.slice(0, 80));
        return '';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca en la web usando DDG (sin API) + fetch directo con extracción HTML.
 * Sin dependencias externas ni API keys.
 */
export async function cerebroWebSearch(
    query: string,
    brand?: string
): Promise<string> {
    const refinedQuery = brand && brand !== 'Desconocido'
        ? `${brand} ${query}`
        : query;

    console.warn(`[DEBUG] [WEB_SEARCH] 🌐 Buscando: "${refinedQuery.slice(0, 80)}"`);

    // Traducir síntomas comunes al inglés para mejor cobertura en iFixit/GSM Forum
    const englishQuery = refinedQuery
        .replace(/no enciende/gi, 'not turning on')
        .replace(/no prende/gi, 'not turning on')
        .replace(/no carga/gi, 'not charging')
        .replace(/no arranca/gi, 'not booting')
        .replace(/pantalla negra/gi, 'black screen')
        .replace(/sin imagen/gi, 'no display')
        .replace(/corto circuito|corto/gi, 'short circuit')
        .replace(/mojado|agua/gi, 'water damage')
        .replace(/no enciende/gi, 'not turning on')
        .replace(/reinicia solo/gi, 'random reboot')
        .replace(/bootloop/gi, 'bootloop stuck')
        + ' board repair fix';

    // Query en español con términos LatAm
    const spanishQuery = refinedQuery + ' reparacion placa solucion';

    const [ddgResultsEs, ddgResultsEn] = await Promise.all([
        searchDDG(spanishQuery, 3),
        searchDDG(englishQuery, 3),
    ]);

    // Combinar y deduplicar por URL
    const seen = new Set<string>();
    const ddgResults = [...ddgResultsEs, ...ddgResultsEn].filter(r => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
    }).slice(0, 5);

    if (ddgResults.length === 0) {
        console.warn('[DEBUG] [WEB_SEARCH] Sin resultados DDG');
        return '';
    }

    console.warn(`[DEBUG] [WEB_SEARCH] DDG encontró ${ddgResults.length} URLs`);

    // Paso 2: Fetch directo de las primeras 3 URLs y extraer texto del HTML
    const readings = await Promise.allSettled(
        ddgResults.slice(0, 3).map(r => fetchPage(r.url))
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
        console.warn('[DEBUG] [WEB_SEARCH] Jina no pudo leer ninguna URL');
        return '';
    }

    console.warn(`[DEBUG] [WEB_SEARCH] ✅ ${results.length} páginas leídas exitosamente`);

    return formatWebResults(results);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATEADOR
// ─────────────────────────────────────────────────────────────────────────────

const MAX_WEB_CONTEXT_CHARS = 6000; // Kimi K2 / Llama 70B soportan contexto grande — más contenido = mejor diagnóstico

function formatWebResults(results: WebSearchResult[]): string {
    const today = new Date().toLocaleDateString('es-AR');
    const header = `\n\n### 🌐 INFORMACIÓN WEB EN TIEMPO REAL (${today})
⚠️ INSTRUCCIÓN CRÍTICA: Extraé de estos bloques datos técnicos concretos: voltajes, ICs, componentes, pasos de reparación, causas raíz.
- Si hay componentes específicos mencionados para ESTA MARCA+MODELO → incluilos en tu análisis.
- Citá la fuente en la sección Evidencia: [WEB / nombre-del-sitio.com].
- Si el contenido web contradice tu conocimiento base → prevalece el contenido web para este modelo específico.\n`;

    const charsPerSource = Math.floor(MAX_WEB_CONTEXT_CHARS / results.length);
    const blocks = results.map((r, i) => {
        const content = r.content.slice(0, charsPerSource);
        return `[🌐 FUENTE WEB ${i + 1} — ${r.source}]\nTítulo: ${r.title}\nURL: ${r.url}\n---\n${content}\n---`;
    });

    return header + blocks.join('\n\n') + '\n';
}
