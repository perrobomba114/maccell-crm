import { getCurrentUser } from "@/actions/auth-actions";
import { listRepairChatReaders } from "@/lib/repair-chat/repository";

export const dynamic = "force-dynamic";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ repairId: string; messageId: string }> },
): Promise<Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return Response.json({ error: "No autorizado" }, { status: 401 });
        const { repairId, messageId } = await params;
        const user = { id: currentUser.id, role: currentUser.role, branchId: currentUser.branch?.id ?? null };
        const readers = await listRepairChatReaders(user, repairId, messageId);
        return readers ? Response.json({ readers }) : Response.json({ error: "Sin acceso" }, { status: 403 });
    } catch (error: unknown) {
        console.error("[repair-chats/readers] GET failed:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudieron cargar las lecturas" }, { status: 503 });
    }
}
