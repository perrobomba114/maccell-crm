import { getCurrentUser } from "@/actions/auth-actions";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { cerebroChatRepository } from "@/lib/cerebro-v2/chat-repository";
import { getAuthorizedCerebroRepair } from "@/lib/cerebro-v2/repair-context";
import { normalizeDeviceIdentity } from "@/lib/cerebro-v2/normalization";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
    repairId: z.string().trim().min(1).max(80),
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
            return Response.json({ error: "Seleccioná una reparación" }, { status: 400 });
        }
        const repair = await getAuthorizedCerebroRepair(user, parsed.data.repairId);
        if (!repair) {
            return Response.json({ error: "La reparación no está asignada o ya no está activa" }, { status: 403 });
        }
        const { brand, model } = normalizeDeviceIdentity(repair.deviceBrand, repair.deviceModel);
        const session = await cerebroChatRepository.createSession({
            userId: user.id,
            repairId: repair.id,
            ticketNumber: repair.ticketNumber,
            brand,
            model,
        });
        if (!session) return Response.json({ error: "No se pudo crear el chat" }, { status: 500 });
        return Response.json({ session }, { status: 201 });
    } catch (error) {
        console.error("[cerebro-v2/sessions] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo crear el chat" }, { status: 503 });
    }
}
