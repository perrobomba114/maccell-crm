import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import { buildClosureLearningRecord, closureLearningSchema, deriveLatestTechnicalOutcome, isClosureVersionCurrent } from "@/lib/cerebro-v2/closure-learning";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ repairId: z.string().min(1), expectedVersion: z.string().datetime() });

export async function POST(request: Request): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });
        const parsed = requestSchema.safeParse(await request.json());
        if (!parsed.success) return Response.json({ error: "Reparación o versión inválida" }, { status: 400 });
        const result = await db.$transaction(async (transaction) => {
            const record = await transaction.repairLearningRecord.findUnique({
                where: { repairId: parsed.data.repairId },
                select: {
                    id: true, updatedAt: true, authority: true, symptom: true, rootCause: true, confirmingEvidence: true,
                    intervention: true, verification: true, affectedReferences: true, schematicPages: true, externalSources: true,
                    repair: { select: {
                        status: { select: { id: true, name: true } },
                        statusHistory: { orderBy: { createdAt: "asc" }, select: { toStatusId: true, createdAt: true, toStatus: { select: { name: true } } } },
                    } },
                },
            });
            if (!record) return { kind: "missing" as const };
            if (!isClosureVersionCurrent(parsed.data.expectedVersion, record.updatedAt)) return { kind: "stale" as const };
            const events = record.repair.statusHistory.map((entry) => ({ statusId: entry.toStatusId, statusName: entry.toStatus.name, createdAt: entry.createdAt }));
            if (events.length === 0) events.push({ statusId: record.repair.status.id, statusName: record.repair.status.name, createdAt: new Date(0) });
            const closure = closureLearningSchema.safeParse({
                symptom: record.symptom, rootCause: record.rootCause, confirmingEvidence: record.confirmingEvidence,
                intervention: record.intervention, verification: record.verification, affectedReferences: record.affectedReferences,
                schematicPages: record.schematicPages, externalSources: record.externalSources,
            });
            if (!closure.success) return { kind: "quality" as const };
            const rebuilt = buildClosureLearningRecord(deriveLatestTechnicalOutcome(events), closure.data);
            if (record.authority !== "CONFIRMED_SUCCESS" || rebuilt.authority !== "CONFIRMED_SUCCESS" || !rebuilt.qualityAccepted) return { kind: "quality" as const };
            const updated = await transaction.repairLearningRecord.updateMany({
                where: { id: record.id, updatedAt: record.updatedAt, authority: "CONFIRMED_SUCCESS", trainingEligible: false },
                data: { reviewedBy: user.id, reviewedAt: new Date(), trainingEligible: true },
            });
            if (updated.count !== 1) return { kind: "stale" as const };
            const approved = await transaction.repairLearningRecord.findUniqueOrThrow({ where: { id: record.id }, select: { updatedAt: true } });
            return { kind: "approved" as const, version: approved.updatedAt.toISOString() };
        }, { isolationLevel: "Serializable" });
        if (result.kind === "missing") return Response.json({ error: "No hay cierre técnico para revisar" }, { status: 404 });
        if (result.kind === "stale") return Response.json({ error: "El cierre cambió. Recargalo antes de aprobar" }, { status: 409 });
        if (result.kind === "quality") return Response.json({ error: "El cierre actual no conserva calidad golden verificable" }, { status: 409 });
        return Response.json({ ok: true, trainingEligible: true, version: result.version });
    } catch (error) {
        console.error("[cerebro-v2/closure/review] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo revisar el cierre técnico" }, { status: 500 });
    }
}
