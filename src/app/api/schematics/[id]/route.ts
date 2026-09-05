import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getCurrentUser } from "@/actions/auth-actions";
import { resolveAsset } from "@/lib/schematics/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
    if (!["ADMIN", "TECHNICIAN"].includes(user.role)) return Response.json({ error: "Acceso restringido al taller" }, { status: 403 });
    const result = await resolveAsset((await context.params).id);
    if (!result) return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
    const { asset, file } = result;
    const { size } = await stat(file);
    if (size !== asset.size) throw new Error("El tamaño del archivo no coincide con el catálogo");
    const headers = new Headers({
      "Content-Type": asset.kind === "pdf" ? "application/pdf" : "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
      "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Accept-Ranges": "bytes",
    });
    const range = request.headers.get("range");
    let start = 0; let end = size - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (!Number.isSafeInteger(start) || start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    }
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(createReadStream(file, { start, end }));
    return new Response(stream as ReadableStream, { status: range ? 206 : 200, headers });
  } catch (error) {
    console.error("[ESQUEMATICOS] No se pudo servir el archivo", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo abrir el archivo" }, { status: 500 });
  }
}
