import { getCurrentUser } from "@/actions/auth-actions";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const ALLOWED_EXTENSIONS = new Set([".png", ".mp4", ".jpg", ".jpeg", ".webp"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function sanitizeScreenId(input: string): string {
  return input.trim().replace(/[^a-zA-Z0-9_-]/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const screenId = sanitizeScreenId(String(formData.get("screenId") ?? ""));

    if (!(file instanceof File) || !screenId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: "Extensión no permitida" }, { status: 400 });
    }

    const safeBaseName = sanitizeFileName(path.basename(file.name, extension)) || "archivo";
    const fileName = `${safeBaseName}_${Date.now()}${extension}`;
    const relativePath = path.posix.join(screenId, fileName);
    const uploadRoot = path.join(process.cwd(), "upload", "pantallas");
    const fullDir = path.join(uploadRoot, screenId);
    const fullPath = path.join(uploadRoot, relativePath);
    const resolvedRoot = path.resolve(uploadRoot);
    const resolvedFile = path.resolve(fullPath);

    if (!resolvedFile.startsWith(resolvedRoot + path.sep)) {
      return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
    }

    await fs.mkdir(fullDir, { recursive: true });

    const originalBytes = Buffer.from(await file.arrayBuffer());
    let bytes: Uint8Array = originalBytes;
    if (IMAGE_EXTENSIONS.has(extension)) {
      const sharp = (await import("sharp")).default;
      const pipeline = sharp(originalBytes)
        .rotate()
        .resize({ width: 1920, height: 1080, fit: "inside", withoutEnlargement: true });

      if (extension === ".jpg" || extension === ".jpeg") {
        bytes = await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer();
      } else if (extension === ".png") {
        bytes = await pipeline.png({ compressionLevel: 9, effort: 7 }).toBuffer();
      } else {
        bytes = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
      }
    }

    await fs.writeFile(fullPath, bytes);

    return NextResponse.json({
      error: 0,
      path: relativePath.replaceAll("\\", "/"),
      size: bytes.length,
      name: file.name,
      originalSize: originalBytes.length,
      optimized: IMAGE_EXTENSIONS.has(extension),
    });
  } catch (error) {
    console.error("[PANTALLAS_UPLOAD] Error al subir archivo:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo guardar el archivo en el servidor: ${message}` },
      { status: 500 }
    );
  }
}
