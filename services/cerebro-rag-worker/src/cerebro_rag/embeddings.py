from __future__ import annotations

import math
from functools import lru_cache
from typing import Callable, Protocol, Sequence


class Encoder(Protocol):
    def encode(self, texts: list[str], **kwargs: object) -> object: ...


EncoderFactory = Callable[[str], Encoder]


def _sentence_transformer_factory(model_name: str) -> Encoder:
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(model_name, device="cpu")


class EmbeddingService:
    def __init__(
        self,
        model_name: str,
        encoder_factory: EncoderFactory = _sentence_transformer_factory,
        batch_size: int = 8,
    ) -> None:
        if not 1 <= batch_size <= 8:
            raise ValueError("batch_size must be between 1 and 8")
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


@lru_cache(maxsize=1)
def get_embedding_service(model_name: str = "BAAI/bge-m3", batch_size: int = 8) -> EmbeddingService:
    return EmbeddingService(model_name=model_name, batch_size=batch_size)
