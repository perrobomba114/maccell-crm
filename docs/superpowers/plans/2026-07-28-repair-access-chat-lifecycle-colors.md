# Repair Access and Chat Lifecycle/Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar “Sin código / No autoriza” en recepción e impresión, archivar chats solo tras la entrega y colorear mensajes por rol.

**Architecture:** Mantener `RepairAccessType.NONE` y centralizar su texto en el formateador existente. Cambiar las constantes compartidas de estados para que repositorio, política de solo lectura y navegación se mantengan sincronizados. Extraer el estilo visual de mensajes a una función pura por rol para probarla sin renderizar el componente completo.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Node test runner, Prisma status IDs existentes.

---

### Task 1: Texto de acceso y comprobante

**Files:**
- Modify: `src/__tests__/repair-intake.test.ts`
- Modify: `src/__tests__/repair-intake-ui.test.ts`
- Modify: `src/lib/repairs/intake.ts`
- Modify: `src/components/repairs/repair-intake-fields.tsx`
- Modify: `src/components/repairs/finish-repair-intake-check.tsx`

- [ ] **Step 1: Escribir pruebas fallidas**

Agregar aserciones para que `formatRepairAccess("NONE")` sea `Sin código / No autoriza`, y para que formulario/revisión contengan el mismo rótulo y la descripción `El equipo no tiene bloqueo o el cliente no autoriza el acceso`.

- [ ] **Step 2: Verificar RED**

Run: `npx tsx --test src/__tests__/repair-intake.test.ts src/__tests__/repair-intake-ui.test.ts`

Expected: FAIL porque hoy devuelve y renderiza `Sin código`.

- [ ] **Step 3: Implementar el texto único**

Cambiar el retorno `NONE` del formateador y los dos textos visibles. No cambiar enum, persistencia ni credenciales. `printRepairTicket` ya consume `formatRepairAccess`, por lo que el comprobante heredará el nuevo texto.

- [ ] **Step 4: Verificar GREEN**

Run: `npx tsx --test src/__tests__/repair-intake.test.ts src/__tests__/repair-intake-ui.test.ts src/__tests__/repair-printing.test.ts`

Expected: PASS.

### Task 2: Archivar solamente al entregar

**Files:**
- Modify: `src/__tests__/repair-chat-policy.test.ts`
- Modify: `src/__tests__/repair-chat-navigation.test.ts`
- Modify: `src/lib/repairs/status.ts`

- [ ] **Step 1: Escribir pruebas fallidas**

Exigir que estados `5` y `7` sean activos y editables, mientras `6` y `10` sean archivados y de solo lectura. Agregar navegación de `Finalizado OK` hacia activos y `Entregada` hacia historial.

- [ ] **Step 2: Verificar RED**

Run: `npx tsx --test src/__tests__/repair-chat-policy.test.ts src/__tests__/repair-chat-navigation.test.ts`

Expected: FAIL para estados `5` y `7` porque hoy pertenecen a `FINAL_REPAIR_CHAT_STATUS_IDS`.

- [ ] **Step 3: Corregir constantes compartidas**

Definir `ACTIVE_REPAIR_CHAT_STATUS_IDS = [1, 2, 3, 4, 5, 7, 8, 9]` y `FINAL_REPAIR_CHAT_STATUS_IDS = [6, 10]`. No duplicar lógica en repositorio, política ni navegación.

- [ ] **Step 4: Verificar GREEN**

Run: `npx tsx --test src/__tests__/repair-chat-policy.test.ts src/__tests__/repair-chat-navigation.test.ts src/__tests__/repair-chat-repository.test.ts`

Expected: PASS.

### Task 3: Colores de mensajes por rol

**Files:**
- Create: `src/lib/repair-chat/message-style.ts`
- Modify: `src/__tests__/repair-chat-ui.test.ts`
- Create: `src/__tests__/repair-chat-message-style.test.ts`
- Modify: `src/components/repair-chat/repair-chat-thread.tsx`

- [ ] **Step 1: Escribir pruebas fallidas**

Probar que `getRepairChatMessageStyle("VENDOR")` contiene verde esmeralda, `TECHNICIAN` azul y `ADMIN` negro con borde visible; verificar además que el componente usa el rol del remitente y no el usuario actual para elegir color.

- [ ] **Step 2: Verificar RED**

Run: `npx tsx --test src/__tests__/repair-chat-message-style.test.ts src/__tests__/repair-chat-ui.test.ts`

Expected: FAIL porque el helper no existe y el componente colorea por `senderId === currentUserId`.

- [ ] **Step 3: Implementar estilos puros**

Crear un mapa tipado `Record<RepairChatMessage["sender"]["role"], RepairChatMessageStyle>` con clases de burbuja, metadatos, respuesta y recibo. En el render, calcular una vez `const style = getRepairChatMessageStyle(message.sender.role)` por mensaje; conservar `ml-auto`/`mr-auto` solo para alineación.

- [ ] **Step 4: Verificar GREEN**

Run: `npx tsx --test src/__tests__/repair-chat-message-style.test.ts src/__tests__/repair-chat-ui.test.ts`

Expected: PASS.

### Task 4: Verificación y publicación

**Files:**
- Verify all changed files.

- [ ] **Step 1: Ejecutar gate completo**

Run: `.agents/skills/maccell/scripts/verify-production-safety.sh --with-build`

Expected: TypeScript, lint, whitespace, tests y production build en PASS. Los anti-patrones preexistentes se revisan sin atribuirlos a este cambio.

- [ ] **Step 2: Restaurar versión generada y revisar diff**

Restaurar `public/version.txt` a su contenido de `HEAD` mediante `apply_patch`, ejecutar `git diff --check` y verificar que no haya cambios ajenos.

- [ ] **Step 3: Commit y push**

Run: `git add <archivos del cambio> && git commit -m "fix(repairs): ajustar acceso y archivo del chat" && git push origin main`

Expected: commit en `main` y push exitoso.

- [ ] **Step 4: Verificar Dokploy**

Confirmar por MCP que el deployment del commit termine `done`, revisar logs de arranque y consultar `/api/system/version`.
