from __future__ import annotations

import hashlib
from collections.abc import Iterable

from psycopg import Connection

from cerebro_rag.authority import classify_authority
from cerebro_rag.chunking import extract_component_codes
from cerebro_rag.document_versions import DocumentDescriptor, DocumentVersionRepository
from cerebro_rag.embeddings import EmbeddingService
from cerebro_rag.indexer import vector_literal
from cerebro_rag.normalize import model_family, normalize_brand, normalize_model
from cerebro_rag.repairs import RepairSource, build_repair_content, has_useful_technical_content


def repair_source_from_row(row: tuple[object, ...]) -> RepairSource:
    return RepairSource(
        repair_id=str(row[0]),
        ticket_number=str(row[1]),
        brand=str(row[2] or "DESCONOCIDA"),
        model=str(row[3] or "DESCONOCIDO"),
        problem=str(row[4] or ""),
        diagnosis=str(row[5] or ""),
        enriched_diagnosis=str(row[6] or ""),
        current_status=str(row[7] or ""),
        observations=tuple(str(value) for value in (row[8] or [])),
        parts=tuple(str(value) for value in (row[9] or [])),
        prior_statuses=tuple(str(value) for value in (row[10] or [])),
    )


class RepairIndexer:
    def __init__(self, connection: Connection[object], embeddings: EmbeddingService) -> None:
        self.connection = connection
        self.embeddings = embeddings
        self.versions = DocumentVersionRepository(connection)

    def index_batch(self, sources: Iterable[RepairSource]) -> tuple[int, int]:
        source_list = list(sources)
        unusable = [source for source in source_list if not has_useful_technical_content(source)]
        for source in unusable:
            self.connection.execute(
                """
                UPDATE rag_documents
                SET retired_at = now(), updated_at = now()
                WHERE source_type = 'REPAIR' AND source_id = %s AND retired_at IS NULL
                """,
                (source.repair_id,),
            )
        prepared = [
            (source, build_repair_content(source))
            for source in source_list
            if has_useful_technical_content(source)
        ]
        pending: list[tuple[RepairSource, str]] = []
        skipped = len(source_list) - len(prepared)
        for source, content in prepared:
            digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
            existing = self.connection.execute(
                """
                SELECT status::text FROM rag_documents
                WHERE source_type = 'REPAIR' AND source_id = %s AND sha256 = %s
                """,
                (source.repair_id, digest),
            ).fetchone()
            if existing and existing[0] == "READY":
                skipped += 1
            else:
                pending.append((source, content))

        if not pending:
            if unusable:
                self.connection.commit()
            return 0, skipped

        vectors = self.embeddings.embed_passages([content for _, content in pending])
        model_version_id = self._active_model_version()
        indexed = 0
        for (source, content), vector in zip(pending, vectors, strict=True):
            self._persist(source, content, vector, model_version_id)
            indexed += 1
        self.connection.commit()
        return indexed, skipped

    def _active_model_version(self) -> object:
        row = self.connection.execute(
            "SELECT id FROM rag_model_versions WHERE active ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
        if not row:
            raise RuntimeError("active embedding model version is required")
        return row[0]

    def _persist(
        self,
        source: RepairSource,
        content: str,
        vector: tuple[float, ...],
        model_version_id: object,
    ) -> None:
        brand = normalize_brand(source.brand)
        model = normalize_model(brand, source.model)
        authority = classify_authority(
            source.current_status,
            list(source.prior_statuses),
            source.diagnosis or source.enriched_diagnosis,
        ).value
        digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
        document_id = self.versions.create_or_get(
            DocumentDescriptor(
                source_type="REPAIR",
                source_id=source.repair_id,
                relative_path=None,
                sha256=digest,
                title=f"Reparación {source.ticket_number}",
                original_brand=source.brand,
                original_model=source.model,
                normalized_brand=brand,
                normalized_model=model,
                document_type="REPAIR_HISTORY",
                authority=authority,
                model_family=model_family(brand, model),
            )
        )
        self.connection.execute("DELETE FROM rag_chunks WHERE document_id = %s", (document_id,))
        self.connection.execute(
            """
            INSERT INTO rag_chunks (
                document_id, component_codes, content, token_count, embedding,
                model_version_id, authority, normalized_brand, normalized_model
            ) VALUES (%s, %s, %s, %s, %s::vector, %s, %s::rag_authority, %s, %s)
            """,
            (
                document_id,
                list(extract_component_codes(content)),
                content,
                max(1, len(content.split())),
                vector_literal(vector),
                model_version_id,
                authority,
                brand,
                model,
            ),
        )
        self.versions.mark_ready(document_id)
