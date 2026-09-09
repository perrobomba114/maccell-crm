import { queryRag } from "./rag-db";
import { repairEvidenceIsUsable, repairEvidenceMatchesSymptom, summarizeRepairEvidence } from "./repair-evidence";
import type { RetrievalAdapter, RetrievalInput, RetrievalRow } from "./retrieval";
import type { CerebroSource } from "./types";

const FALLBACK_SQL = `SELECT chunk.id::text AS "chunkId", document.id::text AS "documentId",
 document.source_type::text AS "sourceType", chunk.authority::text AS authority,
 chunk.normalized_brand AS brand, chunk.normalized_model AS model,
 document.model_family AS "modelFamily", document.title, NULL::integer AS "pageNumber",
 chunk.content, 0::float AS "semanticScore",
 ts_rank_cd(chunk.search_vector, to_tsquery('simple', $3)) AS "keywordScore",
 false AS "componentMatch", chunk.section, '{}'::text[] AS subsystems, true AS "identityMatch"
FROM rag_chunks chunk JOIN rag_documents document ON document.id = chunk.document_id
WHERE chunk.normalized_brand = $1 AND chunk.normalized_model = ANY($2::text[])
 AND document.source_type = 'REPAIR' AND document.status = 'READY' AND document.retired_at IS NULL
 AND chunk.search_vector @@ to_tsquery('simple', $3)
ORDER BY CASE WHEN $4::boolean AND chunk.content ~* '\\mno (enciende|prende|arranca)\\M|\\mmuert[oa]\\M' THEN 0 ELSE 1 END,
 "keywordScore" DESC, chunk.id LIMIT 20`;

export type RepairFallbackSearch = RetrievalAdapter["search"];

function fallbackQuery(text: string): string {
    if (/\b(?:NO\s+(?:ENCIENDE|PRENDE|ARRANCA)|MUERT[OA])\b/i.test(text)) {
        return "enciende | prende | arranca | muerto | muerta | apagado | apagada | bateria | hinchada";
    }
    const tokens = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .match(/[a-z0-9_]{3,}/g) ?? [];
    return [...new Set(tokens)].slice(0, 8).join(" | ") || "diagnostico";
}

export async function retrieveRepairFallbackSources(
    input: Omit<RetrievalInput, "embedding">,
    search: RepairFallbackSearch = (sql, params) => queryRag<RetrievalRow>(sql, params),
): Promise<CerebroSource[]> {
    const models = [input.model, ...(input.modelAliases ?? [])];
    const noPower = /\b(?:NO\s+(?:ENCIENDE|PRENDE|ARRANCA)|MUERT[OA])\b/i.test(input.text);
    const rows = await search(FALLBACK_SQL, [input.brand, models, fallbackQuery(input.text), noPower]);
    const allowedModels = new Set(models.map(value => value.normalize("NFKD").replace(/[^a-z0-9]/gi, "").toUpperCase()));
    return rows.filter(row => row.sourceType === "REPAIR" && row.brand === input.brand
        && allowedModels.has(row.model.normalize("NFKD").replace(/[^a-z0-9]/gi, "").toUpperCase())
        && repairEvidenceIsUsable(row.content, row.title)
        && repairEvidenceMatchesSymptom(summarizeRepairEvidence(row.content, row.title), input.text)
        && !(input.excludeRepairTicket && row.title.toUpperCase().includes(input.excludeRepairTicket.toUpperCase())))
        .slice(0, Math.min(input.limit ?? 8, 3))
        .map(row => ({ chunkId: row.chunkId, documentId: row.documentId, sourceType: "REPAIR",
            authority: row.authority, brand: row.brand, model: row.model, title: row.title,
            pageNumber: null, content: row.content, score: row.keywordScore }));
}
