from pathlib import Path
from uuid import UUID

import psycopg
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from cerebro_rag.config import WorkerSettings
from cerebro_rag.indexer import resolve_library_document
from cerebro_rag.embeddings import get_embedding_service


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
    embedding = get_embedding_service(settings.embedding_model, settings.batch_size).embed_query(
        request.text
    )
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
