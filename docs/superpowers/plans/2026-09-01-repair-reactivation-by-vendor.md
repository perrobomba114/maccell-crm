# Reactivación de reparaciones por vendedor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ocultar reparaciones detenidas de la operación técnica y permitir que vendedores de la misma sucursal las devuelvan a `Ingresado` con historial y notificaciones.

**Architecture:** Reutilizar `RepairStatusHistory` como fuente de trazabilidad, añadir una acción de servidor transaccional dedicada a la reactivación y centralizar los conjuntos de estados operativos. Las vistas pedirán únicamente el universo que corresponde a cada rol; el historial del vendedor será el punto de reactivación.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma/PostgreSQL, Server Actions, Vitest/Node test runner, Tailwind y componentes actuales de reparaciones.

**Spec:** `docs/superpowers/specs/2026-09-01-repair-reactivation-by-vendor-design.md`

## Global Constraints

- Usar `REPAIR_STATUS` y helpers semánticos; no agregar nuevos `statusId` numéricos sin nombre.
- La acción debe resolver el usuario con `getCurrentUser()` y validar rol/sucursal en servidor.
- La transición y el `RepairStatusHistory` deben crearse dentro de una única transacción.
- No crear migración Prisma ni duplicar `previousStatusId`; el historial existente es la fuente de verdad.
- No agregar `console.log`, `any`, `as any`, catches silenciosos ni datos sensibles en logs.
- No agregar comportamiento a archivos de más de 300 líneas sin dividir primero por responsabilidad.
- Los tests de estados, permisos, historial y fallback de notificaciones son obligatorios.

---

### Task 1: Centralizar estados y dividir el ciclo técnico grande

**Files:**
- Modify: `src/lib/repairs/status.ts`
- Create: `src/lib/repairs/status-sets.ts`
- Create: `src/actions/repairs/tech-lifecycle.ts`
- Create: `src/actions/repairs/finish.ts`
- Modify: `src/actions/repairs/tech-status.ts`
- Modify: `src/lib/actions/repairs.ts`
- Test: `src/__tests__/repair-status-visibility.test.ts`

**Interfaces:**
- `status-sets.ts` produce `TECHNICIAN_REPAIR_STATUS_IDS`, `VENDOR_ACTIVE_REPAIR_STATUS_IDS`, `VENDOR_REACTIVATABLE_STATUS_IDS` y `VENDOR_HISTORY_STATUS_IDS` como tuplas readonly basadas en `REPAIR_STATUS`.
- `tech-lifecycle.ts` conserva las firmas `startRepairAction(repairId: string, technicianId: string)` y `pauseRepairAction(repairId: string, technicianId: string)`.
- `finish.ts` conserva la firma existente `finishRepairAction(formData: FormData)`.
- `tech-status.ts` queda como compatibilidad de importación o se elimina solo cuando todas las exportaciones estén redirigidas por `src/lib/actions/repairs.ts`.

- [ ] **Step 1: Write the failing test**

Agregar casos que fallen con el comportamiento actual:

```ts
test("technician active set excludes diagnostic and waiting states", () => {
    assert.deepEqual([...TECHNICIAN_REPAIR_STATUS_IDS], [2, 3, 4]);
});

test("vendor active and history sets place waiting repairs in history", () => {
    assert.deepEqual([...VENDOR_ACTIVE_REPAIR_STATUS_IDS], [1, 2, 3, 4]);
    assert.deepEqual([...VENDOR_HISTORY_STATUS_IDS], [5, 6, 7, 8, 9, 10]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/repair-status-visibility.test.ts`

Expected: FAIL because the new status-set exports do not exist.

- [ ] **Step 3: Write minimal implementation**

Definir los cuatro conjuntos con `REPAIR_STATUS` y separar `startRepairAction`, `pauseRepairAction` y `finishRepairAction` de `tech-status.ts` sin modificar sus reglas de negocio. Actualizar el wrapper para reexportar las funciones desde sus nuevos módulos.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/repair-status-visibility.test.ts`

Expected: PASS y sin cambios en las firmas públicas usadas por los modales.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repairs/status.ts src/lib/repairs/status-sets.ts src/actions/repairs/tech-lifecycle.ts src/actions/repairs/finish.ts src/actions/repairs/tech-status.ts src/lib/actions/repairs.ts src/__tests__/repair-status-visibility.test.ts
git commit -m "refactor(repairs): centralizar conjuntos de estados"
```

### Task 2: Implementar la reactivación transaccional por vendedor

**Files:**
- Create: `src/actions/repairs/reactivate.ts`
- Modify: `src/lib/actions/repairs.ts`
- Test: `src/__tests__/repair-reactivation.test.ts`

**Interfaces:**
- Produce `reactivateRepairAction(repairId: string): Promise<{ success: true } | { success: false; error: string }>`.
- Consume `getCurrentUser`, `REPAIR_STATUS`, `VENDOR_REACTIVATABLE_STATUS_IDS`, `db.$transaction` y `createNotificationAction`.

- [ ] **Step 1: Write the failing test**

Cubrir autorización, transición y concurrencia lógica con un repositorio Prisma simulado en el borde de la acción:

```ts
test("vendor from same branch reactivates waiting repair to pending and records origin", async () => {
    const result = await reactivateRepairAction("repair-waiting-confirmation");
    assert.deepEqual(result, { success: true });
    assert.equal(updatedRepair.statusId, REPAIR_STATUS.PENDING);
    assert.equal(updatedRepair.assignedUserId, null);
    assert.equal(updatedRepair.startedAt, null);
    assert.equal(updatedRepair.finishedAt, null);
    assert.deepEqual(createdHistory, {
        fromStatusId: REPAIR_STATUS.WAITING_CONFIRMATION,
        toStatusId: REPAIR_STATUS.PENDING,
        userId: sameBranchVendor.id,
    });
    assert.match(createdObservation.content, /Esperando Confirmación/);
});

test("vendor from another branch cannot reactivate repair", async () => {
    const result = await reactivateRepairAction("repair-other-branch");
    assert.deepEqual(result, { success: false, error: "No autorizado" });
});

test("second reactivation does not create another history entry", async () => {
    const result = await reactivateRepairAction("repair-already-pending");
    assert.deepEqual(result, { success: false, error: "La reparación no está esperando reactivación" });
    assert.equal(createdHistoryCount, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/repair-reactivation.test.ts`

Expected: FAIL because `reactivateRepairAction` no existe y no hay transición dedicada.

- [ ] **Step 3: Write minimal implementation**

En `reactivate.ts`:

1. Resolver `caller` con `getCurrentUser()`.
2. Rechazar roles distintos de `VENDOR` y `ADMIN`; para `VENDOR`, exigir `caller.branchId === repair.branchId`.
3. Dentro de `$transaction`, leer la reparación y actualizarla con `updateMany` condicionado a `statusId: { in: [...VENDOR_REACTIVATABLE_STATUS_IDS] }` y `assignedUserId` conservado como condición de carrera.
4. Actualizar a `statusId: REPAIR_STATUS.PENDING`, `assignedUserId: null`, `startedAt: null`, `finishedAt: null`.
5. Crear el registro de `RepairStatusHistory` y la observación con el estado origen real.
6. Fuera de la transacción, notificar a técnicos de la sucursal y globales; un fallo de notificación se registra y no revierte la reactivación.
7. Revalidar `/technician/tickets`, `/technician/repairs`, `/technician/dashboard`, `/vendor/repairs/active` y `/vendor/repairs/history`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/repair-reactivation.test.ts`

Expected: PASS con una sola entrada de historial por reactivación exitosa.

- [ ] **Step 5: Commit**

```bash
git add src/actions/repairs/reactivate.ts src/lib/actions/repairs.ts src/__tests__/repair-reactivation.test.ts
git commit -m "feat(repairs): permitir reactivacion por vendedor"
```

### Task 3: Corregir consultas operativas y notificar estados detenidos

**Files:**
- Modify: `src/actions/repairs/history.ts`
- Modify: `src/app/technician/repairs/page.tsx`
- Modify: `src/app/vendor/repairs/active/page.tsx`
- Modify: `src/app/vendor/repairs/history/page.tsx`
- Modify: `src/actions/repairs/finish.ts`
- Test: `src/__tests__/repair-visibility.test.ts`

**Interfaces:**
- Las páginas usarán conjuntos readonly, no literales de estado.
- El historial del vendedor consultará `VENDOR_HISTORY_STATUS_IDS`.
- El cambio de técnico a estado `7`, `8` o `9` notificará al creador del ingreso con enlace `/vendor/repairs/history`.

- [ ] **Step 1: Write the failing test**

Verificar por fuente y comportamiento que las páginas no soliciten estados detenidos y que el historial sí los incluya:

```ts
test("technician repairs page requests only assigned operational statuses", () => {
    assert.match(technicianRepairsSource, /TECHNICIAN_REPAIR_STATUS_IDS/);
    assert.doesNotMatch(technicianRepairsSource, /\[2, 3, 4, 7, 8, 9\]/);
});

test("vendor active page excludes waiting repairs and vendor history includes them", () => {
    assert.match(vendorActiveSource, /VENDOR_ACTIVE_REPAIR_STATUS_IDS/);
    assert.match(vendorHistoryActionSource, /VENDOR_HISTORY_STATUS_IDS/);
});

test("blocked technician status links the vendor to repair history", () => {
    assert.match(finishActionSource, /vendor\/repairs\/history/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/repair-visibility.test.ts`

Expected: FAIL because the technician page currently requests `[2, 3, 4, 7, 8, 9]` and history excludes `8`/`9`.

- [ ] **Step 3: Write minimal implementation**

Usar `TECHNICIAN_REPAIR_STATUS_IDS` y filtrar por `assignedUserId === user.id`, conservando además el estado `REPAIR_STATUS.CLAIMED` sin asignar requerido por el flujo existente de retiro/asignación; usar `VENDOR_ACTIVE_REPAIR_STATUS_IDS` en activos; incluir `VENDOR_HISTORY_STATUS_IDS` en historial. En `src/actions/repairs/finish.ts`, elegir el enlace de historial para estados detenidos y mantener el enlace activo para estados operativos/finales.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/repair-visibility.test.ts`

Expected: PASS; una reparación reactivada en estado `1` queda visible en trabajo disponible y activos.

- [ ] **Step 5: Commit**

```bash
git add src/actions/repairs/history.ts src/app/technician/repairs/page.tsx src/app/vendor/repairs/active/page.tsx src/app/vendor/repairs/history/page.tsx src/actions/repairs/finish.ts src/__tests__/repair-visibility.test.ts
git commit -m "fix(repairs): separar estados detenidos de vistas activas"
```

### Task 4: Añadir botón de reactivación responsive al historial

**Files:**
- Modify: `src/components/repairs/history-repairs-table.tsx`
- Modify: `src/components/repairs/repair-history-row.tsx`
- Modify: `src/components/repairs/repair-history-card.tsx`
- Modify: `src/components/repairs/repair-history-types.ts`
- Test: `src/__tests__/repair-reactivation-ui.test.ts`

**Interfaces:**
- `HistoryRepairsTable` manejará `reactivatingId` y pasará `onReactivate` a fila y tarjeta.
- Fila y tarjeta mostrarán el botón únicamente cuando `repair.statusId` esté en `VENDOR_REACTIVATABLE_STATUS_IDS`.

- [ ] **Step 1: Write the failing test**

```ts
test("history desktop and mobile surfaces expose vendor reactivation", () => {
    assert.match(historyTableSource, /reactivateRepairAction/);
    assert.match(historyRowSource, /Reactivar para técnico/);
    assert.match(historyCardSource, /Reactivar para técnico/);
});

test("history action refreshes after successful reactivation", () => {
    assert.match(historyTableSource, /router\.refresh\(\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/repair-reactivation-ui.test.ts`

Expected: FAIL because neither la tabla ni sus presentaciones importan la acción ni muestran el botón.

- [ ] **Step 3: Write minimal implementation**

Agregar confirmación nativa accesible antes de llamar la Server Action, estado de carga por ticket, toast de éxito/error y `router.refresh()`. Mantener el botón junto a ver detalle, imágenes e impresión sin alterar esos controles. Usar `aria-label` y `title` descriptivos.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/repair-reactivation-ui.test.ts`

Expected: PASS en las dos variantes responsive.

- [ ] **Step 5: Commit**

```bash
git add src/components/repairs/history-repairs-table.tsx src/components/repairs/repair-history-row.tsx src/components/repairs/repair-history-card.tsx src/components/repairs/repair-history-types.ts src/__tests__/repair-reactivation-ui.test.ts
git commit -m "feat(repairs): agregar reactivacion al historial del vendedor"
```

### Task 5: Regresión completa y verificación de producción

**Files:**
- Modify: solo archivos de implementación o tests si una falla comprobada lo requiere.

- [ ] **Step 1: Run focused repair tests**

Run: `npm test -- src/__tests__/repair-status-visibility.test.ts src/__tests__/repair-reactivation.test.ts src/__tests__/repair-visibility.test.ts src/__tests__/repair-reactivation-ui.test.ts`

Expected: todos los casos pasan.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test`

Expected: cero tests fallidos.

- [ ] **Step 3: Run typecheck and touched-file lint**

Run: `npx tsc --noEmit`

Then run ESLint on the exact changed `.ts`/`.tsx` files collected with:

```bash
CHANGED_TS="$( { git diff --name-only --diff-filter=ACMR; git ls-files --others --exclude-standard; } | sort -u | grep -E '\.(ts|tsx)$' || true )"
if [ -n "$CHANGED_TS" ]; then printf '%s\n' "$CHANGED_TS" | xargs npx eslint --quiet; fi
```

Expected: typecheck y lint sin errores nuevos.

- [ ] **Step 4: Run repository safety checks**

Run: `git diff --check`

Expected: sin errores de whitespace.

- [ ] **Step 5: Run production build**

Run: `npm run build`

Expected: build terminado correctamente; si vuelve a aparecer el error local de certificados de Google Fonts, reportarlo como bloqueo ambiental exacto y no modificar certificados ni desactivar TLS.

- [ ] **Step 6: Inspect final scope**

Run: `git status --short` y `git diff --stat`

Expected: los cambios de esta funcionalidad están separados de los archivos previos del usuario y no hay archivos generados o secretos incluidos. Si hay correcciones necesarias, se agregan únicamente las rutas exactas que las contienen; nunca los cambios previos de Cerebro ni los archivos de cómics.
