import { getCurrentUser } from "@/actions/auth-actions";
import { readCatalog, readCatalogPage } from "@/lib/schematics/catalog";
import { sameDevice } from "@/lib/schematics/catalog-types";
import { paginateCatalog, type CatalogKind } from "@/lib/schematics/search";

export const dynamic = "force-dynamic";
const allowedKinds = new Set<CatalogKind>(["all", "pcbe", "pdf"]);

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
    if (!["ADMIN", "TECHNICIAN"].includes(user.role)) return Response.json({ error: "Acceso restringido" }, { status: 403 });
    const params = new URL(request.url).searchParams;
    const catalog = await readCatalog();
    const rawKind = params.get("kind") ?? "all";
    if (!allowedKinds.has(rawKind as CatalogKind)) return Response.json({ error: "Tipo de archivo inválido" }, { status: 400 });
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.get("pageSize") ?? "40", 10) || 40));
    const q = params.get("q")?.trim().slice(0, 100);
    const ids = params.get("ids")?.split(",").filter((id) => /^[a-f0-9]{64}$/.test(id)).slice(0, 100);
    if (ids?.length) {
      const wanted = new Set(ids);
      return Response.json(paginateCatalog(catalog.assets.filter((asset) => wanted.has(asset.id)), { q, kind: rawKind as CatalogKind, page, pageSize }));
    }
    const relatedId = params.get("related");
    if (relatedId) {
      const selected = catalog.assets.find((asset) => asset.id === relatedId);
      if (!selected) return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
      const assets = catalog.assets.filter((asset) => asset.id !== selected.id && asset.kind === "pdf" && sameDevice(selected, asset));
      return Response.json(paginateCatalog(assets, { q, kind: rawKind as CatalogKind, page, pageSize }));
    }
    return Response.json(await readCatalogPage({ q, kind: rawKind as CatalogKind, page, pageSize }));
  } catch (error) {
    console.error("[ESQUEMATICOS] No se pudo listar el catálogo", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo cargar el catálogo" }, { status: 500 });
  }
}
