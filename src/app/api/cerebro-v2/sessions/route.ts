import { getCurrentUser } from "@/actions/auth-actions";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { cerebroChatRepository } from "@/lib/cerebro-v2/chat-repository";
import { normalizeBrand, normalizeModel } from "@/lib/cerebro-v2/normalization";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(120),
});

async function authorizedUser() {
    const user = await getCurrentUser();
    if (!user || !canUseCerebroV2(user.role)) return null;
    return user;
}

export async function GET(): Promise<Response> {
    try {
        const user = await authorizedUser();
        if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
        return Response.json({ sessions: await cerebroChatRepository.listSessions(user.id) });
    } catch (error) {
        console.error("[cerebro-v2/sessions] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo cargar el historial nuevo" }, { status: 503 });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const user = await authorizedUser();
        if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
        const parsed = createSchema.safeParse(await request.json());
        if (!parsed.success) {
            return Response.json({ error: "Seleccioná marca y modelo" }, { status: 400 });
        }
        const brand = normalizeBrand(parsed.data.brand);
        const model = normalizeModel(brand, parsed.data.model);
        const session = await cerebroChatRepository.createSession(user.id, brand, model);
        if (!session) return Response.json({ error: "No se pudo crear el chat" }, { status: 500 });
        return Response.json({ session }, { status: 201 });
    } catch (error) {
        console.error("[cerebro-v2/sessions] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo crear el chat" }, { status: 503 });
    }
}
