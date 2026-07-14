import { getCurrentUser } from "@/actions/auth-actions";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { ragDocumentPageUrl, ragWorkerAuthorization } from "@/lib/cerebro-v2/worker-client";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ documentId: string; pageNumber: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) return Response.json({ error: "Sin acceso" }, { status: 403 });
        const { documentId, pageNumber: rawPageNumber } = await context.params;
        const pageNumber = Number(rawPageNumber);
        if (!/^[0-9a-f-]{36}$/i.test(documentId) || !Number.isInteger(pageNumber) || pageNumber < 1) {
            return Response.json({ error: "Página inválida" }, { status: 400 });
        }
        const upstream = await fetch(ragDocumentPageUrl(documentId, pageNumber), {
            headers: { Authorization: ragWorkerAuthorization() },
            cache: "no-store",
        });
        if (!upstream.ok || !upstream.body) {
            return Response.json({ error: "Página no encontrada" }, { status: upstream.status === 404 ? 404 : 502 });
        }
        return new Response(upstream.body, {
            headers: {
                "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
                "Cache-Control": "private, max-age=86400",
                "Content-Disposition": "inline",
            },
        });
    } catch (error) {
        console.error("[cerebro-v2/page] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo mostrar la página" }, { status: 500 });
    }
}
