import { NextRequest, NextResponse } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

/**
 * CEREBRO — Generar Resumen Wiki
 * 
 * Convierte el historial de chat en un reporte técnico estructurado para la Wiki.
 */

import { runWithGroqFallback } from "@/lib/groq";

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: "No hay mensajes para resumir." }, { status: 400 });
        }

        // Formatear mensajes para el prompt
        const conversationText = messages.map((m: any) => {
            const role = m.role === 'user' ? 'TÉCNICO' : 'CEREBRO (IA)';
            const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
            return `[${role}]: ${content}`;
        }).join("\n\n");

        const systemPrompt = `Eres un experto en documentación técnica de microelectrónica. Tu tarea es resumir una conversación de soporte técnico entre un técnico de reparaciones y una IA para crear una entrada de wiki técnica IMPECABLE.

Debes extraer y estructurar la información siguiendo este formato EXACTO:

TÍTULO: [Un título conciso pero técnico de la falla]
MARCA: [Solo el nombre de la marca]
MODELO: [Solo el modelo específico]
RESOLUCIÓN: [Pasos detallados de la solución, mediciones clave y componentes reemplazados. Usa un tono profesional.]

REGLAS CRÍTICAS:
- Si el chat no menciona explícitamente la solución final, asume que la última propuesta técnica de Cerebro fue la correcta.
- NO incluyas introducciones, saludos ni conclusiones. Solo el formato estructurado.
- Ignora charlas irrelevantes o comentarios casuales.
- Usa lenguaje técnico (ej: "línea PP_VCC_MAIN", "consumo en escala de mA", "reballing de IC de carga").`;

        const { text } = await runWithGroqFallback((groq) => generateText({
            model: groq("llama-3.1-8b-instant"), // Usamos 8b para que sea ultra rápido el resumen
            system: systemPrompt,
            prompt: `HISTORIAL DE LA CONVERSACIÓN:\n\n${conversationText}\n\nRESUMEN TÉCNICO ESTRUCTURADO:`,
            temperature: 0.1,
        }));

        if (text) {
            return NextResponse.json({ summary: text.trim() });
        }

        return NextResponse.json({ error: "No se pudo generar el resumen." }, { status: 500 });

    } catch (error) {
        console.error("[cerebro/summarize] Error:", error);
        return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }
}
