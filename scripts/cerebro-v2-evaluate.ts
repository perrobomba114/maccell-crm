import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, type LanguageModel, type ModelMessage } from "ai";

import { db as prisma } from "@/lib/db";
import { TEXT_MODELS, VISION_MODEL, createFallbackModel } from "@/lib/cerebro/models";
import { buildTechnicalSearchQuery, diagnosticSubsystemTerms } from "@/lib/cerebro-v2/diagnostic-planner";
import { ensureObservedFacts, suppressUnsupportedMeasurements } from "@/lib/cerebro-v2/grounding";
import { buildGuidedQuestion } from "@/lib/cerebro-v2/guided-diagnosis";
import { deviceModelAliases, normalizeDeviceIdentity } from "@/lib/cerebro-v2/normalization";
import { buildCerebroSystemPrompt } from "@/lib/cerebro-v2/prompt";
import { retrieveCerebroSources } from "@/lib/cerebro-v2/retrieval";
import { shouldLoadVisualEvidence } from "@/lib/cerebro-v2/visual-evidence";
import { requestQueryEmbedding, requestRagPageImage } from "@/lib/cerebro-v2/worker-client";
import { getGroqKeys } from "@/lib/groq";

type EvaluationCase = { ticket: string; prompt: string };
type ProviderSelection = { label: string; keyId: string };

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

function componentCodes(value: string): string[] {
    return [...new Set(value.toUpperCase().match(/\b[A-Z]{1,3}\d{3,5}\b/g) ?? [])];
}

function buildModel(onSelect: (provider: ProviderSelection) => void, vision: boolean): LanguageModel {
    const configurations: Array<{ instance: unknown; label: string; keyId: string }> = [];
    for (const key of getGroqKeys()) {
        for (const model of vision ? [VISION_MODEL] : TEXT_MODELS) {
            configurations.push({
                instance: createGroq({ apiKey: key })(model.id),
                label: model.label,
                keyId: "groq",
            });
        }
    }
    if (process.env.OPENROUTER_API_KEY) {
        const openRouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
        const modelId = vision
            ? process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-2.5-flash"
            : process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
        configurations.push({ instance: openRouter(modelId), label: "OpenRouter", keyId: "openrouter" });
    }
    return createFallbackModel(configurations, onSelect) as unknown as LanguageModel;
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
    const identity = normalizeDeviceIdentity(repair.deviceBrand, repair.deviceModel);
    const observations = repair.observations.map((observation) => observation.content);
    const searchText = buildTechnicalSearchQuery({
        brand: identity.brand,
        model: identity.model,
        problem: repair.problemDescription,
        latestText: item.prompt,
        observations,
    });
    const evidence = await retrieveCerebroSources({
        brand: identity.brand,
        model: identity.model,
        modelAliases: deviceModelAliases(identity),
        modelFamily: identity.modelFamily,
        text: searchText,
        embedding: await requestQueryEmbedding(searchText),
        componentCodes: componentCodes(searchText),
        subsystemTerms: diagnosticSubsystemTerms(searchText),
        excludeRepairTicket: repair.ticketNumber,
        limit: 8,
    });
    const visualCandidates = evidence.filter(shouldLoadVisualEvidence).slice(0, 2);
    const visualResults = await Promise.allSettled(visualCandidates.map((source) => (
        requestRagPageImage(source.documentId, source.pageNumber ?? 1)
    )));
    const visualEvidence = visualResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const messages: ModelMessage[] = [{ role: "user", content: item.prompt }];
    if (visualEvidence.length > 0) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: "Inspect these cited schematic pages. Use only visible labels and branches." },
                ...visualEvidence.map((image) => ({ type: "image" as const, image })),
            ],
        });
    }
    let provider: ProviderSelection = { label: "Pending", keyId: "pending" };
    const result = await generateText({
        model: buildModel((selected) => { provider = selected; }, visualEvidence.length > 0),
        system: buildCerebroSystemPrompt(identity.brand, identity.model, evidence, {
            ticketNumber: repair.ticketNumber,
            problem: repair.problemDescription,
            diagnosis: repair.diagnosis ?? repair.diagnosisEnriched,
            observations,
            isWet: repair.isWet,
            isWarranty: repair.isWarranty,
        }),
        messages,
        temperature: 0.2,
        maxOutputTokens: 1_600,
        maxRetries: 0,
    });
    const answer = ensureObservedFacts(
        suppressUnsupportedMeasurements(result.text, evidence.map((source) => source.content)),
        {
            device: `${identity.brand} ${identity.model}`,
            sellerProblem: repair.problemDescription,
            technicianInput: item.prompt,
        },
    );
    return {
        ticket: repair.ticketNumber,
        statusId: repair.statusId,
        device: `${identity.brand} ${identity.model}`,
        problem: repair.problemDescription,
        answer,
        sources: evidence.map((source) => ({
            type: source.sourceType,
            brand: source.brand,
            model: source.model,
            title: source.title,
            page: source.pageNumber,
            excerpt: source.content.slice(0, 260),
        })),
        guidedQuestion: buildGuidedQuestion({
            repairProblem: repair.problemDescription,
            latestText: item.prompt,
            evidenceDocumentIds: evidence.map((source) => source.documentId),
        }),
        provider: `${provider.keyId}:${provider.label}`,
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
