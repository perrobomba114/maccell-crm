# Facturación ARCA de producción Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar conciliación ARCA mensual completa, una UX fiscal compacta y emisión administrativa autenticada, validada e idempotente.

**Architecture:** El lector ARCA usa `FECompUltimoAutorizado` y `FECompConsultar` para hallar y recorrer el período real por entidad/punto/tipo; los resultados se persisten para que la pantalla no dependa de una lectura remota en cada render. La emisión registra primero un intento idempotente y separa autorización externa de sincronización local para recuperar una factura ya autorizada sin volver a emitirla.

**Tech Stack:** Next.js 15 Server Actions, React 19, TypeScript estricto, Prisma/PostgreSQL, Zod, Vitest/Node test runner mediante `tsx --test`, Tailwind y shadcn/ui.

---

## Estructura de archivos

- `prisma/schema.prisma`: estados persistidos de conciliación e intentos de emisión.
- `src/actions/afip-voucher-period-reader.ts`: descubrimiento de límites y lectura completa de un período.
- `src/actions/afip-voucher-reader.ts`: primitivas acotadas de acceso WSFEv1 y tipos compartidos.
- `src/actions/invoice-afip-control-helpers.ts`: claves exactas, rangos de fecha y comparación bidireccional pura.
- `src/actions/invoice-afip-control.ts`: autorización, orquestación y persistencia del control.
- `src/lib/admin-invoice-validation.ts`: esquema y reglas fiscales puras.
- `src/lib/actions/admin-invoice-persistence.ts`: intento idempotente y sincronización local.
- `src/lib/actions/admin-invoice.ts`: Server Actions autenticadas y orquestación ARCA.
- `src/hooks/use-invoice-form.ts`: estado del formulario, revisión y request id idempotente.
- `src/app/admin/invoices/create-invoice-modal.tsx`: diálogo compacto con paso de confirmación.
- `src/app/admin/invoices/invoice-summary-cards.tsx`: cuatro KPIs compactos.
- `src/app/admin/invoices/invoice-afip-control-panel.tsx`: conciliación horizontal completa.
- `src/app/admin/invoices/page.tsx`: carga paralela y composición segura.
- `src/__tests__/afip-period-reader.test.ts`: límites mensuales y fallas parciales.
- `src/__tests__/invoice-afip-control-helpers.test.ts`: puntos de venta y diferencias bidireccionales.
- `src/__tests__/admin-invoice-validation.test.ts`: reglas fiscales y monetarias.
- `src/__tests__/admin-invoice-action.test.ts`: contrato de auth/idempotencia sin emitir a ARCA.
- `src/__tests__/invoice-afip-control-panel.test.ts`: etiquetas y estados de UI.

### Task 1: Congelar el comportamiento esperado con tests de regresión

**Files:**
- Create: `src/__tests__/afip-period-reader.test.ts`
- Modify: `src/__tests__/invoice-afip-control-helpers.test.ts`
- Create: `src/__tests__/admin-invoice-validation.test.ts`

- [ ] Escribir tests para que una secuencia con fechas anterior/dentro/posterior devuelva únicamente todos los comprobantes del mes, sin límite 120.
- [ ] Escribir tests para que una consulta rechazada marque el resultado incompleto.
- [ ] Escribir tests que parseen punto de venta y número desde `00010-00027897` y comparen faltantes en ambos sentidos.
- [ ] Escribir tests de Factura A: exige CUIT de 11 dígitos y Responsable Inscripto; Factura B acepta consumidor final; cantidades/precios deben ser finitos y positivos.
- [ ] Ejecutar `npm test -- --test-name-pattern='ARCA period|admin invoice validation|compares'` y comprobar que falla por APIs todavía inexistentes.

### Task 2: Persistir conciliaciones e intentos idempotentes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] Agregar enums `AfipReconciliationStatus` (`RUNNING`, `COMPLETE`, `INCOMPLETE`, `FAILED`) y `FiscalEmissionStatus` (`PENDING`, `AUTHORIZED_PENDING_SYNC`, `COMPLETED`, `FAILED`).
- [ ] Agregar `AfipReconciliation` con clave única `[period, entity]`, conteos/totales, diferencias, JSON de discrepancias/avisos y timestamps.
- [ ] Agregar `FiscalEmissionAttempt` con `id` idempotente, solicitante, sucursal, entidad, punto, tipo, payload JSON, CAE/número/vencimiento/venta opcionales, estado/error y timestamps.
- [ ] Ejecutar `npx prisma format && npx prisma generate`; esperar generación sin errores.
- [ ] Ejecutar `npx tsc --noEmit` para validar tipos generados.

### Task 3: Leer el período completo con métodos oficiales

**Files:**
- Create: `src/actions/afip-voucher-period-reader.ts`
- Modify: `src/actions/afip-voucher-reader.ts`
- Test: `src/__tests__/afip-period-reader.test.ts`

- [ ] Extraer una interfaz `AfipVoucherService` con `getLastVoucher` y `getVoucherInfo` para poder simular ARCA.
- [ ] Implementar `findVoucherPeriodBounds`: obtener último número y usar búsqueda binaria por `voucherDate` para hallar primer/último comprobante dentro de `[startDate,endDate]`.
- [ ] Implementar `readVoucherPeriod`: recorrer inclusivamente esos límites en lotes de concurrencia limitada, sumar total/neto/IVA y conservar cada lookup exacto.
- [ ] Si cualquier lookup falla, devolver `complete:false` y sus números fallidos; nunca producir estado conciliado.
- [ ] Eliminar el límite `MAX_SCAN_PER_RANGE_DEFAULT = 120` y el presupuesto global de 12 segundos del flujo mensual.
- [ ] Ejecutar `npm test -- --test-name-pattern='ARCA period'`; esperar PASS.

### Task 4: Comparar y guardar el control mensual

**Files:**
- Modify: `src/actions/invoice-afip-control-helpers.ts`
- Modify: `src/actions/invoice-afip-control.ts`
- Test: `src/__tests__/invoice-afip-control-helpers.test.ts`

- [ ] Exportar `parseInvoiceVoucherIdentity` que derive entidad, punto de venta, tipo y número del comprobante real.
- [ ] Implementar `compareInvoiceLookups` con `Set` para devolver `onlyLocal`, `onlyAfip` y coincidencias.
- [ ] Consultar tipos A/B/C por las entidades configuradas y ejecutar MACCELL/8BIT en paralelo controlado.
- [ ] Hacer `upsert` del estado `RUNNING` antes de leer y `COMPLETE`, `INCOMPLETE` o `FAILED` al terminar.
- [ ] Exponer una acción de lectura cacheada y una acción explícita de actualización; ambas exigen ADMIN.
- [ ] Ejecutar `npm test -- --test-name-pattern='compares|voucher ranges'`; esperar PASS.

### Task 5: Endurecer la emisión administrativa

**Files:**
- Create: `src/lib/admin-invoice-validation.ts`
- Create: `src/lib/actions/admin-invoice-persistence.ts`
- Modify: `src/lib/actions/admin-invoice.ts`
- Modify: `src/lib/afip.ts`
- Test: `src/__tests__/admin-invoice-validation.test.ts`
- Test: `src/__tests__/admin-invoice-action.test.ts`

- [ ] Validar el input con Zod y calcular neto/IVA/total exclusivamente en servidor usando redondeo centavo a centavo.
- [ ] Autenticar `searchCuit` y `generateAdminInvoice`; exigir rol ADMIN y usar `caller.id` en lugar del `userId` del navegador.
- [ ] Resolver la sucursal con `findUniqueOrThrow`, derivar entidad por código y fijar punto 10 para MACCELL / 3 para 8BIT; rechazar inconsistencias.
- [ ] Crear o recuperar `FiscalEmissionAttempt` por `requestId` antes de ARCA.
- [ ] Si el intento está `COMPLETED`, devolver su factura; si está `AUTHORIZED_PENDING_SYNC`, consultar el comprobante autorizado y sincronizar sin llamar a `createNextVoucher`.
- [ ] Tras autorización, persistir CAE/número/vencimiento antes de crear venta, ítems, pago e invoice en una transacción.
- [ ] Usar `paymentMethod` real y crear `SalePayment`; no hardcodear `CASH`.
- [ ] Normalizar en `createAfipInvoice` un `voucherNumber` obligatorio a partir de `FeDetResp.FECAEDetResponse[0].CbteDesde`; si falta tras CAE, recuperar/validar con `getLastVoucher` + `getVoucherInfo`.
- [ ] Ejecutar tests de validación/acción y comprobar que no se invoca ninguna credencial o endpoint real.

### Task 6: Rediseñar resumen y control ARCA

**Files:**
- Modify: `src/app/admin/invoices/invoice-summary-cards.tsx`
- Modify: `src/app/admin/invoices/invoice-afip-control-panel.tsx`
- Modify: `src/app/admin/invoices/page.tsx`
- Test: `src/__tests__/invoice-afip-control-panel.test.ts`

- [ ] Sustituir las tres columnas altas por cuatro KPIs compactos: Ventas facturadas, Neto gravado, IVA débito fiscal y Conciliación ARCA.
- [ ] Renderizar el control a ancho completo con una fila por entidad y columnas Local, ARCA, Diferencia, Comprobantes y Estado.
- [ ] Mostrar `Completo`, `Incompleto`, `Error` o `Sin consultar`; no usar “muestra conciliada”.
- [ ] Rotular explícitamente que son comprobantes emitidos/ventas y que compras/crédito fiscal no están integrados.
- [ ] Conservar el último resultado al actualizar y presentar fallas en un bloque desplegable compacto.
- [ ] Exigir ADMIN en la página y paralelizar consultas independientes con `Promise.all`.
- [ ] Ejecutar el test del panel y verificar etiquetas nuevas y ausencia de “Muestra ARCA”.

### Task 7: Convertir Emitir factura en revisión irreversible segura

**Files:**
- Modify: `src/hooks/use-invoice-form.ts`
- Modify: `src/app/admin/invoices/create-invoice-modal.tsx`
- Modify: `src/app/admin/invoices/components/InvoiceConfigSection.tsx`
- Modify: `src/app/admin/invoices/components/InvoiceCustomerSection.tsx`
- Modify: `src/app/admin/invoices/components/InvoiceItemsSection.tsx`

- [ ] Derivar totales con `useMemo`, usar updates funcionales y generar un `requestId` por intento, renovándolo sólo tras éxito o cancelación confirmada.
- [ ] Agregar validación cliente equivalente para feedback temprano, manteniendo al servidor como autoridad.
- [ ] Cambiar el CTA a “Revisar factura” y mostrar un segundo paso con entidad, punto, tipo, receptor, conceptos, neto, IVA y total.
- [ ] Requerir confirmación explícita “Emitir en ARCA”; deshabilitar cierre y doble envío mientras se autoriza.
- [ ] Mostrar el resultado con número, CAE y estado de sincronización; si queda pendiente local, indicar que no debe reemitirse.
- [ ] Verificar teclado, labels, foco y layout mobile sin agregar timers ni hooks condicionales.

### Task 8: Verificación de producción y cierre

**Files:**
- Modify: `docs/superpowers/plans/2026-07-17-facturacion-arca-produccion.md` (marcar checks)

- [ ] Ejecutar `npm test`; esperar todos los tests PASS.
- [ ] Ejecutar `npx tsc --noEmit`; esperar exit 0.
- [ ] Ejecutar ESLint sólo sobre archivos TypeScript/TSX tocados; esperar exit 0.
- [ ] Ejecutar `git diff --check`; esperar sin salida.
- [ ] Ejecutar `.agents/skills/maccell/scripts/verify-production-safety.sh --with-build`; registrar cualquier bloqueo externo concreto.
- [ ] Ejecutar consultas PostgreSQL `READ ONLY` para comparar conteos/totales del período disponible; no imprimir secretos.
- [ ] Validar UI local en desktop y mobile con navegador sin pulsar la confirmación final de ARCA.
- [ ] Confirmar que ninguna prueba llamó producción ni emitió un comprobante real.
- [ ] Commit final: `fix(admin): completar conciliación arca y emisión segura`.
