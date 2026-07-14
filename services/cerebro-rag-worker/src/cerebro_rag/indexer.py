from __future__ import annotations

from pathlib import Path
from uuid import UUID

from psycopg import Connection

from cerebro_rag.chunking import PageChunk, chunk_page, embedding_projection
from cerebro_rag.document_versions import DocumentDescriptor, DocumentVersionRepository
from cerebro_rag.embeddings import EmbeddingService
from cerebro_rag.pdf_extract import ExtractedPage, extract_pdf_pages
from cerebro_rag.pdf_inventory import PdfInventoryEntry


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
        )
        document_id = self.versions.create_or_get(descriptor)
        status = self.connection.execute(
            "SELECT status::text FROM rag_documents WHERE id = %s", (document_id,)
        ).fetchone()[0]
        if status == "READY":
            return document_id, 0, 0, True

        pages = extract_pdf_pages(entry.absolute_path, entry.sha256, self.cache_root)
        chunks = tuple(
            chunk
            for page in pages
            for chunk in chunk_page(str(document_id), page.page_number, page.text)
        )
        vectors = self.embeddings.embed_passages(
            [
                embedding_projection(
                    context=(
                        f"{entry.identity.brand} {entry.identity.model} "
                        f"{entry.identity.title} PAGE {chunk.page_number}"
                    ),
                    content=chunk.content,
                    component_codes=chunk.component_codes,
                )
                for chunk in chunks
            ]
        )
        model_version_id = self._active_model_version()

        try:
            self.connection.execute("DELETE FROM rag_pages WHERE document_id = %s", (document_id,))
            page_ids = self._insert_pages(document_id, pages)
            self._insert_chunks(document_id, page_ids, chunks, vectors, model_version_id, entry)
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
                    rendered_path, status
                ) VALUES (%s, %s, %s, %s, %s, 'READY') RETURNING id
                """,
                (document_id, page.page_number, page.text, page.method.value, str(page.rendered_path)),
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
            self.connection.execute(
                """
                INSERT INTO rag_chunks (
                    document_id, page_id, component_codes, content, token_count,
                    embedding, model_version_id, authority, normalized_brand, normalized_model
                ) VALUES (%s, %s, %s, %s, %s, %s::vector, %s,
                          'TECHNICAL_DOCUMENT', %s, %s)
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
                ),
            )
