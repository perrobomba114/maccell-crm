import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/actions/auth-actions";
import { libraryRoot, readCatalog } from "@/lib/schematics/catalog";
import { databasePages } from "@/lib/schematics/database";
import { readTechnicalIndex, hasPreviousTechnicalIndex } from "@/lib/schematics/index-store";
import { indexReferenceMatches } from "@/lib/schematics/unified-index";
import { findReferencePages } from "@/lib/schematics/references";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
    if (!["ADMIN", "TECHNICIAN"].includes(user.role)) return Response.json({ error: "Acceso restringido" }, { status: 403 });
    const id = (await context.params).id;
    const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (!/^[a-f0-9]{64}$/.test(id) || term.length < 2 || term.length > 100) return Response.json({ error: "Referencia inválida" }, { status: 400 });
    const catalog = await readCatalog();
    const asset = catalog.assets.find((item) => item.id === id && item.kind === "pdf");
    if (!asset) return Response.json({ error: "PDF no encontrado" }, { status: 404 });
    if (asset.status !== "ready") return Response.json({ matches: [], status: asset.status });
    const technical = await readTechnicalIndex(asset);
    if (technical) return Response.json({matches:indexReferenceMatches(technical.pages,term),status:technical.pages.some(page=>page.text.trim())?"indexed":"no_text",sources:[...new Set(technical.pages.map(page=>page.source))]});
    if (await hasPreviousTechnicalIndex(asset.id)) return Response.json({matches:[],status:"stale"});
    let pages: { page: number; text: string; source?: "text" | "ocr"; sha256?: string }[];
    try { pages = await databasePages(id, asset.sha256) ?? JSON.parse(await readFile(path.join(libraryRoot(), ".index", `${id}.json`), "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return Response.json({ matches: [], status: "not_indexed" }); throw error; }
    pages = pages.filter((page) => !("sha256" in page) || page.sha256 === asset.sha256);
    const matches = findReferencePages(pages, term);
    return Response.json({ matches, status: pages.some((p) => p.text.trim()) ? "indexed" : "no_text", sources: [...new Set(pages.map((page) => page.source ?? "text"))] });
  } catch (error) {
    console.error("[ESQUEMATICOS] Búsqueda de referencias falló", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo buscar la referencia" }, { status: 500 });
  }
}
