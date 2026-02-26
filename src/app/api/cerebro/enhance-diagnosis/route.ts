import { NextRequest, NextResponse } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { ENHANCE_DIAGNOSIS_SYSTEM_PROMPT } from "@/config/ai-models";

/**
 * CEREBRO — Mejorar Diagnóstico (Veloce Edition)
 * 
 * Utiliza GROQ + Llama 3.3 para una respuesta instantánea y técnica.
 */

import { runWithGroqFallback } from "@/lib/groq";

export async function POST(req: NextRequest) {
    try {
        const { diagnosis, deviceBrand, deviceModel, problemDescription } = await req.json();

        if (!diagnosis?.trim()) {
            return NextResponse.json({ error: "El diagnóstico está vacío." }, { status: 400 });
        }

        const prompt = `
${ENHANCE_DIAGNOSIS_SYSTEM_PROMPT}

CONTEXTO DEL EQUIPO:
- Marca/Modelo: ${deviceBrand || "Genérico"} ${deviceModel || ""}
- Falla reportada: ${problemDescription || "No especificada"}

TEXTO DEL TÉCNICO A PROFESIONALIZAR:
"${diagnosis.trim()}"

RECUERDA: Solo responde con el texto profesionalizado. No agregues saludos ni explicaciones.
`;

        const { text } = await runWithGroqFallback((groq) => generateText({
            model: groq("llama-3.3-70b-versatile"),
            prompt: prompt,
            temperature: 0.3,
            maxOutputTokens: 500,
        }));

        if (text) {
            return NextResponse.json({
                improved: text.trim(),
                source: "groq",
                model: "llama-3.3-70b"
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
