import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { buildClosureLearningRecord, closureLearningSchema } from "@/lib/cerebro-v2/closure-learning";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ repairId: z.string().min(1), closure: closureLearningSchema });

export async function POST(request: Request): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
        const parsed = requestSchema.safeParse(await request.json());
        if (!parsed.success) return Response.json({ error: "Cierre técnico inválido" }, { status: 400 });

        const repair = await db.repair.findUnique({
            where: { id: parsed.data.repairId },
            select: { id: true, assignedUserId: true, status: { select: { name: true } } },
        });
        if (!repair) return Response.json({ error: "Reparación no encontrada" }, { status: 404 });
        if (user.role !== "ADMIN" && repair.assignedUserId !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

        const record = buildClosureLearningRecord(repair.status.name, parsed.data.closure);
        const saved = await db.repairLearningRecord.upsert({
            where: { repairId: repair.id },
            create: {
                repairId: repair.id,
                technicianId: repair.assignedUserId ?? user.id,
                symptom: record.closure.symptom,
                rootCause: record.closure.rootCause,
                confirmingEvidence: record.closure.confirmingEvidence,
                intervention: record.closure.intervention,
                verification: record.closure.verification,
                affectedReferences: record.closure.affectedReferences,
                schematicPages: record.closure.schematicPages,
                externalSources: record.closure.externalSources,
                authority: record.authority,
            },
            update: {
                symptom: record.closure.symptom,
                rootCause: record.closure.rootCause,
                confirmingEvidence: record.closure.confirmingEvidence,
                intervention: record.closure.intervention,
                verification: record.closure.verification,
                affectedReferences: record.closure.affectedReferences,
                schematicPages: record.closure.schematicPages,
                externalSources: record.closure.externalSources,
                authority: record.authority,
                trainingEligible: false,
                reviewedBy: null,
                reviewedAt: null,
            },
            select: { authority: true, trainingEligible: true },
        });
        return Response.json({ ok: true, authority: saved.authority, trainingEligible: saved.trainingEligible });
    } catch (error) {
        console.error("[cerebro-v2/closure] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo guardar el cierre técnico" }, { status: 500 });
    }
}
