# Vendor Repair Create Uniform UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el alta de reparaciones del vendedor en un formulario oscuro, uniforme, accesible y responsive sin cambiar su lógica ni los datos enviados.

**Architecture:** Un componente presentacional `RepairFormSection` define la jerarquía visual compartida. `CreateRepairFormFields` conserva la coordinación del estado y redistribuye los componentes existentes en una grilla operativa; cada subcomponente recibe únicamente ajustes de presentación y accesibilidad.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, Node test runner con `tsx --test`.

---

## File map

- Create `src/components/repairs/repair-form-section.tsx`: contenedor visual reutilizable para cada paso.
- Modify `src/components/repairs/create-form.tsx`: fondo, encabezado e indicador de flujo.
- Modify `src/components/repairs/create-repair-form-fields.tsx`: composición responsive y barra de acción.
- Modify `src/components/repairs/customer-form.tsx`: campos uniformes, icono Lucide y errores accesibles.
- Modify `src/components/repairs/device-details.tsx`: campos responsive e icono Lucide.
- Modify `src/components/repairs/repair-intake-fields.tsx`: integrar la recepción al mismo sistema de superficies.
- Modify `src/components/repairs/ticket-input.tsx`: etiqueta visible y estados compatibles con dark mode.
- Modify `src/components/repairs/repair-images.tsx`: carga/fotos con objetivos táctiles y sin emoji.
- Modify `src/components/repairs/promised-date-selector.tsx`: selector compacto, legible y responsive.
- Modify `src/components/repairs/repair-create-confirm-dialog.tsx`: confirmación coherente y compacta.
- Create `src/__tests__/repair-create-ui.test.ts`: regresiones estructurales del rediseño.

### Task 1: Definir la estructura visual compartida

**Files:**
- Create: `src/__tests__/repair-create-ui.test.ts`
- Create: `src/components/repairs/repair-form-section.tsx`
- Modify: `src/components/repairs/create-form.tsx`

- [ ] **Step 1: Escribir el test estructural fallido**

```ts
test("repair creation uses the uniform section system", () => {
  const section = read("components/repairs/repair-form-section.tsx");
  const form = read("components/repairs/create-form.tsx");
  assert.match(section, /aria-labelledby/);
  assert.match(section, /min-h-11/);
  assert.match(form, /Nuevo ingreso/);
  assert.match(form, /Cliente/);
  assert.match(form, /Entrega/);
});
```

- [ ] **Step 2: Verificar RED**

Run: `npx tsx --test src/__tests__/repair-create-ui.test.ts`

Expected: FAIL porque `repair-form-section.tsx` todavía no existe.

- [ ] **Step 3: Crear el contenedor común**

Implementar `RepairFormSection` con props tipadas `step`, `title`, `description`, `icon`, `children`, `className` y `action`; usar `section`, un id estable derivado del paso y clases semánticas `border-border/70 bg-card/80 shadow-sm`.

- [ ] **Step 4: Añadir encabezado e indicador de flujo**

En `CreateRepairForm`, envolver el formulario con una superficie oscura consistente, agregar `Wrench`, título `Nuevo ingreso`, texto operativo y cinco etiquetas de progreso. Mantener `CreateRepairFormFields` y el diálogo como únicos coordinadores del contenido.

- [ ] **Step 5: Verificar GREEN y commit**

Run: `npx tsx --test src/__tests__/repair-create-ui.test.ts`

Expected: PASS.

```bash
git add src/__tests__/repair-create-ui.test.ts src/components/repairs/repair-form-section.tsx src/components/repairs/create-form.tsx
git commit -m "style(vendor): definir estructura uniforme de ingreso"
```

### Task 2: Unificar las secciones y campos principales

**Files:**
- Modify: `src/components/repairs/create-repair-form-fields.tsx`
- Modify: `src/components/repairs/customer-form.tsx`
- Modify: `src/components/repairs/device-details.tsx`
- Modify: `src/components/repairs/ticket-input.tsx`

- [ ] **Step 1: Extender el test con jerarquía y accesibilidad**

```ts
test("repair creation keeps labels, errors and one primary action", () => {
  const fields = read("components/repairs/create-repair-form-fields.tsx");
  const ticket = read("components/repairs/ticket-input.tsx");
  assert.match(fields, /RepairFormSection/);
  assert.match(fields, /aria-live="polite"/);
  assert.match(ticket, /htmlFor="ticket-number"/);
  assert.equal((fields.match(/type="submit"/g) ?? []).length, 1);
});
```

- [ ] **Step 2: Verificar RED**

Run: `npx tsx --test src/__tests__/repair-create-ui.test.ts`

Expected: FAIL por falta de `RepairFormSection`, `aria-live` o etiqueta visible del ticket.

- [ ] **Step 3: Reorganizar `CreateRepairFormFields`**

Usar una grilla `xl:grid-cols-[minmax(0,1.12fr)_minmax(22rem,.88fr)]`. Montar Cliente, Dispositivo y Recepción en la columna principal; Ticket/Fotos y Entrega en la columna secundaria. Agrupar valor y humedad dentro de Entrega y reservar `pb-24` en móvil para la acción sticky.

- [ ] **Step 4: Normalizar campos**

Aplicar a `CustomerForm` y `DeviceDetails`:

```tsx
className={cn(
  "min-h-11 rounded-lg border-border/80 bg-background/70 text-base shadow-none transition-colors",
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
  error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
)}
```

Reemplazar emojis por `UserRound` y `Smartphone`, usar grillas `sm:grid-cols-2`, y añadir `role="alert"` a mensajes de error.

- [ ] **Step 5: Normalizar ticket y CTA**

Agregar `Label htmlFor="ticket-number"`, helper text, fondos oscuros semánticos y `aria-live="polite"` para la disponibilidad. Mantener un único botón submit con `Loader2`, texto normal (sin mayúsculas forzadas) y una barra sticky solo en móvil.

- [ ] **Step 6: Verificar y commit**

Run: `npx tsx --test src/__tests__/repair-create-ui.test.ts`

Expected: PASS.

```bash
git add src/__tests__/repair-create-ui.test.ts src/components/repairs/create-repair-form-fields.tsx src/components/repairs/customer-form.tsx src/components/repairs/device-details.tsx src/components/repairs/ticket-input.tsx
git commit -m "style(vendor): unificar formulario de cliente y equipo"
```

### Task 3: Integrar recepción, fotografías y entrega

**Files:**
- Modify: `src/components/repairs/repair-intake-fields.tsx`
- Modify: `src/components/repairs/repair-images.tsx`
- Modify: `src/components/repairs/promised-date-selector.tsx`

- [ ] **Step 1: Agregar regresiones de interacción**

```ts
test("repair intake and media controls are touch friendly", () => {
  const intake = read("components/repairs/repair-intake-fields.tsx");
  const images = read("components/repairs/repair-images.tsx");
  assert.match(intake, /min-h-11/);
  assert.match(intake, /aria-pressed/);
  assert.doesNotMatch(images, /📸/);
  assert.match(images, /aria-label="Eliminar foto/);
});
```

- [ ] **Step 2: Verificar RED**

Run: `npx tsx --test src/__tests__/repair-create-ui.test.ts`

Expected: FAIL por tamaños táctiles, emoji y etiqueta de eliminación.

- [ ] **Step 3: Uniformar recepción**

Quitar el bloque visual negro/ámbar independiente y usar la superficie compartida del formulario. Mantener cian/primary para selección, `aria-pressed`, foco visible y botones de patrón de al menos 44 px. Mostrar el error con `role="alert"`.

- [ ] **Step 4: Uniformar fotografías**

Usar `ImagePlus` como icono del título, botones de carga/cámara con `min-h-24`, borde dashed consistente, previews con `alt` descriptivo y botón de eliminación siempre visible en touch mediante `aria-label`.

- [ ] **Step 5: Uniformar entrega**

Reducir la altura del selector, conservar fecha/hora editables, usar cifras tabulares y botones secundarios de al menos 44 px. Mantener el Server Action existente para sumar minutos.

- [ ] **Step 6: Verificar y commit**

Run: `npx tsx --test src/__tests__/repair-create-ui.test.ts`

Expected: PASS.

```bash
git add src/__tests__/repair-create-ui.test.ts src/components/repairs/repair-intake-fields.tsx src/components/repairs/repair-images.tsx src/components/repairs/promised-date-selector.tsx
git commit -m "style(vendor): integrar recepción fotos y entrega"
```

### Task 4: Refinar confirmación y validar la página completa

**Files:**
- Modify: `src/components/repairs/repair-create-confirm-dialog.tsx`
- Test: `src/__tests__/repair-create-ui.test.ts`

- [ ] **Step 1: Extender la prueba del diálogo**

```ts
test("repair confirmation uses concise operational actions", () => {
  const dialog = read("components/repairs/repair-create-confirm-dialog.tsx");
  assert.match(dialog, /Volver a revisar/);
  assert.match(dialog, /Confirmar y registrar/);
  assert.doesNotMatch(dialog, /text-3xl/);
});
```

- [ ] **Step 2: Verificar RED y refinar el diálogo**

Run: `npx tsx --test src/__tests__/repair-create-ui.test.ts`

Expected: FAIL con los textos y escala antiguos.

Reemplazar el alert amarillo sobredimensionado por tres filas con iconos `KeyRound`, `PackageCheck` y `Droplets`; mantener el aviso ámbar solo cuando `isWet` sea verdadero y conservar las dos acciones accesibles.

- [ ] **Step 3: Verificar pruebas y tipos**

Run:

```bash
npx tsx --test src/__tests__/repair-create-ui.test.ts src/__tests__/repair-intake.test.ts src/__tests__/repair-intake-visibility.test.ts
npx tsc --noEmit
```

Expected: todas las pruebas pasan y TypeScript sale con código 0.

- [ ] **Step 4: Validar UI real**

Abrir `/vendor/repairs/create` con Playwright en 375×812, 768×1024 y 1440×1000. Verificar ausencia de scroll horizontal, foco visible, código/PIN, patrón `1-2-5-8`, sin código, SIM, memoria, humedad, modal y CTA sticky sin enviar el formulario.

- [ ] **Step 5: Ejecutar el gate final**

Run:

```bash
.agents/skills/maccell/scripts/verify-production-safety.sh --with-build
```

Expected: TypeScript, lint, `git diff --check`, 179 tests y build pasan.

- [ ] **Step 6: Commit final**

```bash
git add src/__tests__/repair-create-ui.test.ts src/components/repairs/repair-create-confirm-dialog.tsx
git commit -m "style(vendor): completar ingreso uniforme de reparaciones"
```
