export type RagCoverageSnapshot = {
    status: string;
    indexablePages: number | null;
    pagesWithVectors: number | null;
    currentChunks: number | null;
    totalPdfDocuments: number | null;
    matchedDocuments: number | null;
    readyDocuments: number | null;
    dimensions: number | null;
};

/** A live connection is not enough: Cerebro needs current, dimension-compatible coverage. */
export function isTechnicalRagOperational(snapshot: RagCoverageSnapshot): boolean {
    return snapshot.status === "idle"
        && snapshot.totalPdfDocuments !== null
        && snapshot.totalPdfDocuments > 0
        && snapshot.matchedDocuments === snapshot.totalPdfDocuments
        && snapshot.readyDocuments === snapshot.totalPdfDocuments
        && snapshot.indexablePages !== null
        && snapshot.indexablePages > 0
        && snapshot.pagesWithVectors === snapshot.indexablePages
        && snapshot.currentChunks !== null
        && snapshot.currentChunks > 0
        && snapshot.dimensions === 1024;
}
