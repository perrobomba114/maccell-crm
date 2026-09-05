import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/actions/auth-actions";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return new Response(null, { status: 401 });
    if (!["ADMIN", "TECHNICIAN"].includes(user.role)) return new Response(null, { status: 403 });
    const parts = (await context.params).path;
    const file = parts.join("/");
    if (!/^(build\/pdf\.worker\.min\.mjs|(?:cmaps|standard_fonts|wasm)\/[a-zA-Z0-9_.-]+\.(?:bcmap|ttf|pfb|wasm|js))$/.test(file)) return new Response(null, { status: 404 });
    const bytes = await readFile(path.join(process.cwd(), "node_modules/pdfjs-dist", file));
    return new Response(bytes, { headers: { "Content-Type": file.endsWith("mjs") || file.endsWith("js") ? "text/javascript" : file.endsWith("wasm") ? "application/wasm" : "application/octet-stream", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("[ESQUEMATICOS] Recurso del lector PDF no disponible", error instanceof Error ? error.message : "Error desconocido");
    return new Response(null, { status: 500 });
  }
}
