import { formatRepairEvidenceContent, summarizeRepairEvidence } from "./repair-evidence";
import type { RepairEvidenceReader } from "./repair-evidence-store";

type RouteContext = { params: Promise<{ documentId: string }> };
type RouteUser = { id: string; role?: string };
export type RepairEvidenceHandlerDependencies = {
    getUser: () => Promise<RouteUser | null>;
    canUse: (role?: string) => boolean;
    readEvidence: RepairEvidenceReader;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createRepairEvidenceHandler(dependencies: RepairEvidenceHandlerDependencies) {
    return async (request: Request, context: RouteContext): Promise<Response> => {
        try {
            const user = await dependencies.getUser();
            if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
            if (!dependencies.canUse(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
            const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
            const { documentId } = await context.params;
            if (!UUID.test(sessionId) || !UUID.test(documentId)) {
                return Response.json({ error: "Referencia inválida" }, { status: 400 });
            }
            const evidence = await dependencies.readEvidence(user.id, sessionId, documentId);
            if (!evidence) return Response.json({ error: "Antecedente no encontrado" }, { status: 404 });
            const summary = summarizeRepairEvidence(evidence.content, evidence.title);
            return Response.json({ source: {
                documentId: evidence.documentId, title: evidence.title, brand: evidence.brand,
                model: evidence.model, authority: evidence.authority, summary,
                content: formatRepairEvidenceContent(summary),
            } }, { headers: { "Cache-Control": "private, no-store" } });
        } catch (error) {
            console.error("[cerebro-v2/repair-evidence] Error:", error instanceof Error ? error.message : "unknown error");
            return Response.json({ error: "No se pudo abrir el antecedente" }, { status: 500 });
        }
    };
}
