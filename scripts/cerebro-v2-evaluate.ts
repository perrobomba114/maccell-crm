import { diagnoseRepair } from "@/lib/cerebro-v2/diagnosis-service";
import { db as prisma } from "@/lib/db";

type EvaluationCase = { ticket: string; prompt: string };

function parseCases(): EvaluationCase[] {
    const encodedInput = process.env.CEREBRO_EVAL_CASES_B64;
    const input = process.env.CEREBRO_EVAL_CASES
        ?? (encodedInput ? Buffer.from(encodedInput, "base64").toString("utf8") : undefined);
    if (!input) throw new Error("CEREBRO_EVAL_CASES is required");
    const parsed: unknown = JSON.parse(input);
    if (!Array.isArray(parsed)) throw new Error("CEREBRO_EVAL_CASES must be an array");
    return parsed.map((item) => {
        if (!item || typeof item !== "object") throw new Error("Invalid evaluation case");
        const record = item as Record<string, unknown>;
        if (typeof record.ticket !== "string" || typeof record.prompt !== "string") {
            throw new Error("Each case requires ticket and prompt");
        }
        return { ticket: record.ticket, prompt: record.prompt };
    });
}

async function evaluate(item: EvaluationCase) {
    const repair = await prisma.repair.findUniqueOrThrow({
        where: { ticketNumber: item.ticket },
        select: {
            ticketNumber: true,
            deviceBrand: true,
            deviceModel: true,
            problemDescription: true,
            diagnosis: true,
            diagnosisEnriched: true,
            isWet: true,
            isWarranty: true,
            statusId: true,
            observations: { select: { content: true }, orderBy: { createdAt: "asc" }, take: 30 },
        },
    });
    const observations = repair.observations.map((observation) => observation.content);
    const result = await diagnoseRepair({
        repair: {
            ticketNumber: repair.ticketNumber,
            deviceBrand: repair.deviceBrand,
            deviceModel: repair.deviceModel,
            problemDescription: repair.problemDescription,
            diagnosis: repair.diagnosis ?? repair.diagnosisEnriched,
            observations,
            isWet: repair.isWet,
            isWarranty: repair.isWarranty,
        },
        history: [],
        text: item.prompt,
        images: [],
        messageId: `evaluation:${repair.ticketNumber}`,
    });
    return {
        ticket: repair.ticketNumber,
        statusId: repair.statusId,
        device: `${repair.deviceBrand} ${repair.deviceModel}`,
        problem: repair.problemDescription,
        answer: result.text,
        sources: result.metadata.sources,
        diagnosticState: result.metadata.diagnosticState,
        diagnosticPlan: result.metadata.diagnosticPlan,
        guidedQuestion: result.metadata.guidedQuestion,
        retrievalWarnings: result.metadata.retrievalWarnings,
        provider: result.metadata.provider,
        promptVersion: result.metadata.promptVersion,
    };
}

async function main() {
    const output = [];
    for (const item of parseCases()) {
        try {
            output.push(await evaluate(item));
        } catch (error) {
            output.push({ ticket: item.ticket, error: error instanceof Error ? error.message : "unknown error" });
        }
    }
    process.stdout.write(`${JSON.stringify(output)}\n`);
}

main()
    .finally(() => prisma.$disconnect())
    .catch((error: unknown) => {
        process.stderr.write(`${error instanceof Error ? error.message : "unknown error"}\n`);
        process.exitCode = 1;
    });
