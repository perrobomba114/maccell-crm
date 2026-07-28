# Patrón direccional para reparaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar puntos de patrón visibles y conexiones con flechas que indiquen el orden del desbloqueo.

**Architecture:** Extraer el tablero a un componente visual enfocado y mantener `RepairIntakeFields` como coordinador del estado. Un SVG decorativo superpuesto dibujará segmentos recortados entre los centros de los puntos seleccionados.

**Tech Stack:** React 19, TypeScript, SVG y Tailwind CSS.

---

### Task 1: Crear el tablero direccional

**Files:**
- Create: `src/components/repairs/repair-pattern-board.tsx`

- [ ] **Step 1: Definir la geometría del tablero**

Crear constantes tipadas para las nueve coordenadas y una función pura que recorte cada segmento antes de los círculos:

```tsx
const PATTERN_COORDINATES = [
    { x: 22, y: 22 }, { x: 88, y: 22 }, { x: 154, y: 22 },
    { x: 22, y: 88 }, { x: 88, y: 88 }, { x: 154, y: 88 },
    { x: 22, y: 154 }, { x: 88, y: 154 }, { x: 154, y: 154 },
] as const;
```

- [ ] **Step 2: Renderizar conexiones SVG**

Por cada par consecutivo, dibujar un segmento oscuro de contraste y otro ámbar con `markerEnd="url(#repair-pattern-arrow)"`. El SVG debe usar `aria-hidden="true"` y `pointer-events-none`.

- [ ] **Step 3: Renderizar puntos visibles e interactivos**

Los puntos vacíos tendrán aro ámbar e indicador central. Los seleccionados mostrarán fondo sólido y posición. Mantener los eventos `onPointerDown` y `onPointerEnter` recibidos por props.

### Task 2: Integrar el tablero

**Files:**
- Modify: `src/components/repairs/repair-intake-fields.tsx`

- [ ] **Step 1: Reemplazar la cuadrícula inline**

Importar `RepairPatternBoard` y pasar:

```tsx
<RepairPatternBoard
    selectedPoints={patternPoints}
    isDrawing={isDrawing}
    onDrawingChange={setIsDrawing}
    onPointSelect={addPatternPoint}
/>
```

- [ ] **Step 2: Mantener persistencia y limpieza existentes**

No cambiar `serializePattern`, el campo oculto `accessCredential` ni el botón `Limpiar`.

### Task 3: Verificar y publicar localmente

**Files:**
- Verify: `src/components/repairs/repair-pattern-board.tsx`
- Verify: `src/components/repairs/repair-intake-fields.tsx`

- [ ] **Step 1: Revisar en navegador**

Comprobar patrón vacío y un recorrido con movimientos horizontales, verticales y diagonales. Confirmar que los puntos vacíos sean visibles y que cada conexión termine en una flecha.

- [ ] **Step 2: Ejecutar controles técnicos**

```bash
git diff --check
npx tsc --noEmit
npx eslint --quiet src/components/repairs/repair-pattern-board.tsx src/components/repairs/repair-intake-fields.tsx
npm run build
```

Resultado esperado: todos los comandos finalizan con código 0. No ejecutar tests automatizados por indicación del usuario.

- [ ] **Step 3: Guardar en main**

```bash
git add src/components/repairs/repair-pattern-board.tsx src/components/repairs/repair-intake-fields.tsx
git commit -m "feat(vendor): mostrar dirección del patrón"
```

