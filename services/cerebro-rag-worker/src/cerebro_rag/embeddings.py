from __future__ import annotations

import json
import logging
import math
from functools import lru_cache
from threading import Lock
from typing import TYPE_CHECKING, Callable, Protocol, Sequence
from urllib.request import Request, urlopen


class Encoder(Protocol):
    def encode(self, texts: list[str], **kwargs: object) -> object: ...


EncoderFactory = Callable[[str], Encoder]
RemoteTransport = Callable[[str, dict[str, object], dict[str, str], float], object]

LOGGER = logging.getLogger(__name__)

if TYPE_CHECKING:
    from cerebro_rag.config import WorkerSettings


def _sentence_transformer_factory(model_name: str) -> Encoder:
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(model_name, device="cpu")


def _post_json(
    url: str,
    payload: dict[str, object],
    headers: dict[str, str],
    timeout: float,
) -> object:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


class RemoteEmbeddingEncoder:
    def __init__(
        self,
        endpoint_urls: Sequence[str],
        api_secret: str,
        timeout_seconds: float = 30.0,
        fallback_factory: Callable[[], Encoder] | None = None,
        transport: RemoteTransport = _post_json,
    ) -> None:
        self.endpoint_urls = tuple(url.rstrip("/") for url in endpoint_urls if url.strip())
        if not self.endpoint_urls:
            raise ValueError("at least one remote embedding endpoint is required")
        if not api_secret:
            raise ValueError("remote embedding secret is required")
        self.api_secret = api_secret
        self.timeout_seconds = timeout_seconds
        self.fallback_factory = fallback_factory
        self.transport = transport
        self._fallback: Encoder | None = None
        self._next_endpoint = 0
        self._lock = Lock()

    def encode(self, texts: list[str], **_: object) -> list[list[float]]:
        with self._lock:
            start = self._next_endpoint
            self._next_endpoint = (self._next_endpoint + 1) % len(self.endpoint_urls)
        for offset in range(len(self.endpoint_urls)):
            endpoint = self.endpoint_urls[(start + offset) % len(self.endpoint_urls)]
            try:
                response = self.transport(
                    f"{endpoint}/embed",
                    {"texts": texts},
                    {"Authorization": f"Bearer {self.api_secret}"},
                    self.timeout_seconds,
                )
                return self._validated_vectors(response, len(texts))
            except (OSError, TimeoutError, ValueError, TypeError, KeyError):
                continue
        if self.fallback_factory is None:
            raise RuntimeError("all remote embedding endpoints failed")
        LOGGER.warning("Remote embeddings unavailable; using local CPU fallback")
        if self._fallback is None:
            self._fallback = self.fallback_factory()
        encoded = self._fallback.encode(texts, show_progress_bar=False)
        raw_vectors = encoded.tolist() if hasattr(encoded, "tolist") else encoded
        return [list(vector) for vector in raw_vectors]

    @staticmethod
    def _validated_vectors(response: object, expected_count: int) -> list[list[float]]:
        if not isinstance(response, dict):
            raise TypeError("remote embedding response must be an object")
        embeddings = response.get("embeddings")
        if not isinstance(embeddings, list) or len(embeddings) != expected_count:
            raise ValueError("remote embedding count mismatch")
        vectors: list[list[float]] = []
        for vector in embeddings:
            if not isinstance(vector, list) or len(vector) != 1024:
                raise ValueError("remote embedding dimension mismatch")
            normalized = [float(value) for value in vector]
            if not all(math.isfinite(value) for value in normalized):
                raise ValueError("remote embedding contains a non-finite value")
            vectors.append(normalized)
        return vectors


class EmbeddingService:
    def __init__(
        self,
        model_name: str,
        encoder_factory: EncoderFactory = _sentence_transformer_factory,
        batch_size: int = 8,
    ) -> None:
        if not 1 <= batch_size <= 64:
            raise ValueError("batch_size must be between 1 and 64")
        self.model_name = model_name
        self.encoder_factory = encoder_factory
        self.batch_size = batch_size
        self._encoder: Encoder | None = None

    @property
    def encoder(self) -> Encoder:
        if self._encoder is None:
            self._encoder = self.encoder_factory(self.model_name)
        return self._encoder

    def embed_passages(self, texts: Sequence[str]) -> tuple[tuple[float, ...], ...]:
        vectors: list[tuple[float, ...]] = []
        for start in range(0, len(texts), self.batch_size):
            batch = list(texts[start : start + self.batch_size])
            encoded = self.encoder.encode(
                batch,
                batch_size=self.batch_size,
                normalize_embeddings=False,
                show_progress_bar=False,
            )
            raw_vectors = encoded.tolist() if hasattr(encoded, "tolist") else encoded
            vectors.extend(self._normalize(vector) for vector in raw_vectors)
        return tuple(vectors)

    def embed_query(self, text: str) -> tuple[float, ...]:
        return self.embed_passages([text])[0]

    @staticmethod
    def _normalize(vector: Sequence[float]) -> tuple[float, ...]:
        if len(vector) != 1024:
            raise ValueError(f"BGE-M3 returned {len(vector)} dimensions; expected 1024")
        norm = math.sqrt(sum(float(value) ** 2 for value in vector))
        if norm == 0:
            raise ValueError("embedding vector cannot be zero")
        return tuple(float(value) / norm for value in vector)


def create_embedding_service(
    model_name: str,
    batch_size: int,
    remote_urls: Sequence[str] = (),
    remote_secret: str = "",
    remote_timeout_seconds: float = 30.0,
    encoder_factory: EncoderFactory = _sentence_transformer_factory,
    transport: RemoteTransport = _post_json,
) -> EmbeddingService:
    if remote_urls:
        remote = RemoteEmbeddingEncoder(
            remote_urls,
            remote_secret,
            timeout_seconds=remote_timeout_seconds,
            fallback_factory=lambda: encoder_factory(model_name),
            transport=transport,
        )
        return EmbeddingService(
            model_name=model_name,
            encoder_factory=lambda _: remote,
            batch_size=batch_size,
        )
    return EmbeddingService(
        model_name=model_name,
        encoder_factory=encoder_factory,
        batch_size=batch_size,
    )


@lru_cache(maxsize=4)
def get_embedding_service(
    model_name: str = "BAAI/bge-m3",
    batch_size: int = 8,
    remote_urls: tuple[str, ...] = (),
    remote_secret: str = "",
    remote_timeout_seconds: float = 30.0,
) -> EmbeddingService:
    return create_embedding_service(
        model_name=model_name,
        batch_size=batch_size,
        remote_urls=remote_urls,
        remote_secret=remote_secret,
        remote_timeout_seconds=remote_timeout_seconds,
    )


def get_worker_embedding_service(settings: "WorkerSettings") -> EmbeddingService:
    return get_embedding_service(
        model_name=settings.embedding_model,
        batch_size=settings.batch_size,
        remote_urls=settings.remote_embedding_endpoints,
        remote_secret=settings.embedding_api_secret,
        remote_timeout_seconds=settings.remote_embedding_timeout_seconds,
    )
