import { retrieveCerebroSources, type RetrievalInput } from './retrieval';
import { retrieveLibrarySources } from './library-retrieval';
import { requestQueryEmbedding } from './worker-client';
import type { CerebroSource } from './types';

type Dependencies = {
    embed: typeof requestQueryEmbedding;
    rag: typeof retrieveCerebroSources;
    library: typeof retrieveLibrarySources;
};
export async function retrieveTechnicalEvidence(input: Omit<RetrievalInput, 'embedding'>,
    dependencies: Dependencies = {embed: requestQueryEmbedding, rag: retrieveCerebroSources, library: retrieveLibrarySources},
): Promise<{sources: CerebroSource[]; unavailable: string[]}> {
    const [library, rag] = await Promise.allSettled([
        dependencies.library({...input, embedding: []}),
        dependencies.embed(input.text).then(embedding => dependencies.rag({...input, embedding})),
    ]);
    const indexed = library.status === 'fulfilled' ? library.value : [];
    const existing = rag.status === 'fulfilled' ? rag.value : [];
    const limit = input.limit ?? 8;
    // Preserve both existing repair evidence and indexed technical evidence.
    const quota = Math.min(indexed.length, existing.length ? Math.ceil(limit / 2) : limit);
    const selectedExisting = existing.slice(0, limit - quota);
    const repair = existing.find(source => source.sourceType === 'REPAIR');
    if (repair && selectedExisting.length && !selectedExisting.some(source => source.sourceType === 'REPAIR')) {
        selectedExisting[selectedExisting.length - 1] = repair;
    }
    const sources = [...indexed.slice(0, quota), ...selectedExisting];
    return {sources, unavailable: [library.status === 'rejected' ? 'biblioteca técnica' : '',
        rag.status === 'rejected' ? 'búsqueda semántica' : ''].filter(Boolean)};
}
