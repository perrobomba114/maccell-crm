import { getCurrentUser } from "@/actions/auth-actions";
import { canAccessRepairNotebook } from "@/lib/schematics/repair-notebook";
import { findRepairNotebookContext } from "@/lib/schematics/repair-notebook-db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ repairId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
    if (user.role !== "ADMIN" && user.role !== "TECHNICIAN") return Response.json({ error: "Acceso restringido" }, { status: 403 });
    const repairId = (await context.params).repairId;
    if (!repairId || repairId.length > 100) return Response.json({ error: "Reparación inválida" }, { status: 400 });
    const repair = await findRepairNotebookContext(repairId);
    if (!repair) return Response.json({ error: "Reparación no encontrada" }, { status: 404 });
    if (!canAccessRepairNotebook(user, repair)) return Response.json({ error: "La reparación no está asignada a este técnico" }, { status: 403 });
    return Response.json({ repair: { id: repair.id, ticketNumber: repair.ticketNumber, deviceBrand: repair.deviceBrand, deviceModel: repair.deviceModel } });
  } catch (error) {
    console.error("[ESQUEMATICOS] No se pudo cargar el contexto de reparación", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo cargar la reparación" }, { status: 500 });
  }
}
