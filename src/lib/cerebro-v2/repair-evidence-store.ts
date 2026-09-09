import type { QueryResultRow } from "pg";

import { queryRag } from "./rag-db";
import type { CerebroAuthority } from "./types";

export type StoredRepairEvidence = {
    documentId: string;
    title: string;
    brand: string;
    model: string;
    authority: CerebroAuthority;
    content: string;
};

type RepairEvidenceRow = QueryResultRow & StoredRepairEvidence;
export type RepairEvidenceReader = (userId: string, sessionId: string, documentId: string) => Promise<StoredRepairEvidence | null>;

export const readCitedRepairEvidence: RepairEvidenceReader = async (userId, sessionId, documentId) => {
    const rows = await queryRag<RepairEvidenceRow>(`
        WITH cited_source AS (
            SELECT source
            FROM rag_chat_sessions AS session
            JOIN rag_chat_messages AS message ON message.session_id = session.id
            CROSS JOIN LATERAL jsonb_array_elements(COALESCE(message.sources, '[]'::jsonb)) AS source
            WHERE session.user_id = $1 AND session.id = $2::uuid
              AND source->>'documentId' = $3 AND source->>'sourceType' = 'REPAIR'
            LIMIT 1
        )
        SELECT document.id::text AS "documentId", cited.source->>'title' AS title,
               cited.source->>'brand' AS brand, cited.source->>'model' AS model,
               cited.source->>'authority' AS authority,
               left(string_agg(chunk.content, E'\n\n' ORDER BY chunk.id), 16000) AS content
        FROM cited_source AS cited
        JOIN rag_documents AS document ON document.id::text = cited.source->>'documentId'
        JOIN rag_chunks AS chunk ON chunk.document_id = document.id
        WHERE document.source_type = 'REPAIR' AND document.status = 'READY' AND document.retired_at IS NULL
        GROUP BY document.id, cited.source
        LIMIT 1
    `, [userId, sessionId, documentId]);
    return rows[0] ?? null;
};
