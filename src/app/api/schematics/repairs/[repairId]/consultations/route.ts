import { getCurrentUser } from "@/actions/auth-actions";
import { readCatalog } from "@/lib/schematics/catalog";
import { canAccessRepairNotebook } from "@/lib/schematics/repair-notebook";
import { findRepairNotebookContext, recordRepairConsultation } from "@/lib/schematics/repair-notebook-db";

export async function POST(request: Request, context: { params: Promise<{ repairId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
    if (user.role !== "ADMIN" && user.role !== "TECHNICIAN") return Response.json({ error: "Acceso restringido" }, { status: 403 });
    const repairId = (await context.params).repairId;
    const repair = repairId.length <= 100 ? await findRepairNotebookContext(repairId) : null;
    if (!repair) return Response.json({ error: "Reparación no encontrada" }, { status: 404 });
    if (!canAccessRepairNotebook(user, repair)) return Response.json({ error: "La reparación no está asignada a este técnico" }, { status: 403 });
    const body: unknown = await request.json();
    const assetId = body && typeof body === "object" ? (body as { assetId?: unknown }).assetId : null;
    if (typeof assetId !== "string" || !/^[a-f0-9]{64}$/.test(assetId)) return Response.json({ error: "Activo inválido" }, { status: 400 });
    const catalog = await readCatalog();
    if (!catalog.assets.some((asset) => asset.id === assetId && asset.status === "ready")) return Response.json({ error: "Archivo técnico no encontrado" }, { status: 404 });
    await recordRepairConsultation(repairId, assetId, user.id);
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[ESQUEMATICOS] No se pudo registrar la consulta", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo registrar la consulta" }, { status: 500 });
  }
}
