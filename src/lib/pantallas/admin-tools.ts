import { db } from "@/lib/db";
import { getPantallaConnectionStatus } from "@/lib/pantallas/status";
import { type ContentRow, type ScreenRow } from "@/lib/pantallas/types";
import fs from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "upload", "pantallas");
const ALLOWED_MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
let telemetryInitialized = false;

type ScreenWithCount = ScreenRow & { contenidos: number };

export type PantallasAdminSummary = {
  online: number;
  offline: number;
  unlinked: number;
  paused: number;
  withoutContents: number;
  totalContents: number;
  alerts: Array<{ screenId: string; screenName: string; minutesOffline: number }>;
};

export type PantallaMetricRow = {
  screenId: string;
  screenName: string;
  syncsToday: number;
  lastSeen: Date | null;
  minutesSinceLastSeen: number | null;
};

export type PantallaDiagnostics = {
  screenId: string;
  screenName: string;
  checks: Array<{ label: string; ok: boolean; detail: string }>;
};

export async function ensurePantallasTelemetrySchema() {
  if (telemetryInitialized) return;

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS digital_screen_syncs (
      id BIGSERIAL PRIMARY KEY,
      screen_id TEXT NOT NULL REFERENCES digital_screens(id) ON DELETE CASCADE,
      content_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_digital_screen_syncs_screen_created
      ON digital_screen_syncs(screen_id, created_at DESC);
  `);
  telemetryInitialized = true;
}

export async function recordPantallaSync(screenId: string, contentCount: number) {
  await ensurePantallasTelemetrySchema();
  await db.$executeRawUnsafe(
    `INSERT INTO digital_screen_syncs (screen_id, content_count, created_at) VALUES ($1, $2, NOW())`,
    screenId,
    Math.max(0, Math.trunc(contentCount))
  );
}

export function buildPantallasSummary(screens: ScreenWithCount[], now = Date.now()): PantallasAdminSummary {
  const summary: PantallasAdminSummary = {
    online: 0,
    offline: 0,
    unlinked: 0,
    paused: 0,
    withoutContents: 0,
    totalContents: 0,
    alerts: [],
  };

  for (const screen of screens) {
    const status = getPantallaConnectionStatus(screen, now);
    summary[status] += 1;
    summary.totalContents += screen.contenidos;
    if (screen.contenidos === 0) summary.withoutContents += 1;
    if (screen.lastseen && status === "offline") {
      const minutesOffline = Math.floor((now - new Date(screen.lastseen).getTime()) / 60000);
      if (minutesOffline >= 10) {
        summary.alerts.push({ screenId: screen.id, screenName: screen.nombre, minutesOffline });
      }
    }
  }

  return summary;
}

export async function getPantallaMetrics(): Promise<PantallaMetricRow[]> {
  await ensurePantallasTelemetrySchema();
  const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT
      s.id,
      s.nombre,
      s.lastseen,
      COUNT(ss.id)::INT AS syncs_today
    FROM digital_screens s
    LEFT JOIN digital_screen_syncs ss
      ON ss.screen_id = s.id
      AND ss.created_at >= date_trunc('day', NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires') AT TIME ZONE 'America/Argentina/Buenos_Aires'
    GROUP BY s.id
    ORDER BY s.nombre ASC
  `);

  return rows.map((row) => {
    const lastSeen = row.lastseen ? new Date(String(row.lastseen)) : null;
    return {
      screenId: String(row.id),
      screenName: String(row.nombre),
      syncsToday: Number(row.syncs_today ?? 0),
      lastSeen,
      minutesSinceLastSeen: lastSeen ? Math.floor((Date.now() - lastSeen.getTime()) / 60000) : null,
    };
  });
}

export async function diagnosePantalla(screen: ScreenRow, contents: ContentRow[]): Promise<PantallaDiagnostics> {
  const checks: PantallaDiagnostics["checks"] = [];
  const activeContents = contents.filter((content) => content.activo);
  let totalSize = 0;
  let existingFiles = 0;
  let mimeMatches = 0;

  for (const content of contents) {
    const filePath = path.resolve(UPLOAD_ROOT, content.archivo);
    const isInsideUploadRoot = filePath.startsWith(path.resolve(UPLOAD_ROOT) + path.sep);
    if (!isInsideUploadRoot) continue;
    const stat = await fs.stat(filePath).catch(() => null);
    if (stat?.isFile()) {
      existingFiles += 1;
      totalSize += stat.size;
      if (ALLOWED_MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()]) mimeMatches += 1;
    }
  }

  checks.push({ label: "API", ok: true, detail: "El panel pudo consultar la base y los archivos." });
  checks.push({ label: "Contenidos activos", ok: activeContents.length > 0, detail: `${activeContents.length} activos de ${contents.length}.` });
  checks.push({ label: "Archivos existentes", ok: existingFiles === contents.length, detail: `${existingFiles}/${contents.length} encontrados en el volumen.` });
  checks.push({ label: "MIME/extensión", ok: mimeMatches === existingFiles, detail: `${mimeMatches}/${existingFiles} con extensión soportada.` });
  checks.push({ label: "Heartbeat", ok: getPantallaConnectionStatus(screen) === "online", detail: screen.lastseen ? `Último contacto: ${screen.lastseen.toLocaleString("es-AR")}` : "Nunca conectó." });
  checks.push({ label: "Peso playlist", ok: totalSize < 800 * 1024 * 1024, detail: `${(totalSize / 1024 / 1024).toFixed(1)} MB.` });

  return { screenId: screen.id, screenName: screen.nombre, checks };
}

export async function findOrphanPantallaFiles() {
  const dbRows = await db.$queryRawUnsafe<Array<{ archivo: string }>>(`SELECT archivo FROM digital_screen_contents`);
  const referenced = new Set(dbRows.map((row) => row.archivo));
  const files: Array<{ path: string; size: number }> = [];

  async function walk(dir: string, prefix = "") {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const relative = path.posix.join(prefix, entry.name);
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute, relative);
      } else if (!referenced.has(relative)) {
        const stat = await fs.stat(absolute).catch(() => null);
        if (stat?.isFile()) files.push({ path: relative, size: stat.size });
      }
    }
  }

  await walk(UPLOAD_ROOT);
  return files;
}

export async function deleteOrphanPantallaFiles() {
  const files = await findOrphanPantallaFiles();
  for (const file of files) {
    const fullPath = path.resolve(UPLOAD_ROOT, file.path);
    if (fullPath.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) {
      await fs.unlink(fullPath).catch(() => undefined);
    }
  }
  return files;
}
