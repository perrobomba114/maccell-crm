import { retrieveCerebroSources, type RetrievalInput } from './retrieval';
import { retrieveLibrarySources } from './library-retrieval';
import { requestQueryEmbedding } from './worker-client';
import { selectEvidence } from './evidence-selection';
import { retrieveRepairFallbackSources } from './repair-evidence-retrieval';
import type { CerebroSource } from './types';

export type RetrievalDependencies = {
    embed: typeof requestQueryEmbedding;
    rag: typeof retrieveCerebroSources;
    library: typeof retrieveLibrarySources;
    repairFallback: typeof retrieveRepairFallbackSources;
};
export async function retrieveTechnicalEvidence(input: Omit<RetrievalInput, 'embedding'>,
    dependencies: Partial<RetrievalDependencies> = {},
): Promise<{sources: CerebroSource[]; unavailable: string[]}> {
    const resolved: RetrievalDependencies = {embed: requestQueryEmbedding, rag: retrieveCerebroSources,
        library: retrieveLibrarySources, repairFallback: retrieveRepairFallbackSources, ...dependencies};
    const [library, rag] = await Promise.allSettled([
        resolved.library({...input, embedding: []}),
        resolved.embed(input.text).then(embedding => resolved.rag({...input, embedding})),
    ]);
    const indexed = library.status === 'fulfilled' ? library.value : [];
    let existing = rag.status === 'fulfilled' ? rag.value : [];
    let historicalSearchUnavailable = false;
    if (rag.status === 'rejected' || !existing.some(source => source.sourceType === 'REPAIR')) {
        try {
            const repairs = await resolved.repairFallback(input);
            existing = rag.status === 'fulfilled' ? [...existing, ...repairs] : repairs;
        } catch {
            historicalSearchUnavailable = true;
            if (rag.status === 'rejected') existing = [];
        }
    }
    const limit = input.limit ?? 8;
    const sources = selectEvidence([indexed, existing], limit);
    return {sources, unavailable: [library.status === 'rejected' ? 'biblioteca técnica' : '',
        rag.status === 'rejected' ? 'búsqueda semántica' : '',
        historicalSearchUnavailable ? 'búsqueda de reparaciones históricas' : ''].filter(Boolean)};
}
