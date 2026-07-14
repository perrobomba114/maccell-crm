import { queryRag } from "./rag-db";
import type { CerebroAuthority, CerebroSource, CerebroSourceType } from "./types";

export type RetrievalInput = {
    brand: string;
    model: string;
    modelFamily?: string;
    text: string;
    embedding: readonly number[];
    componentCodes?: readonly string[];
    limit?: number;
};

export type RetrievalRow = {
    chunkId: string;
    documentId: string;
    sourceType: CerebroSourceType;
    authority: CerebroAuthority;
    brand: string;
    model: string;
    modelFamily: string | null;
    title: string;
    pageNumber: number | null;
    content: string;
    semanticScore: number;
    keywordScore: number;
    componentMatch: boolean;
};

export type RetrievalAdapter = {
    search(sql: string, params: readonly unknown[]): Promise<RetrievalRow[]>;
};

const HYBRID_SQL = `
WITH semantic_ids AS (
    SELECT chunk.id
    FROM rag_chunks AS chunk
    JOIN rag_documents AS document ON document.id = chunk.document_id
    WHERE chunk.normalized_brand = $1
      AND document.status = 'READY'
      AND document.retired_at IS NULL
    ORDER BY chunk.embedding <=> $3::vector
    LIMIT 40
), keyword_ids AS (
    SELECT chunk.id
    FROM rag_chunks AS chunk
    JOIN rag_documents AS document ON document.id = chunk.document_id
    WHERE chunk.normalized_brand = $1
      AND document.status = 'READY'
      AND document.retired_at IS NULL
      AND chunk.search_vector @@ plainto_tsquery('simple', $2)
    ORDER BY ts_rank_cd(chunk.search_vector, plainto_tsquery('simple', $2)) DESC
    LIMIT 40
), component_ids AS (
    SELECT chunk.id
    FROM rag_chunks AS chunk
    JOIN rag_documents AS document ON document.id = chunk.document_id
    WHERE chunk.normalized_brand = $1
      AND document.status = 'READY'
      AND document.retired_at IS NULL
      AND chunk.component_codes && $4::text[]
    LIMIT 20
), candidate_ids AS (
    SELECT id FROM semantic_ids
    UNION SELECT id FROM keyword_ids
    UNION SELECT id FROM component_ids
)
    SELECT
        chunk.id::text AS "chunkId",
        document.id::text AS "documentId",
        document.source_type::text AS "sourceType",
        chunk.authority::text AS authority,
        chunk.normalized_brand AS brand,
        chunk.normalized_model AS model,
        document.model_family AS "modelFamily",
        document.title,
        page.page_number AS "pageNumber",
        chunk.content,
        1 - (chunk.embedding <=> $3::vector) AS "semanticScore",
        ts_rank_cd(chunk.search_vector, plainto_tsquery('simple', $2)) AS "keywordScore",
        chunk.component_codes && $4::text[] AS "componentMatch"
    FROM candidate_ids AS candidate
    JOIN rag_chunks AS chunk ON chunk.id = candidate.id
    JOIN rag_documents AS document ON document.id = chunk.document_id
    LEFT JOIN rag_pages AS page ON page.id = chunk.page_id
    WHERE chunk.normalized_brand = $1`;

const AUTHORITY_WEIGHT: Readonly<Record<CerebroAuthority, number>> = {
    CONFIRMED_SUCCESS: 1,
    TECHNICAL_DOCUMENT: 0.95,
    INCOMPLETE: 0.5,
    FAILED: 0.15,
    UNVERIFIED_ATTACHMENT: 0.25,
};

const databaseAdapter: RetrievalAdapter = {
    search: (sql, params) => queryRag<RetrievalRow>(sql, params),
};

function scoreRow(row: RetrievalRow, input: RetrievalInput, semanticRank: number, keywordRank: number): number {
    const exactModel = row.model === input.model ? 0.3 : 0;
    const family = input.modelFamily && row.modelFamily === input.modelFamily ? 0.1 : 0;
    const component = row.componentMatch ? 0.25 : 0;
    const reciprocalRankFusion = 30 * (1 / (60 + semanticRank) + 1 / (60 + keywordRank));
    const fused = reciprocalRankFusion + exactModel + family + component;
    return fused * AUTHORITY_WEIGHT[row.authority];
}

export async function retrieveCerebroSources(
    input: RetrievalInput,
    adapter: RetrievalAdapter = databaseAdapter,
): Promise<CerebroSource[]> {
    const vector = `[${input.embedding.join(",")}]`;
    const rows = await adapter.search(HYBRID_SQL, [
        input.brand,
        input.text,
        vector,
        input.componentCodes ?? [],
    ]);
    const semanticRanks = new Map(
        [...rows].sort((left, right) => right.semanticScore - left.semanticScore)
            .map((row, index) => [row.chunkId, index + 1]),
    );
    const keywordRanks = new Map(
        [...rows].sort((left, right) => right.keywordScore - left.keywordScore)
            .map((row, index) => [row.chunkId, index + 1]),
    );
    const allowedRows = rows.filter((row) => (
        row.brand === input.brand
        && (row.sourceType === "REPAIR" || row.sourceType === "PDF")
    ));
    const scopedRows = allowedRows.filter((row) => row.model === input.model);
    return scopedRows
        .map((row) => ({
            chunkId: row.chunkId,
            documentId: row.documentId,
            sourceType: row.sourceType,
            authority: row.authority,
            brand: row.brand,
            model: row.model,
            title: row.title,
            pageNumber: row.pageNumber,
            content: row.content,
            score: scoreRow(
                row,
                input,
                semanticRanks.get(row.chunkId) ?? scopedRows.length,
                keywordRanks.get(row.chunkId) ?? scopedRows.length,
            ),
        }))
        .sort((left, right) => {
            if (left.authority === "FAILED" && right.authority !== "FAILED") return 1;
            if (right.authority === "FAILED" && left.authority !== "FAILED") return -1;
            return right.score - left.score;
        })
        .slice(0, input.limit ?? 10);
}
