import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ repairId: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });
        const parsed = requestSchema.safeParse(await request.json());
        if (!parsed.success) return Response.json({ error: "Reparación inválida" }, { status: 400 });

        const record = await db.repairLearningRecord.findUnique({
            where: { repairId: parsed.data.repairId },
            select: { id: true, authority: true },
        });
        if (!record) return Response.json({ error: "No hay cierre técnico para revisar" }, { status: 404 });
        if (record.authority !== "CONFIRMED_SUCCESS") {
            return Response.json({ error: "El cierre no contiene evidencia suficiente para entrenamiento" }, { status: 409 });
        }

        await db.repairLearningRecord.update({
            where: { id: record.id },
            data: { reviewedBy: user.id, reviewedAt: new Date(), trainingEligible: true },
        });
        return Response.json({ ok: true, trainingEligible: true });
    } catch (error) {
        console.error("[cerebro-v2/closure/review] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo revisar el cierre técnico" }, { status: 500 });
    }
}
