from __future__ import annotations

import hmac
import logging
import math
import os
from threading import Lock
from typing import Annotated, Protocol

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, StringConstraints


LOGGER = logging.getLogger(__name__)
EmbeddingText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=8_000)]


class EmbeddingEngine(Protocol):
    model_name: str
    device: str

    @property
    def ready(self) -> bool: ...

    def embed(self, texts: list[str]) -> list[list[float]]: ...


class EmbeddingRequest(BaseModel):
    texts: list[EmbeddingText] = Field(min_length=1, max_length=64)


class GpuEmbeddingEngine:
    def __init__(self, model_name: str, device: str, batch_size: int) -> None:
        self.model_name = model_name
        self.device = device
        self.batch_size = batch_size
        self._encoder: object | None = None
        self._lock = Lock()

    @property
    def ready(self) -> bool:
        return self._encoder is not None

    def _load_encoder(self) -> object:
        if self._encoder is None:
            with self._lock:
                if self._encoder is None:
                    import torch
                    from sentence_transformers import SentenceTransformer

                    self._encoder = SentenceTransformer(
                        self.model_name,
                        device=self.device,
                        model_kwargs={"torch_dtype": torch.float16},
                    )
        return self._encoder

    def embed(self, texts: list[str]) -> list[list[float]]:
        encoder = self._load_encoder()
        encoded = encoder.encode(
            texts,
            batch_size=self.batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        raw_vectors = encoded.tolist() if hasattr(encoded, "tolist") else encoded
        return _validated_vectors(raw_vectors, len(texts))


def _validated_vectors(vectors: object, expected_count: int) -> list[list[float]]:
    if not isinstance(vectors, list) or len(vectors) != expected_count:
        raise ValueError("embedding count mismatch")
    validated: list[list[float]] = []
    for vector in vectors:
        if not isinstance(vector, list) or len(vector) != 1024:
            raise ValueError("embedding dimension mismatch")
        values = [float(value) for value in vector]
        if not all(math.isfinite(value) for value in values):
            raise ValueError("embedding contains a non-finite value")
        validated.append(values)
    return validated


def create_gpu_app(engine: EmbeddingEngine, api_secret: str) -> FastAPI:
    if not api_secret:
        raise ValueError("GPU_EMBEDDING_SECRET is required")
    app = FastAPI(title="MACCELL BGE-M3 GPU", docs_url=None, redoc_url=None)

    def authorize(authorization: str | None) -> None:
        expected = f"Bearer {api_secret}"
        if authorization is None or not hmac.compare_digest(authorization, expected):
            raise HTTPException(status_code=401, detail="Unauthorized")

    @app.get("/health")
    def health(authorization: str | None = Header(default=None)) -> dict[str, str | bool]:
        authorize(authorization)
        return {
            "status": "ok",
            "model": engine.model_name,
            "device": engine.device,
            "ready": engine.ready,
        }

    @app.post("/embed")
    def embed(
        request: EmbeddingRequest,
        authorization: str | None = Header(default=None),
    ) -> dict[str, list[list[float]]]:
        authorize(authorization)
        try:
            embeddings = engine.embed(request.texts)
            return {"embeddings": _validated_vectors(embeddings, len(request.texts))}
        except (RuntimeError, ValueError, TypeError) as error:
            LOGGER.error("GPU embedding request failed: %s", type(error).__name__)
            raise HTTPException(status_code=503, detail="Embedding service unavailable") from error

    return app


def create_app_from_environment() -> FastAPI:
    model_name = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-m3")
    device = os.environ.get("GPU_DEVICE", "cuda:0")
    batch_size = int(os.environ.get("BATCH_SIZE", "32"))
    if not 1 <= batch_size <= 64:
        raise ValueError("BATCH_SIZE must be between 1 and 64")
    engine = GpuEmbeddingEngine(model_name, device, batch_size)
    return create_gpu_app(engine, os.environ.get("GPU_EMBEDDING_SECRET", ""))
