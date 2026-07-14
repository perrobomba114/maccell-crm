from __future__ import annotations

from pathlib import Path
from uuid import UUID

from psycopg import Connection
from psycopg.types.json import Jsonb

from cerebro_rag.chunking import PageChunk, chunk_page, embedding_projection
from cerebro_rag.document_versions import DocumentDescriptor, DocumentVersionRepository
from cerebro_rag.embeddings import EmbeddingService
from cerebro_rag.pdf_extract import ExtractedPage, extract_pdf_pages
from cerebro_rag.pdf_inventory import PdfInventoryEntry
from cerebro_rag.normalize import model_family
from cerebro_rag.page_metadata import (
    INDEX_SCHEMA_VERSION,
    document_metadata_current,
    technical_page_metadata,
)


def vector_literal(vector: tuple[float, ...]) -> str:
    return f"[{','.join(format(value, '.10g') for value in vector)}]"


def resolve_library_document(library_root: Path, relative_path: str) -> Path:
    root = library_root.resolve(strict=True)
    unresolved = (root / relative_path).resolve(strict=False)
    try:
        unresolved.relative_to(root)
    except ValueError as error:
        raise ValueError("document path escapes library root") from error
    candidate = unresolved.resolve(strict=True)
    if not candidate.is_file() or candidate.suffix.casefold() != ".pdf":
        raise ValueError("document is not an indexed PDF")
    return candidate


class PdfIndexer:
    def __init__(
        self,
        connection: Connection[object],
        embeddings: EmbeddingService,
        cache_root: Path,
    ) -> None:
        self.connection = connection
        self.embeddings = embeddings
        self.cache_root = cache_root
        self.versions = DocumentVersionRepository(connection)

    def index(self, entry: PdfInventoryEntry) -> tuple[UUID, int, int, bool]:
        descriptor = DocumentDescriptor(
            source_type="PDF",
            source_id=entry.relative_path.as_posix(),
            relative_path=entry.relative_path.as_posix(),
            sha256=entry.sha256,
            title=entry.identity.title,
            original_brand=entry.identity.brand,
            original_model=entry.identity.model,
            normalized_brand=entry.identity.brand,
            normalized_model=entry.identity.model,
            document_type=entry.identity.document_type,
            authority="TECHNICAL_DOCUMENT",
            model_family=model_family(entry.identity.brand, entry.identity.model),
        )
        document_id = self.versions.create_or_get(descriptor)
        status, schema_version = self.connection.execute(
            """
            SELECT status::text, metadata->>'index_schema_version'
            FROM rag_documents WHERE id = %s
            """,
            (document_id,),
        ).fetchone()
        if document_metadata_current(status, schema_version):
            return document_id, 0, 0, True

        pages = extract_pdf_pages(entry.absolute_path, entry.sha256, self.cache_root)
        chunks = tuple(
            chunk
            for page in pages
            for chunk in chunk_page(str(document_id), page.page_number, page.text)
        )
        chunk_metadata = tuple(technical_page_metadata(chunk.content) for chunk in chunks)
        vectors = self.embeddings.embed_passages([
            embedding_projection(
                context=(
                    f"{entry.identity.brand} {entry.identity.model} {entry.identity.title} "
                    f"{entry.identity.document_type} PAGE {chunk.page_number} "
                    f"{metadata['embedding_context']}"
                ),
                content=chunk.content,
                component_codes=chunk.component_codes,
            )
            for chunk, metadata in zip(chunks, chunk_metadata, strict=True)
        ])
        model_version_id = self._active_model_version()

        try:
            self.connection.execute("DELETE FROM rag_pages WHERE document_id = %s", (document_id,))
            page_ids = self._insert_pages(document_id, pages)
            self._insert_chunks(document_id, page_ids, chunks, vectors, model_version_id, entry)
            self.connection.execute(
                """
                UPDATE rag_documents
                SET metadata = metadata || %s, updated_at = now()
                WHERE id = %s
                """,
                (Jsonb({"index_schema_version": INDEX_SCHEMA_VERSION}), document_id),
            )
            self.versions.mark_ready(document_id)
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise
        return document_id, len(pages), len(chunks), False

    def _active_model_version(self) -> UUID:
        row = self.connection.execute(
            "SELECT id FROM rag_model_versions WHERE active ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
        if row:
            return row[0]
        return self.connection.execute(
            """
            INSERT INTO rag_model_versions (model_name, dimensions, chunking_version, active)
            VALUES (%s, 1024, 'page-700-overlap-100-v1', true)
            RETURNING id
            """,
            (self.embeddings.model_name,),
        ).fetchone()[0]

    def _insert_pages(self, document_id: UUID, pages: tuple[ExtractedPage, ...]) -> dict[int, UUID]:
        ids: dict[int, UUID] = {}
        for page in pages:
            row = self.connection.execute(
                """
                INSERT INTO rag_pages (
                    document_id, page_number, extracted_text, extraction_method,
                    rendered_path, status, metadata
                ) VALUES (%s, %s, %s, %s, %s, 'READY', %s) RETURNING id
                """,
                (
                    document_id,
                    page.page_number,
                    page.text,
                    page.method.value,
                    str(page.rendered_path) if page.rendered_path else None,
                    Jsonb(technical_page_metadata(page.text)),
                ),
            ).fetchone()
            ids[page.page_number] = row[0]
        return ids

    def _insert_chunks(
        self,
        document_id: UUID,
        page_ids: dict[int, UUID],
        chunks: tuple[PageChunk, ...],
        vectors: tuple[tuple[float, ...], ...],
        model_version_id: UUID,
        entry: PdfInventoryEntry,
    ) -> None:
        for chunk, vector in zip(chunks, vectors, strict=True):
            metadata = technical_page_metadata(chunk.content)
            self.connection.execute(
                """
                INSERT INTO rag_chunks (
                    document_id, page_id, component_codes, content, token_count,
                    embedding, model_version_id, authority, normalized_brand, normalized_model,
                    section, metadata
                ) VALUES (%s, %s, %s, %s, %s, %s::vector, %s,
                          'TECHNICAL_DOCUMENT', %s, %s, %s, %s)
                """,
                (
                    document_id,
                    page_ids[chunk.page_number],
                    list(chunk.component_codes),
                    chunk.content,
                    chunk.token_count,
                    vector_literal(vector),
                    model_version_id,
                    entry.identity.brand,
                    entry.identity.model,
                    metadata["section"],
                    Jsonb(metadata),
                ),
            )
