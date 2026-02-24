import { NextRequest, NextResponse } from "next/server";
import { AI_MODELS, ENHANCE_DIAGNOSIS_SYSTEM_PROMPT } from "@/config/ai-models";

/**
 * CEREBRO — Mejorar Diagnóstico (Cloud Edition)
 *
 * Utiliza exclusivamente OpenRouter con Gemini 2.0 Flash.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter(userMessage: string): Promise<string | null> {
    if (!OPENROUTER_API_KEY) return null;

    const model = process.env.OPENROUTER_MODEL || AI_MODELS.CHAT;

    try {
        const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://sistema.maccell.com.ar",
                "X-Title": "Maccell CRM Cerebro",
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: userMessage }],
                max_tokens: 600,
                temperature: 0.3,
            }),
            signal: AbortSignal.timeout(25000),
        });

        if (!res.ok) return null;

        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
        console.error("[CEREBRO_ENHANCE] Error calling OpenRouter:", error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { diagnosis, deviceBrand, deviceModel, problemDescription } = await req.json();

        if (!diagnosis?.trim()) {
            return NextResponse.json({ error: "El diagnóstico está vacío." }, { status: 400 });
        }

        const userMessage = [
            ENHANCE_DIAGNOSIS_SYSTEM_PROMPT,
            "",
            "--- CONTEXTO ---",
            `Equipo: ${deviceBrand || "Desconocido"} ${deviceModel || ""}`.trim(),
            problemDescription ? `Falla inicial: "${problemDescription}"` : null,
            "",
            "--- TEXTO DEL TÉCNICO A PROFESIONALIZAR ---",
            `"${diagnosis.trim()}"`,
        ].filter(Boolean).join("\n");

        const result = await callOpenRouter(userMessage);

        if (result) {
            return NextResponse.json({
                improved: result,
                source: "openrouter",
                model: AI_MODELS.CHAT
            });
        }

        return NextResponse.json({
            error: "No se pudo profesionalizar el diagnóstico en este momento.",
            modelUnavailable: true,
        }, { status: 503 });

    } catch (error) {
        console.error("[cerebro/enhance-diagnosis] Error:", error);
        return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }
}
