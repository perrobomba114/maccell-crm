import { getCurrentUser } from "@/actions/auth-actions";
import { repairChatSearchSchema } from "@/lib/repair-chat/contracts";
import { searchRepairChats } from "@/lib/repair-chat/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return Response.json({ error: "No autorizado" }, { status: 401 });
        const searchParams = new URL(request.url).searchParams;
        const parsed = repairChatSearchSchema.safeParse({ query: searchParams.get("q") ?? "", scope: searchParams.get("scope") ?? "active" });
        if (!parsed.success) return Response.json({ items: [] });
        const user = { id: currentUser.id, role: currentUser.role, branchId: currentUser.branch?.id ?? null };
        return Response.json({ items: await searchRepairChats(user, parsed.data.query, parsed.data.scope) });
    } catch (error: unknown) {
        console.error("[repair-chats/search] GET failed:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo buscar reparaciones" }, { status: 503 });
    }
}
