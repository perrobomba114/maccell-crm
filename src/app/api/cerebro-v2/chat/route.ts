import { getCurrentUser } from "@/actions/auth-actions";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createUIMessageStream, createUIMessageStreamResponse, generateText, type LanguageModel, type ModelMessage, type UIMessage } from "ai";

import { TEXT_MODELS, VISION_MODEL, createFallbackModel } from "@/lib/cerebro/models";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { parseCerebroChatRequest, type CerebroChatRequest } from "@/lib/cerebro-v2/chat-contract";
import { cerebroChatRepository } from "@/lib/cerebro-v2/chat-repository";
import { buildTechnicalSearchQuery, diagnosticSubsystemTerms } from "@/lib/cerebro-v2/diagnostic-planner";
import { buildGuidedQuestion, validateGuidedAnswer } from "@/lib/cerebro-v2/guided-diagnosis";
import { ensureObservedFacts, suppressUnsupportedMeasurements } from "@/lib/cerebro-v2/grounding";
import { extractMessageInput, toPublicSources } from "@/lib/cerebro-v2/message-content";
import { deviceModelAliases, normalizeDeviceIdentity } from "@/lib/cerebro-v2/normalization";
import { buildCerebroSystemPrompt, CEREBRO_PROMPT_VERSION } from "@/lib/cerebro-v2/prompt";
import { getAuthorizedCerebroRepair } from "@/lib/cerebro-v2/repair-context";
import { createLocalCerebroModel } from "@/lib/cerebro-v2/local-provider";
import { retrieveCerebroSources } from "@/lib/cerebro-v2/retrieval";
import type { CerebroMessageMetadata } from "@/lib/cerebro-v2/types";
import { shouldLoadVisualEvidence } from "@/lib/cerebro-v2/visual-evidence";
import { requestQueryEmbedding, requestRagPageImage } from "@/lib/cerebro-v2/worker-client";
import { getGroqKeys } from "@/lib/groq";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ProviderSelection = { label: string; keyId: string };

function componentCodes(value: string): string[] {
    return [...new Set(value.toUpperCase().match(/\b[A-Z]{1,3}\d{3,5}\b/g) ?? [])];
}

function buildModel(onSelect: (provider: ProviderSelection) => void, vision: boolean): LanguageModel {
    const configurations: Array<{ instance: unknown; label: string; keyId: string }> = [];
    if (!vision) {
        const localModel = createLocalCerebroModel();
        if (localModel) {
            configurations.push({ instance: localModel, label: "Qwen local", keyId: "local" });
        }
    }
    for (const key of getGroqKeys()) {
        const models = vision ? [VISION_MODEL] : TEXT_MODELS;
        for (const model of models) {
            configurations.push({
                instance: createGroq({ apiKey: key })(model.id),
                label: model.label,
                keyId: "groq",
            });
        }
    }
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
        const openRouter = createOpenRouter({ apiKey: openRouterKey });
        const modelId = vision
            ? process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-2.5-flash"
            : process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
        configurations.push({ instance: openRouter(modelId), label: "OpenRouter", keyId: "openrouter" });
    }
    return createFallbackModel(configurations, onSelect) as unknown as LanguageModel;
}

function toModelMessages(messages: CerebroChatRequest["messages"]): ModelMessage[] {
    return messages.slice(-8).map((message): ModelMessage => {
        const input = extractMessageInput(message);
        if (message.role === "assistant") return { role: "assistant", content: input.text || "..." };
        if (input.images.length === 0) return { role: "user", content: input.text || "Analizar equipo" };
        return {
            role: "user",
            content: [
                { type: "text", text: input.text || "Analizá esta imagen técnica del equipo." },
                ...input.images.map((image) => ({ type: "image" as const, image })),
            ],
        };
    });
}

function diagnosticQuery(request: CerebroChatRequest): { text: string; images: string[] } {
    const lastUser = request.messages.findLast((message) => message.role === "user");
    if (!lastUser) return { text: "", images: [] };
    return extractMessageInput(lastUser);
}

async function loadVisualEvidence(evidence: Awaited<ReturnType<typeof retrieveCerebroSources>>): Promise<Uint8Array[]> {
    const candidates = evidence.filter(shouldLoadVisualEvidence).slice(0, 2);
    const results = await Promise.allSettled(candidates.map((source) => (
        requestRagPageImage(source.documentId, source.pageNumber ?? 1)
    )));
    return results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
}

function groundedUiResponse(
    messageId: string,
    text: string,
    metadata: CerebroMessageMetadata,
): Response {
    type ServerMessage = UIMessage<CerebroMessageMetadata>;
    const stream = createUIMessageStream<ServerMessage>({
        execute: ({ writer }) => {
            writer.write({ type: "start", messageId, messageMetadata: metadata });
            writer.write({ type: "text-start", id: "diagnosis" });
            writer.write({ type: "text-delta", id: "diagnosis", delta: text });
            writer.write({ type: "text-end", id: "diagnosis" });
            writer.write({ type: "finish", finishReason: "stop", messageMetadata: metadata });
        },
    });
    return createUIMessageStreamResponse({ stream });
}

export async function POST(request: Request): Promise<Response> {
    try {
        const user = await getCurrentUser();
        if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
        if (!canUseCerebroV2(user.role)) return Response.json({ error: "Sin acceso" }, { status: 403 });

        const parsed = parseCerebroChatRequest(await request.json());
        if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400 });
        const session = await cerebroChatRepository.getSession(user.id, parsed.data.sessionId);
        if (!session) return Response.json({ error: "El chat no existe o no te pertenece" }, { status: 404 });
        if (!session.repairId) {
            return Response.json({ error: "Este chat anterior no está vinculado a una reparación. Creá uno nuevo." }, { status: 409 });
        }
        const repair = await getAuthorizedCerebroRepair(user, session.repairId);
        if (!repair) {
            return Response.json({ error: "La reparación fue finalizada o reasignada; el chat queda en modo lectura" }, { status: 403 });
        }

        const identity = normalizeDeviceIdentity(repair.deviceBrand, repair.deviceModel);
        const { brand, model } = identity;
        const query = diagnosticQuery(parsed.data);
        if (!query.text && query.images.length === 0) {
            return Response.json({ error: "Describí el síntoma o adjuntá una imagen" }, { status: 400 });
        }

        const previousMessages = await cerebroChatRepository.listMessages(user.id, session.id);
        const pendingQuestion = previousMessages.findLast((message) => message.metadata.guidedQuestion)
            ?.metadata.guidedQuestion ?? null;
        const guidedOption = validateGuidedAnswer(pendingQuestion, parsed.data.guidedAnswer);
        const searchText = buildTechnicalSearchQuery({
            brand,
            model,
            problem: repair.problemDescription,
            latestText: query.text || "Inspección visual",
            observations: [
                ...repair.observations,
                ...(guidedOption ? [guidedOption.label] : []),
            ],
        });
        const embedding = await requestQueryEmbedding(searchText);
        const evidence = await retrieveCerebroSources({
            brand,
            model,
            modelAliases: deviceModelAliases(identity),
            modelFamily: identity.modelFamily,
            text: searchText,
            embedding,
            componentCodes: componentCodes(searchText),
            subsystemTerms: diagnosticSubsystemTerms(searchText),
            excludeRepairTicket: repair.ticketNumber,
            limit: 8,
        });
        const publicSources = toPublicSources(evidence);
        await cerebroChatRepository.appendMessage({
            userId: user.id,
            sessionId: session.id,
            clientMessageId: parsed.data.clientMessageId,
            role: "user",
            content: query.text,
            attachments: query.images,
            sources: [],
            promptVersion: null,
            provider: null,
            metadata: guidedOption && parsed.data.guidedAnswer ? {
                guidedAnswer: {
                    ...parsed.data.guidedAnswer,
                    observation: guidedOption.observation,
                },
            } : {},
        });
        const title = session.title === "Nuevo diagnóstico" ? searchText.slice(0, 80) : undefined;
        await cerebroChatRepository.touchSession(user.id, session.id, title);

        const guidedQuestion = buildGuidedQuestion({
            repairProblem: repair.problemDescription,
            latestText: query.text,
            evidenceDocumentIds: publicSources.map((source) => source.documentId),
        });
        const visualEvidence = await loadVisualEvidence(evidence);
        const modelMessages = toModelMessages(parsed.data.messages);
        if (visualEvidence.length > 0) {
            modelMessages.push({
                role: "user",
                content: [
                    { type: "text", text: "Inspeccioná estas páginas citadas del schematic. Identificá únicamente conectores, componentes, nets, test points y ramas de decisión realmente visibles; usalas para conectar el síntoma con el circuito y no inventes etiquetas ilegibles." },
                    ...visualEvidence.map((image) => ({ type: "image" as const, image })),
                ],
            });
        }

        let selectedProvider: ProviderSelection = { label: "Pendiente", keyId: "pending" };
        const result = await generateText({
            model: buildModel((provider) => { selectedProvider = provider; }, query.images.length > 0 || visualEvidence.length > 0),
            system: buildCerebroSystemPrompt(brand, model, evidence, {
                ticketNumber: repair.ticketNumber,
                problem: repair.problemDescription,
                diagnosis: repair.diagnosis ?? repair.diagnosisEnriched,
                observations: repair.observations,
                isWet: repair.isWet,
                isWarranty: repair.isWarranty,
            }),
            messages: modelMessages,
            temperature: 0.2,
            maxOutputTokens: 1_600,
            maxRetries: 0,
        });
        const groundedText = ensureObservedFacts(
            suppressUnsupportedMeasurements(
                result.text,
                evidence.map((source) => source.content),
            ),
            {
                device: `${brand} ${model}`,
                sellerProblem: repair.problemDescription,
                technicianInput: query.text || "Inspección visual adjunta",
            },
        );
        await cerebroChatRepository.appendMessage({
            userId: user.id,
            sessionId: session.id,
            clientMessageId: `${parsed.data.clientMessageId}:assistant`,
            role: "assistant",
            content: groundedText,
            attachments: [],
            sources: publicSources,
            promptVersion: CEREBRO_PROMPT_VERSION,
            provider: `${selectedProvider.keyId}:${selectedProvider.label}`,
            metadata: guidedQuestion ? { guidedQuestion } : {},
        });
        const responseMetadata: CerebroMessageMetadata = {
            promptVersion: CEREBRO_PROMPT_VERSION,
            provider: selectedProvider.keyId,
            sources: publicSources,
            ...(guidedQuestion ? { guidedQuestion } : {}),
        };
        return groundedUiResponse(`${parsed.data.clientMessageId}:assistant`, groundedText, responseMetadata);
    } catch (error) {
        console.error("[cerebro-v2/chat] Error:", error instanceof Error ? error.message : "unknown error");
        return Response.json({ error: "Cerebro no pudo completar el diagnóstico" }, { status: 503 });
    }
}
