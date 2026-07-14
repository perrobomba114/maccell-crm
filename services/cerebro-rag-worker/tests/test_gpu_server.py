from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from cerebro_rag.gpu_server import create_gpu_app


class FakeGpuEngine:
    device = "cuda:0"
    model_name = "BAAI/bge-m3"

    def __init__(self) -> None:
        self.received: list[str] = []

    @property
    def ready(self) -> bool:
        return True

    def embed(self, texts: list[str]) -> list[list[float]]:
        self.received.extend(texts)
        return [[1.0] * 1024 for _ in texts]


class GpuServerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = FakeGpuEngine()
        self.client = TestClient(create_gpu_app(self.engine, "private-secret"))
        self.authorization = {"Authorization": "Bearer private-secret"}

    def test_health_requires_authentication(self) -> None:
        self.assertEqual(self.client.get("/health").status_code, 401)
        response = self.client.get("/health", headers=self.authorization)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "status": "ok",
            "model": "BAAI/bge-m3",
            "device": "cuda:0",
            "ready": True,
        })

    def test_embed_returns_one_vector_per_text(self) -> None:
        response = self.client.post(
            "/embed",
            headers=self.authorization,
            json={"texts": ["power on", "display troubleshooting"]},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.engine.received, ["power on", "display troubleshooting"])
        self.assertEqual(len(response.json()["embeddings"]), 2)
        self.assertEqual(len(response.json()["embeddings"][0]), 1024)

    def test_embed_rejects_missing_auth_and_oversized_batches(self) -> None:
        unauthorized = self.client.post("/embed", json={"texts": ["power on"]})
        oversized = self.client.post(
            "/embed",
            headers=self.authorization,
            json={"texts": ["page"] * 65},
        )

        self.assertEqual(unauthorized.status_code, 401)
        self.assertEqual(oversized.status_code, 422)


if __name__ == "__main__":
    unittest.main()
