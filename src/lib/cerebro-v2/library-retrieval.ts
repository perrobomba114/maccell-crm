import type { RetrievalInput } from './retrieval';
import type { CerebroSource } from './types';
import { expandTechnicalLexicon } from './lexicon';

type LibraryPayload = {
    version: number; assetId: string; sha256: string;
    pages: Array<{page: number; text: string; source?: string}>;
    components: Array<{id: string; name: string; kind: string; pads: Array<{id: string; name: string; netIndex: number | null}>}>;
    nets: Array<{id: string | number; name: string}>;
};
export type LibraryRow = {
    assetId: string;
    metadata: {brand?: string; model: string; aliases?: string[]; identityVerified?: boolean; status: string; sha256: string; kind: string; name: string};
    payload: LibraryPayload;
};
export type LibrarySearch = (sql: string, params: readonly unknown[]) => Promise<LibraryRow[]>;
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizeBrandKey = (b: string) => {
    const v = b.toLowerCase();
    if (v.includes('iphone') || v.includes('apple')) return 'apple';
    if (v.includes('samsung')) return 'samsung';
    if (v.includes('motorola') || v.includes('moto')) return 'motorola';
    return normalize(b);
};
const SQL = `SELECT a.id AS "assetId", a.metadata, i.payload
FROM schematics.assets a JOIN schematics.technical_indexes i ON i.asset_id = a.id
WHERE (a.metadata->>'identityVerified' = 'true' OR (a.metadata->>'identityVerified' IS NULL AND a.metadata->>'status' = 'ready'))
AND a.metadata->>'status' = 'ready'
AND (
    regexp_replace(lower(COALESCE(a.metadata->>'brand', '')), '[^a-z0-9]', '', 'g') = $1
    OR ($1 = 'apple' AND (a.metadata->>'brand' ILIKE '%iphone%' OR a.relative_path ILIKE '%iphone%'))
    OR ($1 = 'samsung' AND (a.metadata->>'brand' ILIKE '%samsung%' OR a.relative_path ILIKE '%samsung%'))
    OR ($1 = 'motorola' AND (a.metadata->>'brand' ILIKE '%motorola%' OR a.metadata->>'brand' ILIKE '%moto%' OR a.relative_path ILIKE '%moto%'))
)
AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(jsonb_build_array(a.metadata->>'model') || COALESCE(a.metadata->'aliases','[]'::jsonb)) AS models(value)
 WHERE regexp_replace(lower(models.value), '[^a-z0-9]', '', 'g') = ANY($2::text[]))
AND NOT EXISTS (SELECT 1 FROM schematics.index_jobs job WHERE job.asset_id = a.id AND job.status = 'failed')
AND i.asset_sha256 = a.sha256 AND i.asset_sha256 = a.metadata->>'sha256' AND i.index_version = 1
AND (
    EXISTS (SELECT 1 FROM unnest($3::text[]) term WHERE i.payload::text ILIKE '%' || term || '%')
    OR EXISTS (SELECT 1 FROM unnest($3::text[]) term WHERE a.name ILIKE '%' || term || '%')
)
ORDER BY (SELECT count(*) FROM jsonb_array_elements(COALESCE(i.payload->'components', '[]'::jsonb)) AS components(value)
 WHERE lower(components.value->>'name') = ANY($3::text[])) DESC,
 (SELECT count(*) FROM unnest($3::text[]) term WHERE (i.payload::text ILIKE '%' || term || '%' OR a.name ILIKE '%' || term || '%')) DESC, a.id LIMIT 200`;
const databaseSearch: LibrarySearch = async (sql, params) => {
    const { db } = await import('@/lib/db');
    return db.$queryRawUnsafe<LibraryRow[]>(sql, ...params);
};
const STOP = new Set(['para', 'con', 'sin', 'del', 'que', 'una', 'modelo', 'samsung', 'apple', 'motorola']);
export async function retrieveLibrarySources(input: RetrievalInput, search: LibrarySearch = databaseSearch): Promise<CerebroSource[]> {
    const models = [input.model, ...(input.modelAliases ?? [])].map(normalize).filter(Boolean);
    if (!normalize(input.brand) || !models.length) return [];
    const lexiconTerms = expandTechnicalLexicon(input.text);
    const rawTokens = [
        ...(input.componentCodes ?? []),
        ...(input.subsystemTerms ?? []),
        ...lexiconTerms,
        ...lexiconTerms.flatMap(t => t.split(/\s+/)),
        ...(input.text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9_]{3,}/gi) ?? [])
    ];
    const terms = [...new Set(rawTokens
        .map(term => term.toLowerCase()).filter(term => !STOP.has(term) && !models.includes(normalize(term))))].slice(0, 32);
    if (!terms.length) return [];
    const rows = await search(SQL, [normalizeBrandKey(input.brand), models, terms]);
    const sources: CerebroSource[] = [];
    for (const row of rows) {
        const {metadata: asset, payload} = row;
        if (asset.status !== 'ready' || asset.identityVerified === false || normalizeBrandKey(asset.brand ?? '') !== normalizeBrandKey(input.brand)
            || ![asset.model, ...(asset.aliases ?? [])].some(model => models.includes(normalize(model)))
            || payload.version !== 1 || payload.sha256 !== asset.sha256 || payload.assetId !== row.assetId) continue;
        const initialCount = sources.length;
        const add = (content: string, suffix: string, pageNumber: number | null, component?: string, net?: string) => {
            const tokens = new Set(content.toLowerCase().match(/[a-z0-9_]+/g) ?? []);
            const score = terms.filter(term => /^[a-z]{1,4}\d+[a-z]?$/i.test(term)
                ? tokens.has(term) : content.toLowerCase().includes(term)).length;
            if (!score) return;
            const params = new URLSearchParams({[asset.kind === 'pdf' ? 'pdf' : 'board']: row.assetId});
            if (pageNumber) params.set('page', String(pageNumber));
            if (component) params.set('component', component);
            if (net) params.set('net', net);
            sources.push({chunkId: `library:${row.assetId}:${suffix}`, documentId: row.assetId,
                sourceType: asset.kind === 'pdf' ? 'PDF' : 'BOARD', authority: 'TECHNICAL_DOCUMENT',
                brand: input.brand, model: input.model, title: asset.name, pageNumber, content,
                score: 1 + score / terms.length, workbenchUrl: `/technician/schematics?${params}`});
        };
        for (const page of payload.pages ?? []) {
            if (page.text && page.text.trim().length > 0) {
                // Overlap retains references crossing extraction chunk boundaries.
                for (let offset = 0; offset < page.text.length; offset += 1400) {
                    add(`${page.source === 'ocr' ? '[EVIDENCIA OCR: verificar lectura] ' : ''}${page.text.slice(offset, offset + 1600)}`, `page:${page.page}:${offset}`, page.page);
                }
            }
        }
        const netNames = new Map((payload.nets ?? []).map(net => [Number(net.id), net.name]));
        for (const component of payload.components ?? []) {
            const nets = component.pads.flatMap(pad => pad.netIndex === null ? [] : [netNames.get(pad.netIndex) ?? '']).filter(Boolean);
            add(`Componente ${component.name} (${component.kind}). Redes: ${[...new Set(nets)].join(', ')}. Geometría de placa; no representa mediciones eléctricas.`, component.id, null, component.name, nets.find(net => terms.includes(net.toLowerCase())));
        }
        if (sources.length === initialCount && asset.name) {
            const titleTokens = new Set((asset.name || '').toLowerCase().match(/[a-z0-9_]+/g) ?? []);
            const titleMatchCount = terms.filter(term => titleTokens.has(term) || (asset.name || '').toLowerCase().includes(term)).length;
            if (titleMatchCount > 0) {
                const params = new URLSearchParams({[asset.kind === 'pdf' ? 'pdf' : 'board']: row.assetId, page: '1'});
                const pageCount = payload.pages?.length ?? 1;
                const overviewContent = `Documento técnico: ${asset.name} (${asset.kind.toUpperCase()}, ${pageCount} pág.). Diagrama esquemático / guía de servicio para ${asset.model}. Inspección visual de pistas y componentes disponible en Workbench.`;
                sources.push({
                    chunkId: `library:${row.assetId}:overview`,
                    documentId: row.assetId,
                    sourceType: asset.kind === 'pdf' ? 'PDF' : 'BOARD',
                    authority: 'TECHNICAL_DOCUMENT',
                    brand: input.brand,
                    model: input.model,
                    title: asset.name,
                    pageNumber: 1,
                    content: overviewContent,
                    score: 1.2 + (titleMatchCount / terms.length),
                    workbenchUrl: `/technician/schematics?${params}`
                });
            }
        }
    }
    return sources.sort((a,b) => b.score-a.score).slice(0, input.limit ?? 8);
}
