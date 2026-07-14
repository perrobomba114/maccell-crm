from __future__ import annotations

import math
import tempfile
import unittest
from pathlib import Path

from cerebro_rag.config import WorkerSettings
from cerebro_rag.embeddings import (
    EmbeddingService,
    RemoteEmbeddingEncoder,
    create_embedding_service,
)


class FakeEncoder:
    calls = 0

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        FakeEncoder.calls += 1

    def encode(self, texts: list[str], **_: object) -> list[list[float]]:
        return [[2.0] * 1024 for _ in texts]


class EmbeddingServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        FakeEncoder.calls = 0

    def test_loads_encoder_once_and_returns_normalized_1024_vectors(self) -> None:
        service = EmbeddingService("BAAI/bge-m3", encoder_factory=FakeEncoder)
        first = service.embed_passages(["one", "two"])
        second = service.embed_query("query")

        self.assertEqual(FakeEncoder.calls, 1)
        self.assertEqual(len(first[0]), 1024)
        self.assertAlmostEqual(math.sqrt(sum(value * value for value in second)), 1.0)

    def test_never_sends_more_than_eight_texts_per_batch(self) -> None:
        batch_sizes: list[int] = []

        class RecordingEncoder(FakeEncoder):
            def encode(self, texts: list[str], **kwargs: object) -> list[list[float]]:
                batch_sizes.append(len(texts))
                return super().encode(texts, **kwargs)

        service = EmbeddingService("BAAI/bge-m3", encoder_factory=RecordingEncoder, batch_size=8)
        service.embed_passages([str(index) for index in range(17)])
        self.assertEqual(batch_sizes, [8, 8, 1])

    def test_remote_encoder_balances_requests_and_sends_bearer_secret(self) -> None:
        requests: list[tuple[str, dict[str, object], dict[str, str], float]] = []

        def transport(
            url: str,
            payload: dict[str, object],
            headers: dict[str, str],
            timeout: float,
        ) -> object:
            requests.append((url, payload, headers, timeout))
            texts = payload["texts"]
            assert isinstance(texts, list)
            return {"embeddings": [[1.0] * 1024 for _ in texts]}

        encoder = RemoteEmbeddingEncoder(
            ("http://gpu-0:8080", "http://gpu-1:8080"),
            "private-secret",
            timeout_seconds=12.5,
            transport=transport,
        )

        encoder.encode(["first"])
        encoder.encode(["second"])

        self.assertEqual([request[0] for request in requests], [
            "http://gpu-0:8080/embed",
            "http://gpu-1:8080/embed",
        ])
        self.assertEqual(requests[0][2]["Authorization"], "Bearer private-secret")
        self.assertEqual(requests[0][3], 12.5)

    def test_remote_encoder_falls_back_to_cpu_after_invalid_gpu_response(self) -> None:
        fallback = FakeEncoder("BAAI/bge-m3")

        def invalid_transport(*_: object) -> object:
            return {"embeddings": [[1.0, 2.0]]}

        encoder = RemoteEmbeddingEncoder(
            ("http://gpu-0:8080",),
            "private-secret",
            fallback_factory=lambda: fallback,
            transport=invalid_transport,
        )

        vectors = encoder.encode(["one"])

        self.assertEqual(len(vectors[0]), 1024)

    def test_remote_encoder_falls_back_after_every_endpoint_fails(self) -> None:
        attempted: list[str] = []

        def failing_transport(url: str, *_: object) -> object:
            attempted.append(url)
            raise TimeoutError("unavailable")

        encoder = RemoteEmbeddingEncoder(
            ("http://gpu-0:8080", "http://gpu-1:8080"),
            "private-secret",
            fallback_factory=lambda: FakeEncoder("BAAI/bge-m3"),
            transport=failing_transport,
        )

        vectors = encoder.encode(["one", "two"])

        self.assertEqual(len(attempted), 2)
        self.assertEqual(len(vectors), 2)
        self.assertEqual(len(vectors[0]), 1024)

    def test_embedding_service_uses_remote_gpu_without_loading_cpu_encoder(self) -> None:
        def transport(*_: object) -> object:
            return {"embeddings": [[1.0] * 1024]}

        service = create_embedding_service(
            model_name="BAAI/bge-m3",
            batch_size=32,
            remote_urls=("http://gpu-0:8080",),
            remote_secret="private-secret",
            encoder_factory=FakeEncoder,
            transport=transport,
        )

        vector = service.embed_query("power on")

        self.assertEqual(len(vector), 1024)
        self.assertEqual(FakeEncoder.calls, 0)

    def test_worker_settings_parse_multiple_private_gpu_endpoints(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            settings = WorkerSettings(
                SOURCE_DATABASE_URL="postgresql://source",
                RAG_DATABASE_URL="postgresql://rag",
                INTERNAL_API_SECRET="private-secret",
                LIBRARY_ROOT=Path(directory),
                PAGE_CACHE_ROOT=Path(directory),
                BATCH_SIZE=32,
                REMOTE_EMBEDDING_URLS="http://100.71.184.125:8091, http://100.71.184.125:8092",
                REMOTE_EMBEDDING_TIMEOUT_SECONDS=45,
            )

        self.assertEqual(settings.remote_embedding_endpoints, (
            "http://100.71.184.125:8091",
            "http://100.71.184.125:8092",
        ))
        self.assertEqual(settings.remote_embedding_timeout_seconds, 45)


if __name__ == "__main__":
    unittest.main()
