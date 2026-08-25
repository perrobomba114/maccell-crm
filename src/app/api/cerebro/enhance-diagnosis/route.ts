import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, type LanguageModel } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/actions/auth-actions";
import { createFallbackModel, type FallbackModelConfig } from "@/lib/cerebro/models";
import { createLocalCerebroModel } from "@/lib/cerebro-v2/local-provider";
import { buildGroqModelConfigurations } from "@/lib/cerebro-v2/model-routing";
import { getGroqKeys } from "@/lib/groq";
import {
    buildRepairDiagnosisPrompt,
    REPAIR_DIAGNOSIS_ENHANCEMENT_SYSTEM_PROMPT,
    validateEnhancedDiagnosis,
} from "@/lib/repair-diagnosis-enhancement";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
    diagnosis: z.string().trim().min(1),
    deviceBrand: z.string().nullish(),
    deviceModel: z.string().nullish(),
    problemDescription: z.string().nullish(),
});

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const parsed = requestSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "El diagnóstico está vacío o es inválido." },
                { status: 400 },
            );
        }

        const { diagnosis } = parsed.data;
        const prompt = buildRepairDiagnosisPrompt(parsed.data);
        const configurations: FallbackModelConfig[] = buildGroqModelConfigurations(getGroqKeys(), "diagnosis");
        const localModel = createLocalCerebroModel(false);
        if (localModel) {
            configurations.push({
                instance: localModel,
                label: "Qwen local",
                keyId: "local",
                modelId: process.env.CEREBRO_LOCAL_AI_MODEL ?? "Qwen local",
            });
        }
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        if (openRouterKey) {
            const openRouter = createOpenRouter({ apiKey: openRouterKey });
            configurations.push({
                instance: openRouter(process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash"),
                label: "OpenRouter",
                keyId: "openrouter",
                modelId: process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash",
            });
        }
        const emperoBaseUrl = process.env.CEREBRO_EMPERO_BASE_URL;
        const emperoKey = process.env.CEREBRO_EMPERO_API_KEY;
        const emperoModel = process.env.CEREBRO_EMPERO_MODEL ?? "Qwen/Qwen3.8-27B-FP8";
        if (emperoBaseUrl && emperoKey) {
            const empero = createOpenAI({ baseURL: emperoBaseUrl, apiKey: emperoKey });
            configurations.push({
                instance: empero.chat(emperoModel),
                label: "Empero Qwen",
                keyId: "empero",
                modelId: emperoModel,
            });
        }
        if (configurations.length === 0) {
            return NextResponse.json({
                error: "No se pudo profesionalizar el diagnóstico en este momento.",
                modelUnavailable: true,
            }, { status: 503 });
        }
        const selection: { current: FallbackModelConfig | null } = { current: null };
        const { text } = await generateText({
            model: createFallbackModel(configurations, (selected) => { selection.current = selected; }) as unknown as LanguageModel,
            system: REPAIR_DIAGNOSIS_ENHANCEMENT_SYSTEM_PROMPT,
            prompt,
            temperature: 0,
            maxOutputTokens: 500,
            maxRetries: 0,
        });

        if (text) {
            const improved = text.trim();
            const validation = validateEnhancedDiagnosis(diagnosis, improved);
            if (!validation.ok) {
                return NextResponse.json({
                    error: "La IA intentó agregar un trabajo que no figura en tu informe. Conservamos el texto original para que lo revises.",
                    coherenceViolation: true,
                }, { status: 422 });
            }

            return NextResponse.json({
                improved,
                source: selection.current?.keyId.startsWith("groq-")
                    ? "groq"
                    : selection.current?.keyId ?? "unknown",
                model: selection.current?.modelId ?? selection.current?.label ?? "Qwen",
            });
        }

        return NextResponse.json({
            error: "No se pudo profesionalizar el diagnóstico en este momento.",
            modelUnavailable: true,
        }, { status: 503 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "unknown error";
        console.error("[cerebro/enhance-diagnosis] Error:", message);
        return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }
}
