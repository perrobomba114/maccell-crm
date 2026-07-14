import { getCurrentUser } from "@/actions/auth-actions";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { cerebroChatRepository } from "@/lib/cerebro-v2/chat-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sessionId: string }> };
const uuidSchema = z.string().uuid();
const renameSchema = z.object({ title: z.string().trim().min(1).max(80) });

async function sessionContext(context: RouteContext) {
    const user = await getCurrentUser();
    if (!user || !canUseCerebroV2(user.role)) return null;
    const { sessionId } = await context.params;
    if (!uuidSchema.safeParse(sessionId).success) return null;
    return { user, sessionId };
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
    try {
        const scoped = await sessionContext(context);
        if (!scoped) return Response.json({ error: "No autorizado" }, { status: 401 });
        const session = await cerebroChatRepository.getSession(scoped.user.id, scoped.sessionId);
        if (!session) return Response.json({ error: "Chat no encontrado" }, { status: 404 });
        const messages = await cerebroChatRepository.listMessages(scoped.user.id, scoped.sessionId);
        return Response.json({ session, messages });
    } catch (error) {
        console.error("[cerebro-v2/session] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo abrir el chat" }, { status: 503 });
    }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
    try {
        const scoped = await sessionContext(context);
        if (!scoped) return Response.json({ error: "No autorizado" }, { status: 401 });
        const parsed = renameSchema.safeParse(await request.json());
        if (!parsed.success) return Response.json({ error: "Título inválido" }, { status: 400 });
        const session = await cerebroChatRepository.renameSession(scoped.user.id, scoped.sessionId, parsed.data.title);
        return session
            ? Response.json({ session })
            : Response.json({ error: "Chat no encontrado" }, { status: 404 });
    } catch (error) {
        console.error("[cerebro-v2/session] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo renombrar el chat" }, { status: 503 });
    }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
    try {
        const scoped = await sessionContext(context);
        if (!scoped) return Response.json({ error: "No autorizado" }, { status: 401 });
        const deleted = await cerebroChatRepository.deleteSession(scoped.user.id, scoped.sessionId);
        return deleted.length > 0
            ? Response.json({ ok: true })
            : Response.json({ error: "Chat no encontrado" }, { status: 404 });
    } catch (error) {
        console.error("[cerebro-v2/session] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo eliminar el chat" }, { status: 503 });
    }
}
