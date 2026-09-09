import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { buildClosureLearningRecord, closureLearningSchema, deriveLatestTechnicalOutcome, isClosureVersionCurrent } from "@/lib/cerebro-v2/closure-learning";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({ repairId: z.string().min(1) });
const requestSchema = z.object({ repairId: z.string().min(1), expectedVersion: z.string().datetime().nullable(), closure: closureLearningSchema });
const repairSelect = {
    id: true, assignedUserId: true, problemDescription: true, diagnosis: true,
    status: { select: { id: true, name: true } },
    statusHistory: { orderBy: { createdAt: "asc" as const }, select: { toStatusId: true, createdAt: true, toStatus: { select: { name: true } } } },
    learningRecord: { select: {
        symptom: true, rootCause: true, confirmingEvidence: true, intervention: true, verification: true,
        affectedReferences: true, schematicPages: true, externalSources: true, authority: true, trainingEligible: true, updatedAt: true,
    } },
};

function isAuthorized(user: { id: string; role: string }, assignedUserId: string | null): boolean {
    return user.role === "ADMIN" || assignedUserId === user.id;
}

export async function GET(request: Request): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
        const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!parsed.success) return Response.json({ error: "Reparación inválida" }, { status: 400 });
        const repair = await db.repair.findUnique({ where: { id: parsed.data.repairId }, select: repairSelect });
        if (!repair) return Response.json({ error: "Reparación no encontrada" }, { status: 404 });
        if (!isAuthorized(user, repair.assignedUserId)) return Response.json({ error: "Forbidden" }, { status: 403 });
        const existing = repair.learningRecord;
        const draft = existing ?? {
            symptom: repair.problemDescription, rootCause: repair.diagnosis?.trim() ?? "", confirmingEvidence: "",
            intervention: "", verification: "", affectedReferences: [], schematicPages: [], externalSources: [],
            authority: "INCOMPLETE", trainingEligible: false,
        };
        const events = repair.statusHistory.map((entry) => ({ statusId: entry.toStatusId, statusName: entry.toStatus.name, createdAt: entry.createdAt }));
        if (events.length === 0) events.push({ statusId: repair.status.id, statusName: repair.status.name, createdAt: new Date(0) });
        const parsedExisting = existing ? closureLearningSchema.safeParse(existing) : null;
        const rebuilt = parsedExisting?.success ? buildClosureLearningRecord(deriveLatestTechnicalOutcome(events), parsedExisting.data) : null;
        return Response.json({
            draft, version: existing?.updatedAt.toISOString() ?? null, isAdmin: user.role === "ADMIN",
            canReview: user.role === "ADMIN" && existing?.authority === "CONFIRMED_SUCCESS" && !existing.trainingEligible
                && rebuilt?.authority === "CONFIRMED_SUCCESS" && rebuilt.qualityAccepted,
        });
    } catch (error) {
        console.error("[cerebro-v2/closure] Read error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo cargar el cierre técnico" }, { status: 500 });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });
        const parsed = requestSchema.safeParse(await request.json());
        if (!parsed.success) return Response.json({ error: "Cierre técnico inválido o evidencia insuficiente" }, { status: 400 });
        const result = await db.$transaction(async (transaction) => {
            const repair = await transaction.repair.findUnique({ where: { id: parsed.data.repairId }, select: repairSelect });
            if (!repair) return { kind: "missing" as const };
            if (!isAuthorized(user, repair.assignedUserId)) return { kind: "forbidden" as const };
            if (!isClosureVersionCurrent(parsed.data.expectedVersion, repair.learningRecord?.updatedAt ?? null)) return { kind: "stale" as const };
            const events = repair.statusHistory.map((entry) => ({ statusId: entry.toStatusId, statusName: entry.toStatus.name, createdAt: entry.createdAt }));
            if (events.length === 0) events.push({ statusId: repair.status.id, statusName: repair.status.name, createdAt: new Date(0) });
            const record = buildClosureLearningRecord(deriveLatestTechnicalOutcome(events), parsed.data.closure);
            const values = { ...record.closure, authority: record.authority, trainingEligible: false, reviewedBy: null, reviewedAt: null };
            if (repair.learningRecord) {
                const updated = await transaction.repairLearningRecord.updateMany({ where: { repairId: repair.id, updatedAt: repair.learningRecord.updatedAt }, data: values });
                if (updated.count !== 1) return { kind: "stale" as const };
            } else {
                await transaction.repairLearningRecord.create({ data: { repairId: repair.id, technicianId: repair.assignedUserId ?? user.id, ...values } });
            }
            const saved = await transaction.repairLearningRecord.findUniqueOrThrow({ where: { repairId: repair.id }, select: { authority: true, trainingEligible: true, updatedAt: true } });
            return { kind: "saved" as const, saved, qualityIssues: record.qualityIssues };
        }, { isolationLevel: "Serializable" });
        if (result.kind === "missing") return Response.json({ error: "Reparación no encontrada" }, { status: 404 });
        if (result.kind === "forbidden") return Response.json({ error: "Forbidden" }, { status: 403 });
        if (result.kind === "stale") return Response.json({ error: "El cierre cambió. Recargalo antes de guardar" }, { status: 409 });
        return Response.json({ ok: true, authority: result.saved.authority, trainingEligible: result.saved.trainingEligible,
            version: result.saved.updatedAt.toISOString(), canReview: user.role === "ADMIN" && result.saved.authority === "CONFIRMED_SUCCESS",
            qualityFeedback: result.qualityIssues });
    } catch (error) {
        console.error("[cerebro-v2/closure] Save error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo guardar el cierre técnico" }, { status: 500 });
    }
}
