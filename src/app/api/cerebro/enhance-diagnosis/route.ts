import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/actions/auth-actions";
import { runWithGroqFallback } from "@/lib/groq";
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
        const { text } = await runWithGroqFallback((groq) => generateText({
            model: groq("llama-3.3-70b-versatile"),
            system: REPAIR_DIAGNOSIS_ENHANCEMENT_SYSTEM_PROMPT,
            prompt,
            temperature: 0,
            maxOutputTokens: 500,
        }));

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
                source: "groq",
                model: "llama-3.3-70b",
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
