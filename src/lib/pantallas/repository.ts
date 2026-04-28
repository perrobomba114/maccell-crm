import { db } from "@/lib/db";
import { randomBytes, randomUUID } from "crypto";
import { DEFAULT_DAY_CONFIG, type ContentDayConfig, type ContentRow, type ScreenRow } from "@/lib/pantallas/types";
import { migrateLegacyPantallasIfNeeded } from "@/lib/pantallas/bootstrap";

let initialized = false;

export function makeScreenKey(): string {
  return randomBytes(8).toString("hex").toUpperCase();
}

function parseBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function parseScreenRow(row: Record<string, unknown>): ScreenRow {
  return {
    id: String(row.id),
    nombre: String(row.nombre),
    duracion: Number(row.duracion),
    activo: parseBool(row.activo),
    lastseen: row.lastseen ? new Date(String(row.lastseen)) : null,
    clave: row.clave ? String(row.clave) : null,
    stamp: new Date(String(row.stamp)),
  };
}

function parseContentRow(row: Record<string, unknown>): ContentRow {
  return {
    id: String(row.id),
    screen_id: String(row.screen_id),
    titulo: String(row.titulo),
    archivo: String(row.archivo),
    orden: Number(row.orden),
    peso: Number(row.peso),
    activo: parseBool(row.activo),
    lunes: parseBool(row.lunes),
    martes: parseBool(row.martes),
    miercoles: parseBool(row.miercoles),
    jueves: parseBool(row.jueves),
    viernes: parseBool(row.viernes),
    sabado: parseBool(row.sabado),
    domingo: parseBool(row.domingo),
    stamp: new Date(String(row.stamp)),
  };
}

export async function ensurePantallasSchema() {
  if (initialized) return;

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS digital_screens (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE,
      duracion INTEGER NOT NULL DEFAULT 30,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      lastseen TIMESTAMPTZ,
      clave TEXT,
      stamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS digital_screen_contents (
      id TEXT PRIMARY KEY,
      screen_id TEXT NOT NULL REFERENCES digital_screens(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL,
      archivo TEXT NOT NULL,
      orden INTEGER NOT NULL DEFAULT 1,
      peso BIGINT NOT NULL DEFAULT 0,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      lunes BOOLEAN NOT NULL DEFAULT TRUE,
      martes BOOLEAN NOT NULL DEFAULT TRUE,
      miercoles BOOLEAN NOT NULL DEFAULT TRUE,
      jueves BOOLEAN NOT NULL DEFAULT TRUE,
      viernes BOOLEAN NOT NULL DEFAULT TRUE,
      sabado BOOLEAN NOT NULL DEFAULT TRUE,
      domingo BOOLEAN NOT NULL DEFAULT TRUE,
      stamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_digital_screen_contents_screen_id ON digital_screen_contents(screen_id);
    CREATE INDEX IF NOT EXISTS idx_digital_screen_contents_order ON digital_screen_contents(screen_id, orden);
  `);

  if (process.env.PANTALLAS_ENABLE_LEGACY_MIGRATION === "true") {
    await migrateLegacyPantallasIfNeeded();
  }
  initialized = true;
}

export async function listScreens(): Promise<(ScreenRow & { contenidos: number })[]> {
  await ensurePantallasSchema();
  const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT s.*, COUNT(c.id)::INT AS contenidos
    FROM digital_screens s
    LEFT JOIN digital_screen_contents c ON c.screen_id = s.id
    GROUP BY s.id
    ORDER BY s.nombre ASC
  `);

  return rows.map((row) => ({ ...parseScreenRow(row), contenidos: Number(row.contenidos ?? 0) }));
}

export async function createScreen(input: { nombre: string; duracion: number; activo: boolean }) {
  await ensurePantallasSchema();
  const id = randomUUID();
  const key = makeScreenKey();

  await db.$executeRawUnsafe(
    `INSERT INTO digital_screens (id, nombre, duracion, activo, clave, stamp) VALUES ($1, $2, $3, $4, $5, NOW())`,
    id,
    input.nombre.trim(),
    input.duracion,
    input.activo,
    key
  );

  return id;
}

export async function updateScreen(input: { id: string; nombre: string; duracion: number; activo: boolean }) {
  await ensurePantallasSchema();
  await db.$executeRawUnsafe(
    `UPDATE digital_screens SET nombre = $2, duracion = $3, activo = $4, stamp = NOW() WHERE id = $1`,
    input.id,
    input.nombre.trim(),
    input.duracion,
    input.activo
  );
}

export async function regenerateScreenKey(screenId: string): Promise<string> {
  await ensurePantallasSchema();
  const key = makeScreenKey();

  await db.$executeRawUnsafe(
    `UPDATE digital_screens SET clave = $2, lastseen = NOW(), stamp = NOW() WHERE id = $1`,
    screenId,
    key
  );

  return key;
}

export async function touchScreenHeartbeat(screenId: string) {
  await ensurePantallasSchema();
  await db.$executeRawUnsafe(`UPDATE digital_screens SET lastseen = NOW() WHERE id = $1`, screenId);
}

export async function deleteScreen(screenId: string) {
  await ensurePantallasSchema();
  await db.$executeRawUnsafe(`DELETE FROM digital_screens WHERE id = $1`, screenId);
}

export async function listContents(screenId: string): Promise<ContentRow[]> {
  await ensurePantallasSchema();
  const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM digital_screen_contents WHERE screen_id = $1 ORDER BY orden ASC`,
    screenId
  );
  return rows.map(parseContentRow);
}

export async function createContent(input: {
  screenId: string;
  titulo: string;
  archivo: string;
  peso: number;
  activo?: boolean;
  days?: Partial<ContentDayConfig>;
}) {
  await ensurePantallasSchema();
  const id = randomUUID();
  const days = { ...DEFAULT_DAY_CONFIG, ...(input.days ?? {}) };

  const nextOrderRows = await db.$queryRawUnsafe<{ max_orden: number | null }[]>(
    `SELECT MAX(orden) AS max_orden FROM digital_screen_contents WHERE screen_id = $1`,
    input.screenId
  );
  const nextOrder = Number(nextOrderRows[0]?.max_orden ?? 0) + 1;

  await db.$executeRawUnsafe(
    `
      INSERT INTO digital_screen_contents (
        id, screen_id, titulo, archivo, orden, peso, activo,
        lunes, martes, miercoles, jueves, viernes, sabado, domingo, stamp
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
    `,
    id,
    input.screenId,
    input.titulo.trim(),
    input.archivo,
    nextOrder,
    Math.max(0, Math.trunc(input.peso)),
    input.activo ?? true,
    days.lunes,
    days.martes,
    days.miercoles,
    days.jueves,
    days.viernes,
    days.sabado,
    days.domingo
  );
}

export async function updateContent(input: {
  id: string;
  titulo: string;
  activo: boolean;
  orden: number;
  days: ContentDayConfig;
}) {
  await ensurePantallasSchema();
  await db.$executeRawUnsafe(
    `
      UPDATE digital_screen_contents
      SET titulo = $2,
          activo = $3,
          orden = $4,
          lunes = $5,
          martes = $6,
          miercoles = $7,
          jueves = $8,
          viernes = $9,
          sabado = $10,
          domingo = $11,
          stamp = NOW()
      WHERE id = $1
    `,
    input.id,
    input.titulo.trim(),
    input.activo,
    input.orden,
    input.days.lunes,
    input.days.martes,
    input.days.miercoles,
    input.days.jueves,
    input.days.viernes,
    input.days.sabado,
    input.days.domingo
  );
}

export async function bulkUpdateContents(
  contents: Array<{
    id: string;
    titulo: string;
    activo: boolean;
    orden: number;
    days: ContentDayConfig;
  }>
) {
  await ensurePantallasSchema();

  await db.$transaction(
    contents.map((item) =>
      db.$executeRawUnsafe(
        `
          UPDATE digital_screen_contents
          SET titulo = $2,
              activo = $3,
              orden = $4,
              lunes = $5,
              martes = $6,
              miercoles = $7,
              jueves = $8,
              viernes = $9,
              sabado = $10,
              domingo = $11,
              stamp = NOW()
          WHERE id = $1
        `,
        item.id,
        item.titulo.trim(),
        item.activo,
        item.orden,
        item.days.lunes,
        item.days.martes,
        item.days.miercoles,
        item.days.jueves,
        item.days.viernes,
        item.days.sabado,
        item.days.domingo
      )
    )
  );
}

export async function deleteContent(contentId: string) {
  await ensurePantallasSchema();
  await db.$executeRawUnsafe(`DELETE FROM digital_screen_contents WHERE id = $1`, contentId);
}

export async function listActiveScreensForDevice() {
  await ensurePantallasSchema();
  const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, nombre FROM digital_screens WHERE activo = TRUE ORDER BY nombre ASC`
  );
  return rows.map((row) => ({ id: String(row.id), nombre: String(row.nombre) }));
}

export async function getScreenForDevice(screenId: string) {
  await ensurePantallasSchema();
  const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM digital_screens WHERE id = $1 AND activo = TRUE LIMIT 1`,
    screenId
  );

  if (!rows.length) return null;
  return parseScreenRow(rows[0]);
}

export async function getContentsForToday(screenId: string): Promise<string[]> {
  await ensurePantallasSchema();

  const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
    `
      SELECT archivo
      FROM digital_screen_contents
      WHERE screen_id = $1
        AND activo = TRUE
      ORDER BY orden ASC
    `,
    screenId
  );

  return rows.map((row) => `/api/uploads/pantallas/${String(row.archivo)}`);
}
