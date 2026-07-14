# Cerebro PDF Fullscreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la vista lateral de documentos por un visor técnico fullscreen con zoom, scroll, navegación y cierre accesible.

**Architecture:** Mantener `CerebroV2PdfViewer` como componente aislado y conservar el estado de fuente existente en el reducer. El visor se monta como diálogo `fixed` sobre el shell, consume el mismo endpoint autenticado de imágenes y administra página, zoom, bloqueo de scroll y cierre por teclado localmente.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide.

---

### Task 1: Contrato del visor fullscreen

**Files:**
- Create: `src/__tests__/cerebro-v2-pdf-viewer.test.ts`
- Modify: `src/components/cerebro-v2/cerebro-v2-pdf-viewer.tsx`

- [ ] **Step 1: Escribir el test que exige diálogo fullscreen y controles accesibles**

El test debe leer el componente y comprobar `role="dialog"`, `aria-modal="true"`, posicionamiento `fixed inset-0`, zoom máximo 400%, scroll bidireccional y listener de `Escape`.

- [ ] **Step 2: Ejecutar el test y verificar el estado rojo**

Run: `npx tsx --test src/__tests__/cerebro-v2-pdf-viewer.test.ts`

Expected: FAIL porque el visor actual usa un `aside` lateral relativo.

- [ ] **Step 3: Implementar el diálogo fullscreen**

Cambiar el wrapper a un diálogo fijo, agregar bloqueo/restauración de `document.body.style.overflow`, listener de teclado, botón de reset, zoom 50–400%, navegación de página y un canvas con `overflow-auto` que mantenga la imagen completa disponible en ambos ejes.

- [ ] **Step 4: Ejecutar el test específico**

Run: `npx tsx --test src/__tests__/cerebro-v2-pdf-viewer.test.ts`

Expected: PASS.

### Task 2: Regresión y publicación

**Files:**
- Verify: `src/components/cerebro-v2/cerebro-v2-shell.tsx`
- Verify: `src/lib/cerebro-v2/ui-state.ts`

- [ ] **Step 1: Ejecutar todas las pruebas TypeScript**

Run: `npm test`

Expected: todos los tests pasan y la apertura/cierre de fuentes conserva el contrato existente.

- [ ] **Step 2: Ejecutar build y verificador de seguridad**

Run: `.agents/skills/maccell/scripts/verify-production-safety.sh --with-build`

Expected: build completado sin errores nuevos.

- [ ] **Step 3: Commit y push a main**

```bash
git add docs/superpowers src/components/cerebro-v2/cerebro-v2-pdf-viewer.tsx src/__tests__/cerebro-v2-pdf-viewer.test.ts
git commit -m "feat(cerebro): abrir pdf en visor fullscreen"
git push origin main
```

- [ ] **Step 4: Desplegar y verificar producción**

Desplegar la aplicación MACCELL desde Dokploy y validar salud de Cerebro, apertura de una página citada, zoom, scroll y cierre del modal.
