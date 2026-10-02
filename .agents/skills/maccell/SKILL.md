---
name: maccell
description: Orientación sobre módulos y documentación de MACCELL CRM cuando se necesita ubicar un flujo o runbook del proyecto.
---

# Orientación MACCELL

El contrato operativo único está en [AGENTS.md](../../../AGENTS.md). Si ya está cargado, no lo releas.

Usá su mapa para localizar el módulo y consultar solo el runbook del tema. El código y la configuración actual determinan comandos, estados, routing y comportamiento; el historial no demuestra estado actual de producción.

No requiere cargar otras skills, planes históricos ni ejecutar comprobaciones amplias automáticamente. Las verificaciones se eligen según el cambio y el riesgo, como indica AGENTS.md.

Para una auditoría amplia o preparación de despliegue está disponible [verify-production-safety.sh](scripts/verify-production-safety.sh), desde la raíz del repo. El script incluye tipos, lint, búsqueda de patrones y toda la suite; `--with-build` agrega build. Sus matches requieren interpretación y no equivalen por sí solos a errores funcionales.
