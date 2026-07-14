# Cerebro GPU Embeddings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ejecutar BGE-M3 sobre dos RTX 3090 y usarlo desde los workers RAG con autenticación y fallback CPU.

**Architecture:** El paquete Python tendrá un encoder HTTP compatible con `EmbeddingService` y una API GPU independiente. MACCELL seguirá extrayendo y persistiendo localmente; solo los textos para embeddings cruzarán Tailscale.

**Tech Stack:** Python 3.12, FastAPI, sentence-transformers, PyTorch CUDA, Docker Compose, Tailscale, PostgreSQL/pgvector.

---

### Task 1: Contrato del cliente remoto

**Files:**
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/config.py`
- Modify: `services/cerebro-rag-worker/src/cerebro_rag/embeddings.py`
- Test: `services/cerebro-rag-worker/tests/test_embeddings.py`

- [ ] Agregar primero tests que exijan header Bearer, timeout, validación de cantidad/dimensión y fallback CPU.
- [ ] Ejecutar el test y comprobar que falla por ausencia del cliente remoto.
- [ ] Implementar `RemoteEmbeddingEncoder` sin registrar textos ni secretos.
- [ ] Ejecutar los tests y comprobar que pasan.

### Task 2: API GPU autenticada

**Files:**
- Create: `services/cerebro-rag-worker/src/cerebro_rag/gpu_server.py`
- Create: `services/cerebro-rag-worker/tests/test_gpu_server.py`

- [ ] Agregar tests fallidos para health, autenticación y respuesta de embeddings.
- [ ] Implementar endpoints `/health` y `/embed` con modelo inyectable en tests.
- [ ] Validar límite de lote, textos no vacíos y vectores normalizados de 1024 dimensiones.
- [ ] Ejecutar tests del servidor GPU.

### Task 3: Imágenes y composición

**Files:**
- Create: `services/cerebro-rag-worker/Dockerfile.gpu`
- Create: `infra/cerebro-rag-gpu/docker-compose.yml`
- Modify: `infra/cerebro-rag/docker-compose.yml`

- [ ] Crear imagen CUDA con PyTorch y el mismo paquete Cerebro.
- [ ] Definir una instancia por GPU y proxy privado sobre la IP Tailscale.
- [ ] Configurar workers MACCELL con URL remota, secreto, timeout y fallback CPU.
- [ ] Validar la configuración renderizada de ambos Compose.

### Task 4: Verificación local

**Files:**
- Test: `services/cerebro-rag-worker/tests/test_embeddings.py`
- Test: `services/cerebro-rag-worker/tests/test_gpu_server.py`

- [ ] Ejecutar todos los tests Python.
- [ ] Ejecutar `npx tsc --noEmit`, `git diff --check` y `npm test`.
- [ ] Ejecutar `.agents/skills/maccell/scripts/verify-production-safety.sh --with-build`.
- [ ] Confirmar que solo se incluyen archivos del cambio.

### Task 5: Despliegue GPU

**Files:**
- Runtime: host `100.71.184.125`

- [ ] Guardar el estado de `llama-server` y detenerlo de forma reversible.
- [ ] Desplegar dos workers BGE-M3 fijados a GPU 0 y GPU 1.
- [ ] Ejecutar health checks autenticados y benchmark por GPU.
- [ ] Verificar VRAM, temperatura y ausencia de OOM.

### Task 6: Despliegue MACCELL e indexación

**Files:**
- Runtime: Dokploy compose `maccell-rag-worker`

- [ ] Subir a `main` y desplegar el compose RAG.
- [ ] Comprobar en logs que usa el encoder remoto.
- [ ] Comparar rendimiento CPU y GPU con los cuatro PDFs M12.
- [ ] Iniciar los tres shards y comprobar crecimiento READY sin FAILED.
- [ ] Al completar la carga inicial, volver a iniciar `llama-server` y comprobar health.

