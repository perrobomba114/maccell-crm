import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import { ensurePantallasSchema } from "@/lib/pantallas/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensurePantallasSchema();

    const uploadDir = path.join(process.cwd(), "upload", "pantallas");
    await fs.mkdir(uploadDir, { recursive: true });

    let uploadWritable = true;
    try {
      await fs.access(uploadDir, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      uploadWritable = false;
    }

    const [screensCountRows, activeScreensRows, contentsCountRows, latestHeartbeatRows] = await Promise.all([
      db.$queryRawUnsafe<{ count: number }[]>(
        "SELECT COUNT(*)::int AS count FROM digital_screens"
      ),
      db.$queryRawUnsafe<{ count: number }[]>(
        "SELECT COUNT(*)::int AS count FROM digital_screens WHERE activo = TRUE"
      ),
      db.$queryRawUnsafe<{ count: number }[]>(
        "SELECT COUNT(*)::int AS count FROM digital_screen_contents WHERE activo = TRUE"
      ),
      db.$queryRawUnsafe<{ id: string; nombre: string; lastseen: Date | null }[]>(
        `SELECT id, nombre, lastseen
         FROM digital_screens
         ORDER BY lastseen DESC NULLS LAST, nombre ASC
         LIMIT 10`
      ),
    ]);

    const screensTotal = Number(screensCountRows[0]?.count ?? 0);
    const screensActive = Number(activeScreensRows[0]?.count ?? 0);
    const contentsActive = Number(contentsCountRows[0]?.count ?? 0);

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      checks: {
        database: true,
        uploadPath: {
          path: uploadDir,
          writable: uploadWritable,
        },
      },
      metrics: {
        screensTotal,
        screensActive,
        contentsActive,
      },
      latestHeartbeat: latestHeartbeatRows.map((row) => ({
        id: row.id,
        nombre: row.nombre,
        lastseen: row.lastseen ? new Date(row.lastseen).toISOString() : null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
