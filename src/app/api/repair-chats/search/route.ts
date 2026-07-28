import { getCurrentUser } from "@/actions/auth-actions";
import { repairChatSearchSchema } from "@/lib/repair-chat/contracts";
import { searchRepairChats } from "@/lib/repair-chat/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return Response.json({ error: "No autorizado" }, { status: 401 });
        const parsed = repairChatSearchSchema.safeParse({ query: new URL(request.url).searchParams.get("q") ?? "" });
        if (!parsed.success) return Response.json({ items: [] });
        const user = { id: currentUser.id, role: currentUser.role, branchId: currentUser.branch?.id ?? null };
        return Response.json({ items: await searchRepairChats(user, parsed.data.query) });
    } catch (error: unknown) {
        console.error("[repair-chats/search] GET failed:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo buscar reparaciones" }, { status: 503 });
    }
}
