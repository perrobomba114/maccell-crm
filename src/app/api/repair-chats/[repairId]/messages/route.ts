import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import { sendRepairChatMessageSchema } from "@/lib/repair-chat/contracts";
import { publishRepairChatEvent } from "@/lib/repair-chat/realtime";
import { listRepairChatMessages, sendRepairChatMessage } from "@/lib/repair-chat/repository";
import { cleanupUnreferencedRepairChatImages } from "@/lib/repair-chat/media";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ repairId: string }> };

export async function GET(request: Request, { params }: Context): Promise<Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return Response.json({ error: "No autorizado" }, { status: 401 });
        const { repairId } = await params;
        const before = new URL(request.url).searchParams.get("before") ?? undefined;
        const user = { id: currentUser.id, role: currentUser.role, branchId: currentUser.branch?.id ?? null };
        const result = await listRepairChatMessages(user, repairId, before);
        return result ? Response.json(result) : Response.json({ error: "Sin acceso" }, { status: 403 });
    } catch (error: unknown) {
        console.error("[repair-chats/messages] GET failed:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudieron cargar los mensajes" }, { status: 503 });
    }
}

export async function POST(request: Request, { params }: Context): Promise<Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return Response.json({ error: "No autorizado" }, { status: 401 });
        const parsed = sendRepairChatMessageSchema.safeParse(await request.json());
        if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Mensaje inválido" }, { status: 400 });
        const { repairId } = await params;
        const user = { id: currentUser.id, role: currentUser.role, branchId: currentUser.branch?.id ?? null };
        let message;
        try {
            message = await sendRepairChatMessage(user, repairId, parsed.data);
        } catch (error: unknown) {
            await cleanupUnreferencedRepairChatImages(repairId, parsed.data.imageUrls);
            throw error;
        }
        if (!message) {
            await cleanupUnreferencedRepairChatImages(repairId, parsed.data.imageUrls);
            return Response.json({ error: "Sin acceso o chat archivado" }, { status: 403 });
        }
        const repair = await db.repair.findUnique({ where: { id: repairId }, select: { branchId: true, assignedUserId: true } });
        if (repair) await publishRepairChatEvent({ eventId: randomUUID(), type: "message.created", repairId, branchId: repair.branchId, assignedUserId: repair.assignedUserId, occurredAt: new Date().toISOString() });
        return Response.json({ message }, { status: 201 });
    } catch (error: unknown) {
        console.error("[repair-chats/messages] POST failed:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo enviar el mensaje" }, { status: 503 });
    }
}
