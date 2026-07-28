import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import { repairChatReadSchema } from "@/lib/repair-chat/contracts";
import { publishRepairChatEvent } from "@/lib/repair-chat/realtime";
import { markRepairChatRead } from "@/lib/repair-chat/repository";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ repairId: string }> }): Promise<Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return Response.json({ error: "No autorizado" }, { status: 401 });
        const parsed = repairChatReadSchema.safeParse(await request.json());
        if (!parsed.success) return Response.json({ error: "Lectura inválida" }, { status: 400 });
        const { repairId } = await params;
        const user = { id: currentUser.id, role: currentUser.role, branchId: currentUser.branch?.id ?? null };
        const receipt = await markRepairChatRead(user, repairId, new Date());
        if (!receipt) return Response.json({ error: "Sin acceso" }, { status: 403 });
        const repair = await db.repair.findUnique({ where: { id: repairId }, select: { branchId: true, assignedUserId: true } });
        if (repair) await publishRepairChatEvent({ eventId: randomUUID(), type: "chat.read", repairId, branchId: repair.branchId, assignedUserId: repair.assignedUserId, occurredAt: new Date().toISOString() });
        return Response.json({ receipt });
    } catch (error: unknown) {
        console.error("[repair-chats/read] PATCH failed:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo marcar como leído" }, { status: 503 });
    }
}
