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
    semanticScore: number;
    keywordScore: number;
    componentMatch: boolean;
};

export type RetrievalAdapter = {
    search(sql: string, params: readonly unknown[]): Promise<RetrievalRow[]>;
};

const HYBRID_SQL = `
WITH candidates AS (
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
        1 - (chunk.embedding <=> $5::vector) AS "semanticScore",
        ts_rank_cd(chunk.search_vector, plainto_tsquery('simple', $4)) AS "keywordScore",
        chunk.component_codes && $6::text[] AS "componentMatch"
    FROM rag_chunks AS chunk
    JOIN rag_documents AS document ON document.id = chunk.document_id
    LEFT JOIN rag_pages AS page ON page.id = chunk.page_id
    WHERE chunk.normalized_brand = $1
      AND document.status = 'READY'
      AND document.retired_at IS NULL
      AND (
          chunk.normalized_model = $2
          OR document.model_family = NULLIF($3, '')
          OR chunk.search_vector @@ plainto_tsquery('simple', $4)
          OR chunk.component_codes && $6::text[]
          OR 1 - (chunk.embedding <=> $5::vector) >= 0.3
      )
)
SELECT * FROM candidates
ORDER BY "semanticScore" DESC
LIMIT 50`;

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

function scoreRow(row: RetrievalRow, input: RetrievalInput): number {
    const exactModel = row.model === input.model ? 0.3 : 0;
    const family = input.modelFamily && row.modelFamily === input.modelFamily ? 0.1 : 0;
    const component = row.componentMatch ? 0.25 : 0;
    const fused = row.semanticScore * 0.45 + row.keywordScore * 0.25 + exactModel + family + component;
    return fused * AUTHORITY_WEIGHT[row.authority];
}

export async function retrieveCerebroSources(
    input: RetrievalInput,
    adapter: RetrievalAdapter = databaseAdapter,
): Promise<CerebroSource[]> {
    const vector = `[${input.embedding.join(",")}]`;
    const rows = await adapter.search(HYBRID_SQL, [
        input.brand,
        input.model,
        input.modelFamily ?? "",
        input.text,
        vector,
        input.componentCodes ?? [],
    ]);
    return rows
        .filter((row) => row.brand === input.brand)
        .map((row) => ({
            chunkId: row.chunkId,
            documentId: row.documentId,
            sourceType: row.sourceType,
            authority: row.authority,
            brand: row.brand,
            model: row.model,
            title: row.title,
            pageNumber: row.pageNumber,
            score: scoreRow(row, input),
        }))
        .sort((left, right) => {
            if (left.authority === "FAILED" && right.authority !== "FAILED") return 1;
            if (right.authority === "FAILED" && left.authority !== "FAILED") return -1;
            return right.score - left.score;
        })
        .slice(0, input.limit ?? 10);
}
