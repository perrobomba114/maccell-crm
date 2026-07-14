from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from psycopg import Connection


@dataclass(frozen=True, slots=True)
class DocumentDescriptor:
    source_type: str
    source_id: str
    relative_path: str | None
    sha256: str
    title: str
    original_brand: str
    original_model: str
    normalized_brand: str
    normalized_model: str
    document_type: str
    authority: str
    model_family: str | None = None


class DocumentVersionRepository:
    def __init__(self, connection: Connection[object]) -> None:
        self.connection = connection

    def create_or_get(self, document: DocumentDescriptor) -> UUID:
        row = self.connection.execute(
            """
            INSERT INTO rag_documents (
                source_type, source_id, relative_path, sha256, title,
                original_brand, original_model, normalized_brand, normalized_model,
                model_family, document_type, authority
            )
            VALUES (%s::rag_source_type, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::rag_authority)
            ON CONFLICT (source_type, source_id, sha256) DO NOTHING
            RETURNING id
            """,
            (
                document.source_type,
                document.source_id,
                document.relative_path,
                document.sha256,
                document.title,
                document.original_brand,
                document.original_model,
                document.normalized_brand,
                document.normalized_model,
                document.model_family,
                document.document_type,
                document.authority,
            ),
        ).fetchone()
        if row:
            return row[0]
        existing = self.connection.execute(
            """
            SELECT id FROM rag_documents
            WHERE source_type = %s::rag_source_type AND source_id = %s AND sha256 = %s
            """,
            (document.source_type, document.source_id, document.sha256),
        ).fetchone()
        if not existing:
            raise RuntimeError("document version could not be created or found")
        return existing[0]

    def mark_ready(self, document_id: UUID) -> None:
        current = self.connection.execute(
            """
            SELECT source_type::text, source_id
            FROM rag_documents
            WHERE id = %s
            FOR UPDATE
            """,
            (document_id,),
        ).fetchone()
        if not current:
            raise LookupError(f"document {document_id} does not exist")
        source_type, source_id = current
        self.connection.execute(
            """
            UPDATE rag_documents
            SET retired_at = now(), updated_at = now()
            WHERE source_type = %s::rag_source_type
              AND source_id = %s
              AND id <> %s
              AND status = 'READY'
              AND retired_at IS NULL
            """,
            (source_type, source_id, document_id),
        )
        self.connection.execute(
            """
            UPDATE rag_documents
            SET status = 'READY', retired_at = NULL, updated_at = now()
            WHERE id = %s
            """,
            (document_id,),
        )
