# Worker Cerebro RAG — mapa local

Complementa el AGENTS.md raíz. Servicio Python >=3.12, FastAPI, psycopg y BGE-M3; no se prueba con npm test.

- Entradas CLI: `src/cerebro_rag/cli.py`; servidor: `server.py`; settings: `config.py`.
- PDFs: `pdf_inventory.py`, `pdf_extract.py`, `indexer.py`, `document_versions.py`, `chunking.py`, `page_metadata.py`.
- Reparaciones: `repairs.py`, `repair_sync.py`, `repair_cursor.py`, `repair_indexer.py`, `repair_quality.py`.
- Embeddings: `embeddings.py`, `gpu_server.py`; conservar compatibilidad de 1.024 dimensiones con el cliente TypeScript.
- Datos: `schema.sql`, `migrations.py` y migraciones del servicio. Son distintas de las migraciones Prisma del CRM.
- Pruebas: `tests`; dependencias y configuración en `pyproject.toml`.

Desde este directorio, con el entorno Python del servicio y extras de test ya preparados: `python -m pytest tests/<archivo>.py`. Las pruebas con testcontainers requieren Docker; inspeccioná los fixtures antes de ejecutar integración. No instales dependencias ni migres producción por una prueba rutinaria.

Contrato operativo: `../../docs/cerebro-rag-runbook.md`. La base fuente se lee; RAG recibe documentos, jobs, chats y feedback. Mantené el cursor incremental, idempotencia por versión/SHA, clasificación de calidad y aislamiento de identidad. No borres fuentes, chats ni feedback al reindexar.

Compose: `../../infra/cerebro-rag/docker-compose.yml`. La consulta /health comprueba cobertura mínima, no completitud del inventario ni calidad de recuperación. Validá el comportamiento afectado con tests del servicio y del consumidor TypeScript cuando cambie un endpoint o formato.
