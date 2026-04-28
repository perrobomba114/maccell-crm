import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

let migrated = false;

function splitTuples(valuesSql: string): string[] {
  const tuples: string[] = [];
  let current = "";
  let inString = false;
  let depth = 0;

  for (let i = 0; i < valuesSql.length; i += 1) {
    const char = valuesSql[i];
    const prev = valuesSql[i - 1];

    if (char === "'" && prev !== "\\") {
      inString = !inString;
    }

    if (!inString && char === "(") {
      depth += 1;
    }

    if (depth > 0) {
      current += char;
    }

    if (!inString && char === ")") {
      depth -= 1;
      if (depth === 0 && current.trim()) {
        tuples.push(current.trim());
        current = "";
      }
    }
  }

  return tuples;
}

function splitFields(tupleSql: string): string[] {
  const inner = tupleSql.replace(/^\(/, "").replace(/\)$/, "");
  const fields: string[] = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    const prev = inner[i - 1];

    if (char === "'" && prev !== "\\") {
      inString = !inString;
      current += char;
      continue;
    }

    if (!inString && char === ",") {
      fields.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    fields.push(current.trim());
  }

  return fields;
}

function unquote(value: string): string {
  if (/^NULL$/i.test(value)) return "";
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/\\'/g, "'");
  }
  return value;
}

function parseIntLike(value: string, fallback = 0): number {
  const parsed = Number.parseInt(unquote(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBooleanLike(value: string): boolean {
  return parseIntLike(value, 0) === 1;
}

function parseLegacyTimestamp(value: string): Date {
  const raw = unquote(value);
  if (!raw || raw === "NODATA" || raw === "N/D") {
    return new Date();
  }

  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return new Date();

  const [, y, mo, d, h, mi, s] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

function extractInsertBlock(sql: string, table: "pantallas" | "contenidos"): string | null {
  const regex = new RegExp("INSERT INTO `" + table + "`[\\s\\S]*?VALUES\\s*([\\s\\S]*?);", "i");
  const match = sql.match(regex);
  return match ? match[1] : null;
}

async function migratePantallasFromSql(sql: string) {
  const block = extractInsertBlock(sql, "pantallas");
  if (!block) return;

  const tuples = splitTuples(block);

  for (const tuple of tuples) {
    const fields = splitFields(tuple);
    if (fields.length < 7) continue;

    const id = unquote(fields[0]);
    const nombre = unquote(fields[1]);
    const duracion = parseIntLike(fields[2], 30);
    const activo = parseBooleanLike(fields[3]);
    const lastseen = parseLegacyTimestamp(fields[4]);
    const clave = unquote(fields[5]);
    const stamp = parseLegacyTimestamp(fields[6]);

    await db.$executeRawUnsafe(
      `
        INSERT INTO digital_screens (id, nombre, duracion, activo, lastseen, clave, stamp)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO NOTHING
      `,
      id,
      nombre,
      duracion,
      activo,
      lastseen,
      clave || null,
      stamp
    );
  }
}

async function migrateContenidosFromSql(sql: string) {
  const block = extractInsertBlock(sql, "contenidos");
  if (!block) return;

  const tuples = splitTuples(block);

  for (const tuple of tuples) {
    const fields = splitFields(tuple);
    if (fields.length < 15) continue;

    const id = unquote(fields[0]);
    const titulo = unquote(fields[1]);
    const archivo = unquote(fields[2]);
    const orden = parseIntLike(fields[3], 1);
    const peso = parseIntLike(fields[4], 0);
    const screenId = unquote(fields[5]);
    const lunes = parseBooleanLike(fields[6]);
    const martes = parseBooleanLike(fields[7]);
    const miercoles = parseBooleanLike(fields[8]);
    const jueves = parseBooleanLike(fields[9]);
    const viernes = parseBooleanLike(fields[10]);
    const sabado = parseBooleanLike(fields[11]);
    const domingo = parseBooleanLike(fields[12]);
    const activo = parseBooleanLike(fields[13]);
    const stamp = parseLegacyTimestamp(fields[14]);

    await db.$executeRawUnsafe(
      `
        INSERT INTO digital_screen_contents (
          id, screen_id, titulo, archivo, orden, peso, activo,
          lunes, martes, miercoles, jueves, viernes, sabado, domingo, stamp
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (id) DO NOTHING
      `,
      id,
      screenId,
      titulo,
      archivo,
      orden,
      peso,
      activo,
      lunes,
      martes,
      miercoles,
      jueves,
      viernes,
      sabado,
      domingo,
      stamp
    );
  }
}

export async function migrateLegacyPantallasIfNeeded() {
  if (migrated) return;

  const countRows = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM digital_screens`
  );
  const count = Number(countRows[0]?.count ?? 0);
  if (count > 0) {
    migrated = true;
    return;
  }

  const legacySqlPath = path.join(process.cwd(), "PANTALLAS", "c1951460_publi.sql");
  const legacyUploadsDir = path.join(process.cwd(), "PANTALLAS", "publicidad", "uploads", "pantallas");
  const targetUploadsDir = path.join(process.cwd(), "upload", "pantallas");
  try {
    const sql = await fs.readFile(legacySqlPath, "utf8");
    await migratePantallasFromSql(sql);
    await migrateContenidosFromSql(sql);

    await fs.mkdir(targetUploadsDir, { recursive: true });
    await fs.cp(legacyUploadsDir, targetUploadsDir, { recursive: true, force: true });

    migrated = true;
  } catch {
    // Legacy SQL file may not exist in some environments; migration is best-effort.
  }
}
