import { NextRequest, NextResponse } from "next/server";
import { OLLAMA_MODELS, ENHANCE_DIAGNOSIS_SYSTEM_PROMPT } from "@/config/ai-models";

/**
 * CEREBRO — Mejorar Diagnóstico
 *
 * Estrategia:
 * 1. Intenta con Ollama local (RTX 3090 vía Tailscale) → $0.00, sin rate limit
 * 2. Si Ollama no está disponible → cae a OpenRouter :free (Venice, $0.00/token)
 *
 * Ollama usa la API compatible con OpenAI (/v1/chat/completions)
 */

const OLLAMA_URL = process.env.OLLAMA_BASE_URL; // http://100.110.53.47:11434
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const RETRY_DELAY_MS = 4000;

function sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

async function callOllama(userMessage: string): Promise<string | null> {
    if (!OLLAMA_URL) return null;

    try {
        const res = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODELS.ENHANCER,
                messages: [{ role: "user", content: userMessage }],
                max_tokens: 600,
                temperature: 0.3,
                stream: false,
            }),
            signal: AbortSignal.timeout(30000), // 30s — la primera llamada en frío puede tardar
        });

        if (!res.ok) return null;

        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
    } catch {
        return null; // Ollama no disponible → cae a OpenRouter
    }
}

async function callOpenRouter(userMessage: string): Promise<string | null> {
    if (!OPENROUTER_API_KEY) return null;

    const models = ["venice-ai/venice-uncensored:free", "meta-llama/llama-3.1-8b-instruct:free"];
    const maxRetries = 2;

    for (const model of models) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) await sleep(RETRY_DELAY_MS);
            try {
                const res = await fetch(OPENROUTER_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
                        "X-Title": "MACCELL Cerebro",
                    },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: "user", content: userMessage }],
                        max_tokens: 600,
                        temperature: 0.3,
                    }),
                    signal: AbortSignal.timeout(25000),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    if (res.status === 402) return null; // sin créditos → detener
                    if (res.status !== 429) break; // error distinto → siguiente modelo
                    continue; // 429 → reintentar
                }

                const data = await res.json();
                const content = data.choices?.[0]?.message?.content?.trim();
                if (content) return content;
                break;

            } catch {
                break;
            }
        }
    }
    return null;
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
            "--- CONTEXTO (Solo para que entiendas la situación. ESTÁ PROHIBIDO REPETIR ESTO EN TU RESPUESTA) ---",
            `Equipo: ${deviceBrand || "Desconocido"} ${deviceModel || ""}`.trim(),
            problemDescription ? `Falla inicial: "${problemDescription}"` : null,
            "",
            "--- TEXTO DEL TÉCNICO A PROFESIONALIZAR ---",
            `"${diagnosis.trim()}"`,
        ].filter(Boolean).join("\n");

        // 1. Intentar Ollama local primero (gratis, instantáneo, sin límites)
        const ollamaResult = await callOllama(userMessage);
        if (ollamaResult) {
            return NextResponse.json({
                improved: ollamaResult,
                modelUsed: `ollama:${OLLAMA_MODELS.ENHANCER}`,
                source: "local",
            });
        }

        // 2. Fallback a OpenRouter :free si Ollama no está disponible
        const openrouterResult = await callOpenRouter(userMessage);
        if (openrouterResult) {
            return NextResponse.json({
                improved: openrouterResult,
                source: "openrouter",
            });
        }

        return NextResponse.json({
            error: "⚠️ No hay modelos de IA disponibles. Verificá que Ollama esté corriendo en la red, o esperá unos minutos si usás OpenRouter.",
            modelUnavailable: true,
        }, { status: 503 });

    } catch (error) {
        console.error("[cerebro/enhance-diagnosis] Error:", error);
        return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
    }
}
