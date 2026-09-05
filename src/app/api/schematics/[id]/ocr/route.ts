import { getCurrentUser } from "@/actions/auth-actions";
import { resolveAsset } from "@/lib/schematics/catalog";
import { ocrAvailability, ocrLanguages, recognizePdfPages } from "@/lib/schematics/ocr";

export const dynamic = "force-dynamic";
type Body = { pages?: unknown };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
    if (!["ADMIN", "TECHNICIAN"].includes(user.role)) return Response.json({ error: "Acceso restringido" }, { status: 403 });
    const body = await request.json() as Body;
    if (!Array.isArray(body.pages) || body.pages.length < 1 || body.pages.length > 3 || body.pages.some((page) => !Number.isInteger(page) || Number(page) < 1 || Number(page) > 10_000)) {
      return Response.json({ error: "Indicá entre 1 y 3 páginas válidas" }, { status: 400 });
    }
    const resolved = await resolveAsset((await context.params).id);
    if (!resolved || resolved.asset.kind !== "pdf") return Response.json({ error: "PDF no encontrado" }, { status: 404 });
    const availability = await ocrAvailability();
    if (!availability.available) return Response.json({ error: "OCR no está instalado en este entorno", missing: availability.missing }, { status: 503 });
    const pages = [...new Set(body.pages.map(Number))];
    const indexed = await recognizePdfPages(resolved.asset, resolved.file, pages);
    const languages = await ocrLanguages();
    return Response.json({ status: "indexed", source: "ocr", languages: languages.used, languageFallback: languages.used.join("+") !== languages.requested.join("+"), pages: indexed.map((page) => ({ page: page.page, source: page.source, characters: page.text.length })) });
  } catch (error) {
    if (error instanceof Error && /^El PDF tiene \d+ páginas$/.test(error.message)) return Response.json({ error: error.message }, { status: 400 });
    console.error("[ESQUEMATICOS] OCR falló", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo reconocer el texto de las páginas" }, { status: 500 });
  }
}
