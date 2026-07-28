import { getCurrentUser } from "@/actions/auth-actions";
import { repairChatListSchema } from "@/lib/repair-chat/contracts";
import { listRepairChats } from "@/lib/repair-chat/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return Response.json({ error: "No autorizado" }, { status: 401 });
        const url = new URL(request.url);
        const parsed = repairChatListSchema.safeParse({ scope: url.searchParams.get("scope") ?? "active", cursor: url.searchParams.get("cursor") ?? undefined });
        if (!parsed.success) return Response.json({ error: "Filtros inválidos" }, { status: 400 });
        const user = { id: currentUser.id, role: currentUser.role, branchId: currentUser.branch?.id ?? null };
        return Response.json(await listRepairChats(user, parsed.data.scope, parsed.data.cursor));
    } catch (error: unknown) {
        console.error("[repair-chats] GET failed:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudieron cargar los chats" }, { status: 503 });
    }
}
