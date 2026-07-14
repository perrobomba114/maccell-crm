import { queryRag } from "./rag-db";
import type { CerebroAuthority, CerebroSource, CerebroSourceType } from "./types";

export type RetrievalInput = {
    brand: string;
    model: string;
    modelAliases?: readonly string[];
    modelFamily?: string;
    text: string;
    embedding: readonly number[];
    componentCodes?: readonly string[];
    subsystemTerms?: readonly string[];
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
    section: string | null;
    subsystems: string[];
    identityMatch: boolean;
};

export type RetrievalAdapter = {
    search(sql: string, params: readonly unknown[]): Promise<RetrievalRow[]>;
};

const HYBRID_SQL = `
WITH input_models AS (
    SELECT unnest($4::text[]) AS model
), resolved_models AS (
    SELECT model FROM input_models
    UNION
    SELECT alias.canonical_model
    FROM rag_device_aliases AS alias
    WHERE alias.normalized_brand = $1
      AND alias.normalized_alias IN (SELECT model FROM input_models)
    UNION
    SELECT alias.normalized_alias
    FROM rag_device_aliases AS alias
    WHERE alias.normalized_brand = $1
      AND alias.canonical_model IN (SELECT model FROM input_models)
), semantic_pdf_ids AS (
    SELECT chunk.id
    FROM rag_chunks AS chunk
    JOIN rag_documents AS document ON document.id = chunk.document_id
    WHERE chunk.normalized_brand = $1
      AND chunk.normalized_model IN (SELECT model FROM resolved_models)
      AND document.source_type = 'PDF'
      AND document.status = 'READY'
      AND document.retired_at IS NULL
    ORDER BY chunk.embedding <=> $2::vector
    LIMIT 40
), semantic_repair_ids AS (
    SELECT chunk.id
    FROM rag_chunks AS chunk
    JOIN rag_documents AS document ON document.id = chunk.document_id
    WHERE chunk.normalized_brand = $1
      AND chunk.normalized_model IN (SELECT model FROM resolved_models)
      AND document.source_type = 'REPAIR'
      AND document.status = 'READY'
      AND document.retired_at IS NULL
    ORDER BY chunk.embedding <=> $2::vector
    LIMIT 20
), keyword_pdf_ids AS (
    SELECT chunk.id
    FROM rag_chunks AS chunk
    JOIN rag_documents AS document ON document.id = chunk.document_id
    WHERE chunk.normalized_brand = $1
      AND chunk.normalized_model IN (SELECT model FROM resolved_models)
      AND document.source_type = 'PDF'
      AND document.status = 'READY'
      AND document.retired_at IS NULL
      AND chunk.search_vector @@ websearch_to_tsquery('simple', $5)
    ORDER BY ts_rank_cd(chunk.search_vector, websearch_to_tsquery('simple', $5)) DESC
    LIMIT 40
), keyword_repair_ids AS (
    SELECT chunk.id
    FROM rag_chunks AS chunk
    JOIN rag_documents AS document ON document.id = chunk.document_id
    WHERE chunk.normalized_brand = $1
      AND chunk.normalized_model IN (SELECT model FROM resolved_models)
      AND document.source_type = 'REPAIR'
      AND document.status = 'READY'
      AND document.retired_at IS NULL
      AND chunk.search_vector @@ websearch_to_tsquery('simple', $5)
    ORDER BY ts_rank_cd(chunk.search_vector, websearch_to_tsquery('simple', $5)) DESC
    LIMIT 20
), component_ids AS (
    SELECT chunk.id
    FROM rag_chunks AS chunk
    JOIN rag_documents AS document ON document.id = chunk.document_id
    WHERE chunk.normalized_brand = $1
      AND chunk.normalized_model IN (SELECT model FROM resolved_models)
      AND document.status = 'READY'
      AND document.retired_at IS NULL
      AND chunk.component_codes && $3::text[]
    LIMIT 20
), candidate_ids AS (
    SELECT id FROM semantic_pdf_ids
    UNION SELECT id FROM semantic_repair_ids
    UNION SELECT id FROM keyword_pdf_ids
    UNION SELECT id FROM keyword_repair_ids
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
        true AS "identityMatch",
        chunk.section,
        COALESCE(ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(chunk.metadata->'subsystems', '[]'::jsonb))
        ), '{}'::text[]) AS subsystems,
        1 - (chunk.embedding <=> $2::vector) AS "semanticScore",
        ts_rank_cd(chunk.search_vector, websearch_to_tsquery('simple', $5)) AS "keywordScore",
        chunk.component_codes && $3::text[] AS "componentMatch"
    FROM candidate_ids AS candidate
    JOIN rag_chunks AS chunk ON chunk.id = candidate.id
    JOIN rag_documents AS document ON document.id = chunk.document_id
    LEFT JOIN rag_pages AS page ON page.id = chunk.page_id
    WHERE chunk.normalized_brand = $1
      AND chunk.normalized_model IN (SELECT model FROM resolved_models)`;

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

const KEYWORD_STOP_WORDS = new Set([
    "DEL", "LAS", "LOS", "PARA", "PERO", "QUE", "CON", "POR", "UNA", "UNO",
    "REVISAR", "PRESUPUESTAR", "DISPOSITIVO", "SAMSUNG", "APPLE", "MOTOROLA",
    "XIAOMI", "HUAWEI", "TECHNICAL", "CHECK", "SERVICE",
]);

function keywordSearchQuery(value: string): string {
    const tokens = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toUpperCase().match(/[A-Z0-9_]{3,}/g) ?? [];
    const useful = [...new Set(tokens.filter((token) => !KEYWORD_STOP_WORDS.has(token)))].slice(0, 32);
    return useful.length > 0 ? useful.join(" OR ") : "DIAGNOSTICO";
}

function confirmedRepairText(content: string): string {
    const diagnosis = content.match(/DIAGNOSTICO:\s*([\s\S]*?)(?=\n(?:SOLUCION|REPUESTOS|ESTADO|EVIDENCIA):|$)/i)?.[1] ?? "";
    const solution = content.match(/SOLUCION:\s*([\s\S]*?)(?=\n(?:REPUESTOS|ESTADO|EVIDENCIA):|$)/i)?.[1] ?? "";
    return `${diagnosis} ${solution}`;
}

function repairEvidenceIsRelevant(row: RetrievalRow, input: RetrievalInput): boolean {
    if (row.sourceType !== "REPAIR") return true;
    const rfSearch = (input.subsystemTerms ?? []).some((term) => (
        /^(?:RF|SIM|BASEBAND|ANTENNA|NETWORK|UIM)/i.test(term)
    ));
    if (!rfSearch) return true;
    return /SIM|CHIP|IMEI|ANTENA|ANTENNA|BASEBAND|SEÑAL|SENAL|NETWORK|RED/i
        .test(confirmedRepairText(row.content));
}

function scoreRow(row: RetrievalRow, input: RetrievalInput, semanticRank: number, keywordRank: number): number {
    const exactModel = row.model === input.model ? 0.3 : 0;
    const family = input.modelFamily && row.modelFamily === input.modelFamily ? 0.1 : 0;
    const component = row.componentMatch ? 0.25 : 0;
    const subsystemTerms = input.subsystemTerms ?? [];
    const searchable = `${row.section ?? ""} ${row.subsystems.join(" ")} ${row.content}`.toUpperCase();
    const subsystem = subsystemTerms.some((term) => searchable.includes(term.toUpperCase())) ? 0.18 : 0;
    const technicalDocument = row.sourceType === "PDF" ? 0.15 : 0;
    const manufacturerTroubleshooting = row.sourceType === "PDF"
        && /TROUBLESHOOT|SERVICE MANUAL|MANUAL DE SERVICIO|LEVEL 3 REPAIR/i.test(`${row.title} ${row.section ?? ""} ${row.content}`)
        ? 0.8
        : 0;
    const reciprocalRankFusion = 30 * (1 / (60 + semanticRank) + 1 / (60 + keywordRank));
    const fused = reciprocalRankFusion + exactModel + family + component + subsystem
        + technicalDocument + manufacturerTroubleshooting;
    return fused * AUTHORITY_WEIGHT[row.authority];
}

export async function retrieveCerebroSources(
    input: RetrievalInput,
    adapter: RetrievalAdapter = databaseAdapter,
): Promise<CerebroSource[]> {
    const vector = `[${input.embedding.join(",")}]`;
    const rows = await adapter.search(HYBRID_SQL, [
        input.brand,
        vector,
        input.componentCodes ?? [],
        input.modelAliases ?? [input.model],
        keywordSearchQuery(input.text),
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
        && repairEvidenceIsRelevant(row, input)
    ));
    const requestedModels = new Set(input.modelAliases ?? [input.model]);
    const scopedRows = allowedRows.filter((row) => (
        requestedModels.has(row.model) || row.identityMatch
    ));
    const rankedWithDuplicates = scopedRows
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
        });
    const seenSources = new Set<string>();
    const ranked = rankedWithDuplicates.filter((source) => {
        const key = source.sourceType === "PDF"
            ? `${source.sourceType}|${source.model}|${source.title.trim().toUpperCase()}|${source.pageNumber ?? 0}`
            : `${source.sourceType}|${source.documentId}`;
        if (seenSources.has(key)) return false;
        seenSources.add(key);
        return true;
    });
    const limit = input.limit ?? 10;
    const technicalDocuments = ranked.filter((source) => source.sourceType === "PDF");
    const documentQuota = Math.min(technicalDocuments.length, Math.ceil(limit / 2));
    const selectedDocuments = technicalDocuments.slice(0, documentQuota);
    const selectedChunkIds = new Set(selectedDocuments.map((source) => source.chunkId));
    const remaining = ranked
        .filter((source) => !selectedChunkIds.has(source.chunkId))
        .slice(0, limit - selectedDocuments.length);
    return [...selectedDocuments, ...remaining];
}
