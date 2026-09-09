from __future__ import annotations

import hashlib
from collections.abc import Iterable

from psycopg import Connection
from psycopg.types.json import Jsonb

from cerebro_rag.authority import RepairOutcome, classify_authority, latest_repair_outcome
from cerebro_rag.chunking import extract_component_codes
from cerebro_rag.document_versions import DocumentDescriptor, DocumentVersionRepository
from cerebro_rag.embeddings import EmbeddingService
from cerebro_rag.indexer import vector_literal
from cerebro_rag.normalize import model_family, normalize_brand, normalize_model
from cerebro_rag.repairs import (
    RepairSource,
    build_repair_content,
    has_useful_technical_content,
    is_verified_learning_record,
    structured_learning_values,
    technical_observations,
)
from cerebro_rag.repair_quality import REPAIR_QUALITY_POLICY_VERSION


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
        learning_record=row[11] if isinstance(row[11], dict) else None,
    )


def authority_evidence(source: RepairSource) -> str:
    values = (
        source.diagnosis,
        source.enriched_diagnosis,
        *technical_observations(source.observations),
        *(structured_learning_values(source.learning_record)
          if is_verified_learning_record(source.learning_record) else ()),
    )
    return "\n".join(value.strip() for value in values if value.strip())


def verified_learning_authority(source: RepairSource) -> str:
    if not is_verified_learning_record(source.learning_record):
        return ""
    return str((source.learning_record or {}).get("authority") or "")


def effective_authority(source: RepairSource) -> str:
    return classify_authority(
        source.current_status,
        list(source.prior_statuses),
        authority_evidence(source),
        verified_learning_authority(source),
    ).value


def repair_quality_fingerprint(source: RepairSource) -> str:
    outcome = latest_repair_outcome(source.current_status, list(source.prior_statuses)).value
    authority = effective_authority(source)
    training_eligible = authority == "CONFIRMED_SUCCESS" and is_verified_learning_record(
        source.learning_record
    )
    return f"v{REPAIR_QUALITY_POLICY_VERSION}:{outcome}:{authority}:{int(training_eligible)}"


class RepairIndexer:
    def __init__(self, connection: Connection[object], embeddings: EmbeddingService) -> None:
        self.connection = connection
        self.embeddings = embeddings
        self.versions = DocumentVersionRepository(connection)

    def index_batch(self, sources: Iterable[RepairSource]) -> tuple[int, int]:
        source_list = list(sources)
        unusable = [
            source
            for source in source_list
            if not has_useful_technical_content(source)
            or latest_repair_outcome(source.current_status, list(source.prior_statuses))
            == RepairOutcome.UNREPAIRED
        ]
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
            if source not in unusable
        ]
        pending: list[tuple[RepairSource, str]] = []
        skipped = len(source_list) - len(prepared)
        for source, content in prepared:
            digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
            existing = self.connection.execute(
                """
                SELECT status::text,
                       metadata->>'repair_quality_policy_version',
                       metadata->>'repair_quality_fingerprint'
                FROM rag_documents
                WHERE source_type = 'REPAIR' AND source_id = %s AND sha256 = %s
                """,
                (source.repair_id, digest),
            ).fetchone()
            if (
                existing
                and existing[0] == "READY"
                and existing[1] == str(REPAIR_QUALITY_POLICY_VERSION)
                and existing[2] == repair_quality_fingerprint(source)
            ):
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
        authority = effective_authority(source)
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
        self.connection.execute(
            """
            UPDATE rag_documents
            SET metadata = metadata || %s::jsonb,
                authority = %s::rag_authority,
                updated_at = now()
            WHERE id = %s
            """,
            (
                Jsonb({
                    "repair_quality_policy_version": REPAIR_QUALITY_POLICY_VERSION,
                    "repair_quality_fingerprint": repair_quality_fingerprint(source),
                    "repair_training_eligible": (
                        authority == "CONFIRMED_SUCCESS"
                        and is_verified_learning_record(source.learning_record)
                    ),
                }),
                authority,
                document_id,
            ),
        )
