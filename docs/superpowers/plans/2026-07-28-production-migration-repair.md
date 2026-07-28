# Production Migration Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalizar el historial de migraciones de PostgreSQL en producción, restaurar el trigger de tiempo real del chat y reemplazar el arranque destructivo con `prisma migrate deploy` sin perder datos.

**Architecture:** La reparación se divide en dos despliegues. El primero agrega scripts SQL auditables y conserva temporalmente el arranque actual; después se crea un respaldo completo, se verifica que los objetos de las tres migraciones pendientes ya existen, se instala el trigger faltante y se registran las migraciones mediante `prisma migrate resolve`. Solo cuando `prisma migrate status` queda limpio, el segundo despliegue cambia el contenedor a `prisma migrate deploy`.

**Tech Stack:** PostgreSQL 15, Prisma 6.1, Docker BuildKit, Next.js 15, Dokploy, Node.js test runner.

---

## File map

- Create: `scripts/db/verify-production-migration-baseline.sql` — preflight de solo lectura que falla si falta un objeto estructural que será marcado como aplicado.
- Create: `scripts/db/repair-repair-chat-trigger.sql` — transacción idempotente que crea la función y el trigger del chat.
- Create: `src/__tests__/deployment-migration-safety.test.ts` — regresión para los scripts y el comando de arranque.
- Modify: `Dockerfile` — sustituir `prisma db push --accept-data-loss` por `prisma migrate deploy` después del baseline.

## Estado confirmado antes de ejecutar

- Base: `maccell`, PostgreSQL `15.17`.
- Las tablas `repair_learning_records`, `repair_chats`, `repair_chat_messages` y `repair_chat_read_cursors` existen.
- El enum `RepairAccessType` contiene `CODE`, `PATTERN`, `NONE`.
- Las cuatro columnas de ingreso existen en `repairs`.
- Las tablas del chat tienen 18 columnas, 6 claves foráneas y 10 índices.
- Integridad del chat: 0 duplicados y 0 huérfanos.
- Datos del chat al auditar: 0 chats, 0 mensajes y 0 cursores.
- Faltan `notify_repair_chat_change()` y `repair_chat_change_notify`.
- Prisma informa como pendientes:
  - `20260714154000_add_repair_learning_records`
  - `20260727000000_add_repair_intake_details`
  - `20260728030000_add_repair_internal_chat`
- La migración fallida histórica de 2025 ya tiene `rolled_back_at`; no bloquea `migrate status`.

### Task 1: Versionar preflight y reparación idempotente

**Files:**
- Create: `scripts/db/verify-production-migration-baseline.sql`
- Create: `scripts/db/repair-repair-chat-trigger.sql`
- Create: `src/__tests__/deployment-migration-safety.test.ts`

- [ ] **Step 1: Escribir el test inicialmente fallido**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const verifySql = readFileSync(
    new URL("../../scripts/db/verify-production-migration-baseline.sql", import.meta.url),
    "utf8",
);
const triggerSql = readFileSync(
    new URL("../../scripts/db/repair-repair-chat-trigger.sql", import.meta.url),
    "utf8",
);

test("production baseline verifies every pre-existing migration object", () => {
    assert.match(verifySql, /repair_learning_records/);
    assert.match(verifySql, /RepairAccessType/);
    assert.match(verifySql, /repair_chat_read_cursors/);
    assert.match(verifySql, /RAISE EXCEPTION/);
    assert.doesNotMatch(verifySql, /DROP\s+(?:TABLE|TYPE)/i);
});

test("chat trigger repair is transactional and idempotent", () => {
    assert.match(triggerSql, /^BEGIN;/m);
    assert.match(triggerSql, /CREATE OR REPLACE FUNCTION notify_repair_chat_change/);
    assert.match(triggerSql, /DROP TRIGGER IF EXISTS repair_chat_change_notify/);
    assert.match(triggerSql, /CREATE TRIGGER repair_chat_change_notify/);
    assert.match(triggerSql, /^COMMIT;/m);
});

```

- [ ] **Step 2: Ejecutar los dos tests de SQL y confirmar que fallan porque faltan los archivos**

Run:

```bash
npx tsx --test src/__tests__/deployment-migration-safety.test.ts
```

Expected: FAIL con `ENOENT` para `scripts/db/verify-production-migration-baseline.sql`.

- [ ] **Step 3: Crear el preflight de baseline**

```sql
\set ON_ERROR_STOP on

DO $$
DECLARE
    missing_objects TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF to_regclass('public.repair_learning_records') IS NULL THEN
        missing_objects := array_append(missing_objects, 'repair_learning_records');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'repair_learning_records_repairId_key'
    ) THEN
        missing_objects := array_append(missing_objects, 'repair_learning_records_repairId_key');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RepairAccessType') THEN
        missing_objects := array_append(missing_objects, 'RepairAccessType');
    END IF;

    IF (
        SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'repairs'
          AND column_name IN ('accessType', 'accessCredential', 'hasSimCard', 'hasMemoryCard')
    ) <> 4 THEN
        missing_objects := array_append(missing_objects, 'repair intake columns');
    END IF;

    IF to_regclass('public.repair_chats') IS NULL THEN
        missing_objects := array_append(missing_objects, 'repair_chats');
    END IF;
    IF to_regclass('public.repair_chat_messages') IS NULL THEN
        missing_objects := array_append(missing_objects, 'repair_chat_messages');
    END IF;
    IF to_regclass('public.repair_chat_read_cursors') IS NULL THEN
        missing_objects := array_append(missing_objects, 'repair_chat_read_cursors');
    END IF;

    IF cardinality(missing_objects) > 0 THEN
        RAISE EXCEPTION 'Baseline abortado; faltan objetos: %', array_to_string(missing_objects, ', ');
    END IF;
END;
$$;

SELECT 'baseline_preflight_ok' AS result;
```

- [ ] **Step 4: Crear la reparación transaccional del trigger**

```sql
\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION notify_repair_chat_change() RETURNS TRIGGER AS $$
DECLARE
    event_type TEXT;
BEGIN
    IF OLD."assignedUserId" IS DISTINCT FROM NEW."assignedUserId" THEN
        event_type := 'access.changed';
    ELSIF OLD."statusId" IS DISTINCT FROM NEW."statusId" THEN
        event_type := 'status.changed';
    ELSE
        RETURN NEW;
    END IF;

    PERFORM pg_notify('repair_chat_events', json_build_object(
        'eventId', md5(random()::TEXT || clock_timestamp()::TEXT),
        'type', event_type,
        'repairId', NEW."id",
        'branchId', NEW."branchId",
        'assignedUserId', NEW."assignedUserId",
        'previousAssignedUserId', OLD."assignedUserId",
        'occurredAt', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )::TEXT);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS repair_chat_change_notify ON repairs;
CREATE TRIGGER repair_chat_change_notify
AFTER UPDATE OF "assignedUserId", "statusId" ON repairs
FOR EACH ROW EXECUTE FUNCTION notify_repair_chat_change();

COMMIT;
```

- [ ] **Step 5: Ejecutar los tests y confirmar que ambos pasan**

Run:

```bash
npx tsx --test src/__tests__/deployment-migration-safety.test.ts
```

Expected: 2 PASS.

- [ ] **Step 6: Confirmar que los scripts no contienen operaciones destructivas**

Run:

```bash
rg -n 'DROP\s+(TABLE|TYPE|COLUMN)|TRUNCATE|DELETE\s+FROM|accept-data-loss' scripts/db
```

Expected: sin resultados. `DROP TRIGGER IF EXISTS` está permitido porque se recrea dentro de la misma transacción.

- [ ] **Step 7: Commit y push del primer despliegue**

```bash
git add scripts/db/verify-production-migration-baseline.sql scripts/db/repair-repair-chat-trigger.sql src/__tests__/deployment-migration-safety.test.ts
git commit -m "fix(deploy): preparar baseline seguro de migraciones"
git push origin main
```

Expected: Dokploy despliega automáticamente; el contenedor sigue usando temporalmente `db push`.

### Task 2: Respaldar y normalizar producción

**Files:**
- Execute: `scripts/db/verify-production-migration-baseline.sql`
- Execute: `scripts/db/repair-repair-chat-trigger.sql`

- [ ] **Step 1: Crear un respaldo completo en el volumen persistente**

Dentro del servidor, resolver el contenedor de aplicación actual y ejecutar:

```bash
app_container=$(docker ps --filter name=maccell-fhexow --format '{{.ID}}' | head -n 1)
backup_name="pre-prisma-baseline-$(date +%Y%m%d-%H%M%S).dump"
docker exec "$app_container" sh -lc "pg_dump --format=custom --file=/app/backups/$backup_name \"\$DATABASE_URL\""
docker exec "$app_container" sh -lc "pg_restore --list /app/backups/$backup_name >/dev/null"
docker exec "$app_container" sh -lc "test -s /app/backups/$backup_name"
```

Expected: los tres comandos terminan con código 0 y el archivo no está vacío.

- [ ] **Step 2: Ejecutar el preflight de solo lectura**

```bash
docker exec "$app_container" sh -lc \
  'psql "$DATABASE_URL" -f scripts/db/verify-production-migration-baseline.sql'
```

Expected: `baseline_preflight_ok`. Si falla, detener el procedimiento sin ejecutar `migrate resolve`.

- [ ] **Step 3: Instalar el trigger faltante**

```bash
docker exec "$app_container" sh -lc \
  'psql "$DATABASE_URL" -f scripts/db/repair-repair-chat-trigger.sql'
```

Expected: `BEGIN`, `CREATE FUNCTION`, `DROP TRIGGER`, `CREATE TRIGGER`, `COMMIT`.

- [ ] **Step 4: Verificar función y trigger habilitado**

```bash
docker exec "$app_container" sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "
SELECT count(*) FROM pg_proc WHERE proname = '\''notify_repair_chat_change'\'';
SELECT count(*) FROM pg_trigger WHERE tgname = '\''repair_chat_change_notify'\'' AND tgenabled = '\''O'\'' AND NOT tgisinternal;
"'
```

Expected: dos líneas con `1`.

- [ ] **Step 5: Marcar las tres migraciones como aplicadas, en orden**

```bash
docker exec "$app_container" node ./node_modules/prisma/build/index.js migrate resolve --applied 20260714154000_add_repair_learning_records --schema prisma/schema.prisma
docker exec "$app_container" node ./node_modules/prisma/build/index.js migrate resolve --applied 20260727000000_add_repair_intake_details --schema prisma/schema.prisma
docker exec "$app_container" node ./node_modules/prisma/build/index.js migrate resolve --applied 20260728030000_add_repair_internal_chat --schema prisma/schema.prisma
```

Expected: Prisma confirma cada migración como aplicada. Estos comandos no ejecutan `CREATE`; solo registran el baseline verificado.

- [ ] **Step 6: Confirmar historial limpio**

```bash
docker exec "$app_container" node ./node_modules/prisma/build/index.js migrate status --schema prisma/schema.prisma
```

Expected: `Database schema is up to date!` y ninguna migración pendiente.

- [ ] **Step 7: Repetir integridad del chat**

```sql
SELECT 'orphan_chat_repair', count(*)
FROM repair_chats c LEFT JOIN repairs r ON r.id = c."repairId" WHERE r.id IS NULL
UNION ALL
SELECT 'orphan_message_chat', count(*)
FROM repair_chat_messages m LEFT JOIN repair_chats c ON c.id = m."chatId" WHERE c.id IS NULL
UNION ALL
SELECT 'orphan_cursor_chat', count(*)
FROM repair_chat_read_cursors rc LEFT JOIN repair_chats c ON c.id = rc."chatId" WHERE c.id IS NULL;
```

Expected: todos los conteos en `0`.

### Task 3: Sustituir el arranque destructivo

**Files:**
- Modify: `Dockerfile:58`
- Test: `src/__tests__/deployment-migration-safety.test.ts`

- [ ] **Step 1: Agregar primero el test fallido del comando de producción**

Agregar al comienzo del archivo:

```ts
const dockerfile = readFileSync(new URL("../../Dockerfile", import.meta.url), "utf8");
```

Agregar el test:

```ts
test("production startup uses migrations without destructive db push", () => {
    assert.match(dockerfile, /prisma\/build\/index\.js migrate deploy/);
    assert.doesNotMatch(dockerfile, /db push/);
    assert.doesNotMatch(dockerfile, /accept-data-loss/);
});
```

Run:

```bash
npx tsx --test src/__tests__/deployment-migration-safety.test.ts
```

Expected: 2 PASS y 1 FAIL porque el Dockerfile todavía contiene `db push`.

- [ ] **Step 2: Cambiar el comando de producción**

```dockerfile
CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma && node server.js"]
```

Eliminar completamente `db push`, `--skip-generate` y `--accept-data-loss`.

- [ ] **Step 3: Ejecutar el test de despliegue**

Run:

```bash
npx tsx --test src/__tests__/deployment-migration-safety.test.ts
```

Expected: 3 PASS.

- [ ] **Step 4: Ejecutar gates completos**

```bash
npx tsc --noEmit
npx eslint --max-warnings=0 src/__tests__/deployment-migration-safety.test.ts
git diff --check
npm test
docker buildx build --check --secret id=NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,src=/dev/null .
```

Expected: TypeScript 0, lint 0, diff-check 0, 208 tests PASS y Docker `Check complete, no warnings found`.

- [ ] **Step 5: Commit y push del segundo despliegue**

```bash
git add Dockerfile src/__tests__/deployment-migration-safety.test.ts
git commit -m "fix(deploy): aplicar migraciones en producción"
git push origin main
```

- [ ] **Step 6: Vigilar Dokploy hasta `done`**

Expected: el webhook crea el deployment automáticamente, el build termina sin advertencias de secretos y el contenedor nuevo queda activo.

- [ ] **Step 7: Verificar logs y salud**

```bash
curl -fsS https://sistema.maccell.com.ar/login >/dev/null
curl -fsS https://sistema.maccell.com.ar/chat.mp3 >/dev/null
curl -sS -o /dev/null -w '%{http_code}\n' 'https://sistema.maccell.com.ar/api/repair-chats?scope=active'
```

Expected: login 200, audio 200 y API anónima 401. Los logs deben mostrar `migrate deploy`, luego Next.js `Ready`, sin `repair_chats does not exist`.

### Task 4: Cierre y recuperación

- [ ] **Step 1: Confirmar Git limpio y sincronizado**

```bash
git fetch origin
git status -sb
git rev-parse HEAD
git rev-parse origin/main
```

Expected: hashes iguales y sin archivos modificados.

- [ ] **Step 2: Documentar el respaldo creado**

Registrar únicamente el nombre y tamaño del `.dump`; nunca imprimir `DATABASE_URL`.

- [ ] **Step 3: Condiciones de rollback**

Si el preflight o la creación del trigger falla, la transacción se revierte y no se ejecuta `migrate resolve`. Si el deploy con `migrate deploy` falla, no borrar migraciones ni restaurar datos automáticamente: conservar el contenedor anterior y revisar el log. Restaurar el `.dump` solo ante corrupción confirmada y con autorización explícita.

## Self-review

- Spec coverage: respaldo, objetos pendientes, trigger, historial Prisma, arranque seguro, autodeploy y health-check están cubiertos.
- Placeholder scan: cada cambio incluye contenido y comandos concretos.
- Type/command consistency: usa los nombres reales de las tres migraciones, la aplicación `maccell-fhexow` y el esquema `prisma/schema.prisma`.
