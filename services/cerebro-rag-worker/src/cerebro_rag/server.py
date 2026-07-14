from pathlib import Path
from uuid import UUID

import psycopg
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from cerebro_rag.config import WorkerSettings
from cerebro_rag.indexer import resolve_library_document
from cerebro_rag.embeddings import get_worker_embedding_service
from cerebro_rag.page_renderer import render_document_page, resolve_cached_page


app = FastAPI(title="MACCELL Cerebro RAG Worker", docs_url=None, redoc_url=None)


class EmbedRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8_000)


def _authorize(authorization: str | None, settings: WorkerSettings) -> None:
    expected = f"Bearer {settings.internal_api_secret.get_secret_value()}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/internal/embed")
def embed_query(
    request: EmbedRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, list[float]]:
    settings = WorkerSettings()
    _authorize(authorization, settings)
    embedding = get_worker_embedding_service(settings).embed_query(request.text)
    return {"embedding": list(embedding)}


@app.get("/internal/documents/{document_id}")
def document(
    document_id: UUID,
    authorization: str | None = Header(default=None),
) -> FileResponse:
    settings = WorkerSettings()
    _authorize(authorization, settings)
    with psycopg.connect(settings.rag_database_url.get_secret_value()) as connection:
        row = connection.execute(
            """
            SELECT relative_path FROM rag_documents
            WHERE id = %s AND source_type = 'PDF' AND status = 'READY' AND retired_at IS NULL
            """,
            (document_id,),
        ).fetchone()
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        path: Path = resolve_library_document(settings.library_root, row[0])
    except (ValueError, FileNotFoundError) as error:
        raise HTTPException(status_code=404, detail="Document not found") from error
    return FileResponse(path, media_type="application/pdf", filename=path.name)


@app.get("/internal/documents/{document_id}/pages/{page_number}")
def document_page(
    document_id: UUID,
    page_number: int,
    authorization: str | None = Header(default=None),
) -> FileResponse:
    settings = WorkerSettings()
    _authorize(authorization, settings)
    if page_number < 1:
        raise HTTPException(status_code=400, detail="Invalid page")
    with psycopg.connect(settings.rag_database_url.get_secret_value()) as connection:
        row = connection.execute(
            """
            SELECT document.relative_path, document.sha256, page.rendered_path
            FROM rag_documents AS document
            LEFT JOIN rag_pages AS page
              ON page.document_id = document.id AND page.page_number = %s
            WHERE document.id = %s AND document.source_type = 'PDF'
              AND document.status = 'READY' AND document.retired_at IS NULL
            """,
            (page_number, document_id),
        ).fetchone()
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="Page not found")
    try:
        if row[2]:
            rendered = resolve_cached_page(settings.page_cache_root, Path(row[2]))
        else:
            pdf_path = resolve_library_document(settings.library_root, row[0])
            rendered = render_document_page(
                pdf_path,
                str(row[1]),
                page_number,
                settings.page_cache_root,
            )
    except (ValueError, FileNotFoundError) as error:
        raise HTTPException(status_code=404, detail="Page not found") from error
    return FileResponse(rendered, media_type="image/png", filename=rendered.name)
