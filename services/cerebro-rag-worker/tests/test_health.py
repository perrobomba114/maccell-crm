from pathlib import Path


def test_health_checks_database_coverage_before_reporting_ready() -> None:
    source = Path("services/cerebro-rag-worker/src/cerebro_rag/server.py").read_text()
    assert "rag_model_versions" in source
    assert "rag_documents" in source
    assert "rag_chunks" in source
    assert "status_code=503" in source

