import { getCurrentUser } from "@/actions/auth-actions";
import { buildLoraTrainingExample } from "@/lib/cerebro-v2/lora-dataset";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

        const records = await db.repairLearningRecord.findMany({
            where: { authority: "CONFIRMED_SUCCESS", trainingEligible: true, reviewedAt: { not: null } },
            orderBy: { reviewedAt: "asc" },
            select: {
                symptom: true,
                rootCause: true,
                confirmingEvidence: true,
                intervention: true,
                verification: true,
                affectedReferences: true,
                repair: { select: { ticketNumber: true, deviceBrand: true, deviceModel: true, problemDescription: true } },
            },
        });
        const body = records.map((record) => JSON.stringify(buildLoraTrainingExample({
            ...record,
            ...record.repair,
        }))).join("\n");
        return new Response(body ? `${body}\n` : "", {
            headers: {
                "Content-Type": "application/x-ndjson; charset=utf-8",
                "Content-Disposition": 'attachment; filename="cerebro-lora-reviewed.jsonl"',
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[cerebro-v2/lora-dataset] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "No se pudo exportar el dataset LoRA" }, { status: 500 });
    }
}
