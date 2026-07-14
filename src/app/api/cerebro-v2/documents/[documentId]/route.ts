import { getCurrentUser } from "@/actions/auth-actions";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { ragDocumentUrl, ragWorkerAuthorization } from "@/lib/cerebro-v2/worker-client";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
        const { documentId } = await context.params;
        if (!/^[0-9a-f-]{36}$/i.test(documentId)) {
            return Response.json({ error: "Documento inválido" }, { status: 400 });
        }
        const upstream = await fetch(ragDocumentUrl(documentId), {
            headers: { Authorization: ragWorkerAuthorization() },
            cache: "no-store",
        });
        if (!upstream.ok || !upstream.body) {
            return Response.json({ error: "Documento no encontrado" }, { status: upstream.status === 404 ? 404 : 502 });
        }
        return new Response(upstream.body, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline",
                "Cache-Control": "private, max-age=300",
            },
        });
    } catch (error) {
        console.error("[cerebro-v2/documents] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo abrir el documento" }, { status: 500 });
    }
}
