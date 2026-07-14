from __future__ import annotations

import math
import unittest

from cerebro_rag.embeddings import EmbeddingService


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


if __name__ == "__main__":
    unittest.main()
