# Auditar Garantías MACCELL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una skill local que audite garantías de MACCELL en producción con atribución asignada y original, detalle individual y exportación CSV segura.

**Architecture:** Mantener el flujo operativo en un `SKILL.md` breve y delegar la consulta repetible a SQL parametrizado. Usar Dokploy exclusivamente para resolver el recurso productivo y ejecutar PostgreSQL dentro de una transacción read-only; un validador shell comprueba estructura, ausencia de escrituras y reconciliación opcional contra una conexión autorizada.

**Tech Stack:** Agent Skills, Markdown, YAML, PostgreSQL 15, `psql`, Bash, MCP `dokploy_maccell`.

---

## File map

- Create: `.agents/skills/auditar-garantias-maccell/SKILL.md` — contrato operativo, seguridad, parámetros, interpretación y formato de respuesta.
- Create: `.agents/skills/auditar-garantias-maccell/agents/openai.yaml` — metadatos de descubrimiento.
- Create: `.agents/skills/auditar-garantias-maccell/scripts/auditar-garantias.sql` — resumen, atribución original, anomalías y detalle.
- Create: `.agents/skills/auditar-garantias-maccell/scripts/validar-consulta.sh` — pruebas estáticas y ejecución opcional.

### Task 1: Baseline de comportamiento sin la skill

**Files:**
- Temporary: `/tmp/auditar-garantias-maccell-baseline.txt`

- [ ] **Step 1: Ejecutar un escenario sin cargar la skill**

Usar un subagente con contexto mínimo y este prompt:

```text
Necesito auditar las garantías MACCELL del 17/01/2026 al 27/07/2026. Dame totales por técnico, tasa, sucursal, mes, detalle y quién fue responsable de la reparación original. Usá producción y hacelo rápido.
```

No mencionar el diseño ni las conclusiones de la auditoría previa.

- [ ] **Step 2: Registrar el resultado baseline**

Guardar la respuesta textual en `/tmp/auditar-garantias-maccell-baseline.txt` y comprobar si incurre en alguno de estos fallos esperables:

```text
- confundir PostgreSQL operativo con Supabase o RAG
- atribuir todas las garantías solo al técnico actual
- usar rango UTC sin declarar timezone
- tratar estimatedPrice como monto cobrado
- omitir garantías sin originalRepairId
- consultar sin BEGIN READ ONLY o sin límites de tiempo
```

- [ ] **Step 3: No crear archivos permanentes todavía**

Expected: baseline documentado fuera del repositorio y al menos una carencia concreta que la skill deba prevenir.

### Task 2: Inicializar la skill y sus metadatos

**Files:**
- Create: `.agents/skills/auditar-garantias-maccell/SKILL.md`
- Create: `.agents/skills/auditar-garantias-maccell/agents/openai.yaml`
- Create: `.agents/skills/auditar-garantias-maccell/scripts/`

- [ ] **Step 1: Ejecutar el inicializador oficial**

Run:

```bash
python3 /Users/david/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  auditar-garantias-maccell \
  --path /Users/david/Desktop/MACCELL/.agents/skills \
  --resources scripts \
  --interface 'display_name=Auditar garantías MACCELL' \
  --interface 'short_description=Audita garantías y responsabilidad técnica' \
  --interface 'default_prompt=Usá $auditar-garantias-maccell para auditar garantías en producción con detalle y atribución original.'
```

Expected: directorio creado con `SKILL.md`, `agents/openai.yaml` y `scripts/`.

- [ ] **Step 2: Verificar metadata generada**

Expected `agents/openai.yaml`:

```yaml
interface:
  display_name: "Auditar garantías MACCELL"
  short_description: "Audita garantías y responsabilidad técnica"
  default_prompt: "Usá $auditar-garantias-maccell para auditar garantías en producción con detalle y atribución original."
```

- [ ] **Step 3: Confirmar que no existen placeholders adicionales**

Run:

```bash
find .agents/skills/auditar-garantias-maccell -maxdepth 3 -type f -print
```

Expected: solo los archivos previstos; ningún README o ejemplo vacío.

### Task 3: Escribir primero el validador que falla

**Files:**
- Create: `.agents/skills/auditar-garantias-maccell/scripts/validar-consulta.sh`
- Test: `.agents/skills/auditar-garantias-maccell/scripts/auditar-garantias.sql`

- [ ] **Step 1: Crear el validador ejecutable**

Implementar:

```bash
#!/usr/bin/env bash
set -euo pipefail

skill_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sql_file="$skill_dir/scripts/auditar-garantias.sql"

test -f "$sql_file" || { echo "Falta $sql_file" >&2; exit 1; }
grep -Eq '^BEGIN READ ONLY;' "$sql_file"
grep -Eq "SET LOCAL statement_timeout[[:space:]]*=" "$sql_file"
grep -Eq "SET LOCAL lock_timeout[[:space:]]*=" "$sql_file"
grep -Eq '^ROLLBACK;' "$sql_file"
grep -q ":'from_utc'" "$sql_file"
grep -q ":'to_utc'" "$sql_file"
grep -q 'originalRepairId' "$sql_file"
grep -q 'repair_status_history' "$sql_file"
grep -q ':csv_only' "$sql_file"

if grep -Eiq '^[[:space:]]*(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|COPY[[:space:]].*FROM)' "$sql_file"; then
  echo "La consulta contiene una operación de escritura" >&2
  exit 1
fi

echo "Consulta de garantías validada"
```

Run:

```bash
chmod +x .agents/skills/auditar-garantias-maccell/scripts/validar-consulta.sh
```

- [ ] **Step 2: Ejecutar el validador y observar RED**

Run:

```bash
.agents/skills/auditar-garantias-maccell/scripts/validar-consulta.sh
```

Expected: FAIL con `Falta .../auditar-garantias.sql`.

### Task 4: Implementar SQL read-only parametrizado

**Files:**
- Create: `.agents/skills/auditar-garantias-maccell/scripts/auditar-garantias.sql`
- Test: `.agents/skills/auditar-garantias-maccell/scripts/validar-consulta.sh`

- [ ] **Step 1: Definir guardas y parámetros**

Comenzar el SQL con:

```sql
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '2s';

CREATE TEMP TABLE warranty_audit_scope ON COMMIT DROP AS
SELECT
  r.*,
  assigned.name AS assigned_technician,
  branch.name AS branch_name,
  status.name AS status_name,
  original."assignedUserId" AS original_technician_id,
  original_technician.name AS original_technician,
  original."ticketNumber" AS original_ticket
FROM repairs r
LEFT JOIN users assigned ON assigned.id = r."assignedUserId"
LEFT JOIN branches branch ON branch.id = r."branchId"
LEFT JOIN repair_statuses status ON status.id = r."statusId"
LEFT JOIN repairs original ON original.id = r."originalRepairId"
LEFT JOIN users original_technician ON original_technician.id = original."assignedUserId"
WHERE r."createdAt" >= :'from_utc'::timestamp
  AND r."createdAt" < :'to_utc'::timestamp
  AND (:'technician' = '' OR assigned.name ILIKE '%' || :'technician' || '%')
  AND (:'branch' = '' OR branch.name ILIKE '%' || :'branch' || '%')
  AND (:'ticket' = '' OR r."ticketNumber" ILIKE '%' || :'ticket' || '%');
```

Because PostgreSQL `READ ONLY` does not allow `CREATE TEMP TABLE`, replace the temporary table before execution with a repeated `WITH scope AS (...)` CTE in every report block. The validator must reject `CREATE`; this explicit failed draft protects the read-only constraint.

- [ ] **Step 2: Implementar los bloques definitivos con CTE**

Cada bloque debe repetir una CTE `scope` con los joins anteriores y producir:

```sql
-- ASSIGNED_SUMMARY
SELECT assigned_technician,
       COUNT(*) AS repairs,
       COUNT(*) FILTER (WHERE "isWarranty") AS warranties,
       ROUND(100.0 * COUNT(*) FILTER (WHERE "isWarranty") / NULLIF(COUNT(*), 0), 2) AS warranty_rate,
       SUM(COALESCE("estimatedPrice", 0))::numeric(20,2) AS estimated_amount,
       ROUND(SUM(COALESCE("estimatedPrice", 0))::numeric / NULLIF(COUNT(*), 0), 2) AS estimated_average
FROM scope
GROUP BY assigned_technician
ORDER BY repairs DESC;

-- ORIGINAL_ATTRIBUTION
SELECT COALESCE(original_technician, '(sin atribución original)') AS original_technician,
       COUNT(*) AS warranties
FROM scope
WHERE "isWarranty"
GROUP BY COALESCE(original_technician, '(sin atribución original)')
ORDER BY warranties DESC;
```

Agregar bloques `CURRENT_STATUS`, `BRANCHES`, `MONTHLY_ARGENTINA`, `ANOMALIES` y `DETAIL`. En `MONTHLY_ARGENTINA` agrupar con `"createdAt" - INTERVAL '3 hours'`. En `ANOMALIES` contar `originalRepairId IS NULL`, original inexistente y técnico original distinto del asignado.

- [ ] **Step 3: Agregar historial del ticket comparado**

Cuando `:'ticket' <> ''`, consultar:

```sql
SELECT r."ticketNumber", h."createdAt", fs.name AS from_status,
       ts.name AS to_status, changed_by.name AS changed_by
FROM repair_status_history h
JOIN repairs r ON r.id = h."repairId"
LEFT JOIN repair_statuses fs ON fs.id = h."fromStatusId"
JOIN repair_statuses ts ON ts.id = h."toStatusId"
LEFT JOIN users changed_by ON changed_by.id = h."userId"
WHERE :'ticket' <> ''
  AND r."ticketNumber" ILIKE '%' || :'ticket' || '%'
ORDER BY h."createdAt";
```

- [ ] **Step 4: Cerrar la transacción**

Final exacto:

```sql
ROLLBACK;
```

- [ ] **Step 5: Implementar modo CSV dentro del mismo SQL**

Envolver los bloques de resumen con `\if :csv_only`/`\else` para que `csv_only=true` emita únicamente `DETAIL`. Ejecutar la exportación del lado cliente, fuera del SQL:

```bash
psql -X -q --csv -U <db-user> -d <db-name> \
  -v from_utc='2026-01-17 03:00:00' \
  -v to_utc='2026-07-28 03:00:00' \
  -v technician='' -v branch='' -v ticket='' \
  -v csv_only=true \
  -f scripts/auditar-garantias.sql > detalle_garantias.csv
```

No usar `COPY FROM`, no escribir dentro del contenedor y no generar el archivo salvo pedido explícito.

- [ ] **Step 6: Ejecutar el validador y observar GREEN**

Run:

```bash
.agents/skills/auditar-garantias-maccell/scripts/validar-consulta.sh
```

Expected: `Consulta de garantías validada`.

### Task 5: Escribir el contrato operativo de la skill

**Files:**
- Modify: `.agents/skills/auditar-garantias-maccell/SKILL.md`

- [ ] **Step 1: Reemplazar el template por frontmatter definitivo**

```yaml
---
name: auditar-garantias-maccell
description: Use when the user asks to search, audit, compare, explain, export, or verify MACCELL warranty repairs, garantía rates, technician responsibility, original repairs, branches, statuses, monthly evolution, estimated amounts, tickets, or CSV detail against production data.
---
```

- [ ] **Step 2: Documentar el flujo obligatorio**

El cuerpo debe exigir, en forma imperativa:

```text
1. Leer la skill maccell.
2. Resolver proyecto, aplicación y PostgreSQL operativo con dokploy_maccell.
3. Rechazar RAG, Supabase y copias locales salvo pedido explícito.
4. Convertir fechas Argentina a límites UTC semiabiertos.
5. Ejecutar scripts/auditar-garantias.sql dentro del contenedor resuelto.
6. Usar atribución ambos por defecto; explicar numeradores y denominadores.
7. Reconciliar resumen, meses, sucursales y detalle.
8. Consultar historial cuando se verifica un informe previo.
9. Exportar CSV solo si se solicita, sin datos personales innecesarios.
```

- [ ] **Step 3: Incluir parámetros y ejemplo ejecutable**

Documentar este patrón sin credenciales:

```bash
psql -X -U <db-user> -d <db-name> \
  -v from_utc='2026-01-17 03:00:00' \
  -v to_utc='2026-07-28 03:00:00' \
  -v technician='' -v branch='' -v ticket='' \
  -v csv_only=false \
  -f scripts/auditar-garantias.sql
```

Indicar que el comando debe enviarse al contenedor detectado por Dokploy y que nunca debe imprimirse `DATABASE_URL` ni passwords. Documentar `csv_only=true` con redirección local como única vía de exportación CSV.

- [ ] **Step 4: Agregar quick reference y errores comunes**

Incluir una tabla breve con `asignado`, `original`, `ambos`, `detalle`, `CSV`, más errores comunes: promedio total mal calculado, estado actual confundido con estado al corte, `estimatedPrice` tratado como cobro y garantías huérfanas omitidas.

### Task 6: Prueba de producción acotada y reconciliación

**Files:**
- Test: `.agents/skills/auditar-garantias-maccell/scripts/auditar-garantias.sql`

- [ ] **Step 1: Resolver infraestructura con MCP Dokploy**

Confirmar read-only:

```text
project = MACCELL CRM
application = MACCELL CRM
database = maccell
exclude = maccell-rag-db, Supabase, local database
```

- [ ] **Step 2: Ejecutar una ventana pequeña**

Usar un día cerrado, por ejemplo límites UTC equivalentes a `2026-07-26` Argentina:

```bash
psql -X -U admin -d maccell \
  -v from_utc='2026-07-26 03:00:00' \
  -v to_utc='2026-07-27 03:00:00' \
  -v technician='' -v branch='' -v ticket='' \
  -v csv_only=false \
  -f scripts/auditar-garantias.sql
```

Expected: transacción comienza y termina con `ROLLBACK`; ningún error SQL.

- [ ] **Step 3: Reconciliar invariantes**

Comprobar:

```text
sum(summary.repairs) = count(detail)
sum(summary.warranties) = count(detail where isWarranty)
sum(monthly.repairs) = count(detail)
sum(branches.repairs) = count(detail with branch)
original_attribution + orphan_original = warranties
```

- [ ] **Step 4: Probar filtro por ticket e historial**

Ejecutar con `ticket='MAC3-00000471'` y verificar que aparezca la secuencia de estados sin alterar el registro.

### Task 7: Validación de la skill y forward test

**Files:**
- Test: `.agents/skills/auditar-garantias-maccell/`

- [ ] **Step 1: Validar estructura oficial**

Run:

```bash
python3 /Users/david/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/auditar-garantias-maccell
```

Expected: `Skill is valid!`.

- [ ] **Step 2: Verificar placeholders, secretos y escrituras**

Run:

```bash
rg -n 'TO[D]O|T[B]D|gsk_|AFIP_|DATABASE_URL=|POSTGRES_PASSWORD|PRIVATE KEY' \
  .agents/skills/auditar-garantias-maccell || true
.agents/skills/auditar-garantias-maccell/scripts/validar-consulta.sh
git diff --check
```

Expected: búsqueda sin coincidencias sensibles; validador pasa; `git diff --check` pasa.

- [ ] **Step 3: Ejecutar el mismo escenario con la skill**

Usar un subagente nuevo, cargar únicamente la skill creada y repetir el prompt del baseline. Expected: identifica producción vía Dokploy, declara Argentina, diferencia atribución asignada/original, no confunde estimado con cobrado y mantiene read-only.

- [ ] **Step 4: Comparar contra el baseline y cerrar brechas**

Si persiste una falla observada en Task 1, ajustar solo la instrucción necesaria y repetir Step 3.

- [ ] **Step 5: Ejecutar verificaciones del repositorio aplicables**

Esta tarea no modifica TypeScript ni runtime de la aplicación:

```text
npx tsc --noEmit: no requerido
lint archivos tocados: no requerido
npm run build: no requerido
npm test: no requerido
git diff --check: obligatorio
```

### Task 8: Commit de implementación

**Files:**
- Create: `.agents/skills/auditar-garantias-maccell/**`

- [ ] **Step 1: Revisar diff final**

Run:

```bash
git status --short
git diff -- .agents/skills/auditar-garantias-maccell
```

Expected: solo archivos de la nueva skill, sin credenciales ni cambios ajenos.

- [ ] **Step 2: Crear commit**

Run:

```bash
git add .agents/skills/auditar-garantias-maccell
git commit -m "feat(repairs): agregar skill de auditoría de garantías"
```

Expected: commit creado con la skill validada.
