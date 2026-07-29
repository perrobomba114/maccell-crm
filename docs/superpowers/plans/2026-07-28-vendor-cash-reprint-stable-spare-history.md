# Vendor Cash Reprint and Stable Spare History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reimprimir de forma segura el último cierre diario del vendedor y mantener fija cada fila del historial de repuestos al controlarla.

**Architecture:** Una función pura reconstruirá los totales imprimibles de un cierre y una Server Action autenticada obtendrá el último cierre propio dentro de la fecha argentina seleccionada. El historial extraerá su estado a un hook con actualización local por ID, mientras la consulta tendrá orden total `createdAt` + `id`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma, Vitest mediante `node:test`, Tailwind y Sonner.

---

### Task 1: Cálculo puro del cierre histórico

**Files:**
- Create: `src/lib/cash-shift-reprint.ts`
- Create: `src/__tests__/cash-shift-reprint.test.ts`

- [ ] **Step 1: Write the failing tests**

Probar que el cálculo suma pagos CASH/CARD/MERCADOPAGO, usa el método cabecera cuando una venta antigua no tiene pagos, resta gastos, calcula el premio por empleado y conserva `endAmount` como total contado.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- src/__tests__/cash-shift-reprint.test.ts`

Expected: FAIL porque `buildCashShiftReprintSummary` todavía no existe.

- [ ] **Step 3: Implement the pure calculator**

Crear tipos acotados para ventas, pagos, gastos y caja y exportar:

```ts
export function buildCashShiftReprintSummary(input: CashShiftReprintInput): CashShiftReprintSummary
```

La función debe devolver `summary`, `finalCount`, `employeeCount` y `billCounts: {}` sin acceder a Prisma ni al navegador.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- src/__tests__/cash-shift-reprint.test.ts`

Expected: PASS.

### Task 2: Server Action autenticada para el último cierre

**Files:**
- Create: `src/actions/cash-shifts/vendor-reprint.ts`
- Create: `src/__tests__/vendor-cash-reprint-policy.test.ts`

- [ ] **Step 1: Write the failing structural and policy tests**

Verificar que la acción usa `getCurrentUser`, exige rol `VENDOR`, filtra `userId`, `status: "CLOSED"`, usa `getDailyRange`, ordena por `endTime` e `id`, y acota ventas/gastos entre `startTime` y `endTime`.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- src/__tests__/vendor-cash-reprint-policy.test.ts`

Expected: FAIL porque la acción no existe.

- [ ] **Step 3: Implement the Server Action**

Exportar:

```ts
export async function getLatestVendorCashShiftForReprint(date: string): Promise<VendorCashShiftReprintResult>
```

Validar `YYYY-MM-DD`, autenticar antes de consultar, obtener una caja cerrada del usuario, consultar ventas/pagos y gastos en paralelo, llamar al cálculo puro y devolver únicamente datos serializables requeridos por la impresión.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- src/__tests__/cash-shift-reprint.test.ts src/__tests__/vendor-cash-reprint-policy.test.ts`

Expected: PASS.

### Task 3: Botón de reimpresión en Mis Ventas

**Files:**
- Modify: `src/app/vendor/sales/use-vendor-sales.ts`
- Modify: `src/app/vendor/sales/sales-client.tsx`
- Create: `src/__tests__/vendor-sales-cash-reprint-ui.test.ts`

- [ ] **Step 1: Write the failing UI test**

Verificar el texto `Reimprimir cierre`, el icono de impresión, la llamada a `getLatestVendorCashShiftForReprint`, la fecha `yyyy-MM-dd`, el estado de carga y el uso de `printCashShiftClosureTicket`.

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- src/__tests__/vendor-sales-cash-reprint-ui.test.ts`

Expected: FAIL porque el botón y el handler no existen.

- [ ] **Step 3: Implement the handler and button**

Agregar `isReprintingShift` y `handleReprintCashShift` al hook. Mostrar el botón junto al total filtrado, responsivo, deshabilitado durante la consulta y con avisos de Sonner para cierre inexistente o error.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- src/__tests__/vendor-sales-cash-reprint-ui.test.ts src/__tests__/cash-shift-reprint.test.ts`

Expected: PASS.

### Task 4: Estado estable del historial de repuestos

**Files:**
- Create: `src/lib/spare-parts-history-state.ts`
- Create: `src/__tests__/spare-parts-history-state.test.ts`
- Create: `src/components/admin/spare-parts/use-spare-parts-history.ts`
- Modify: `src/components/admin/spare-parts/history-client.tsx`
- Modify: `src/actions/spare-parts/history.ts`
- Create: `src/__tests__/spare-parts-history-ui.test.ts`

- [ ] **Step 1: Write failing state and structural tests**

Probar que `updateHistoryChecked` cambia una fila sin modificar el orden de IDs. Verificar que la consulta ordena por `createdAt` e `id`, que la acción devuelve el nuevo `isChecked`, que el control no llama `router.refresh()` y que deshabilita solo la fila pendiente.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- src/__tests__/spare-parts-history-state.test.ts src/__tests__/spare-parts-history-ui.test.ts`

Expected: FAIL por helper/hook/orden ausentes.

- [ ] **Step 3: Implement stable local state**

Crear:

```ts
export function updateHistoryChecked<T extends { id: string; isChecked: boolean }>(rows: T[], id: string, isChecked: boolean): T[]
```

Extraer fecha, búsqueda, sincronización, KPI y toggle al hook. Actualizar solo la fila confirmada, conservar el orden recibido, bloquear dobles pulsaciones y mantener `router.refresh()` solo en sincronización. Cambiar Prisma a `orderBy: [{ createdAt: "desc" }, { id: "desc" }]`.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- src/__tests__/spare-parts-history-state.test.ts src/__tests__/spare-parts-history-ui.test.ts`

Expected: PASS.

### Task 5: Verificación integral y publicación

**Files:**
- Modify: `public/version.txt` solo durante build; restaurar después.

- [ ] **Step 1: Run the complete safety gate**

Run: `.agents/skills/maccell/scripts/verify-production-safety.sh --with-build`

Expected: TypeScript, diff, lint, tests y build PASS.

- [ ] **Step 2: Inspect the final diff and working tree**

Run: `git diff --check && git status --short && git diff --stat`

Expected: solo archivos del alcance; sin cambios accidentales en `public/version.txt`.

- [ ] **Step 3: Commit and push main**

```bash
git add <archivos-del-alcance>
git commit -m "fix(cash): reimprimir cierre y estabilizar historial"
git push origin main
```

- [ ] **Step 4: Verify Dokploy and production health**

Confirmar que el despliegue del commit termina en `done`, revisar logs de inicio y consultar `/api/system/version`.
