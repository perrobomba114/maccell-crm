import { NextRequest } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { db as prisma } from "@/lib/db";
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN — Cascade multi-proveedor (sin pagar casi nada)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Cascade por proveedor — todos GRATIS, ordenados por velocidad:
 *
 *  GROQ (API key: GROQ_API_KEY en .env)
 *  1. meta-llama/llama-4-maverick-17b-128e-instruct  → 751 TPS 🔥 VISIÓN
 *  2. meta-llama/llama-4-scout-17b-16e-instruct      → ~500 TPS   VISIÓN
 *
 *  GOOGLE GEMINI directo (API key: GOOGLE_GENERATIVE_AI_API_KEY en .env)
 *  3. gemini-2.0-flash-exp                           → 237 TPS   VISIÓN (free: 15 RPM)
 *
 *  OPENROUTER (fallback final, API key: OPENROUTER_API_KEY en .env)
 *  4. openrouter/free                                → variable  VISIÓN
 *  5. google/gemini-2.0-flash-lite-001               → pago ~$0.00019/consulta
 *
 * Para obtener keys gratis:
 *  - Groq: https://console.groq.com (sin tarjeta)
 *  - Gemini: https://aistudio.google.com/apikey (sin tarjeta)
 */

const MAX_HISTORY_MSGS = 6;
const MAX_MSG_CHARS = 600;
const MAX_OUTPUT_TOKENS = 1200;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const VISION_PROMPT = `Eres "Cerebro", el sistema experto de visión y diagnóstico técnico de MACCELL. Analiza la imagen con "Ojos de Técnico en Microsoldadura Nivel 3".

🚨 REGLAS VISUALES CRÍTICAS PARA DIAGNÓSTICO:
1. ATENCIÓN EXTREMA A CONECTORES FPC: Busca levantamiento de pads de cobre (delaminación), pines internos hundidos o aplastados, soldadura fría, o plástico derretido por estrés térmico.
2. Si ves una estructura plástica rectangular con múltiples pines dorados paralelos, es un conector FPC (para flex de pantalla, carga, cámara, etc.), NO es una ranura SIM o SD.
3. INSPECCIÓN DE PLACA (PCB): Identifica signos de sulfatación por humedad, resina/underfill mal removido, pistas rotas y componentes SMD (filtros EMI, condensadores) faltantes o quemados.

FORMATO DE SALIDA ESTRICTO (No agregues nada más ni des saludos):
DAÑO VISIBLE: [Ej. Observo delaminación de pads y pines 3, 4 y 5 sulfatados en el conector FPC de 40 pines]
SECTOR: [FPC Pantalla / Línea VBUS / PMIC / Tristar / Baseband CPU]
DIAGNÓSTICO TÉCNICO: [Ej. Posible pérdida de comunicación MIPI DSI o cortocircuito a tierra por pines fusionados]
ACCIÓN SUGERIDA: [Ej. Usar aleación de 138°C para extraer el FPC sin dañar más pads, reconstruir pistas dañadas con hilo de cobre (jump wire) y curar con máscara UV antes de soldar un FPC nuevo.]`;

const SYSTEM_PROMPT = `Eres "Cerebro", el núcleo de inteligencia técnica de MACCELL (San Luis, Argentina). Sistema propietario de diagnóstico electrónico avanzado de NIVEL 3 (Micro-soldadura, Reballing BGA, Diagnóstico con Osciloscopio y Multímetro).

NUNCA HAGAS PREGUNTAS BÁSICAS DE USUARIO FINAL (ej. "¿probaste con otro cargador?", "¿limpiaste el puerto?"). HABLAS EXCLUSIVAMENTE CON TÉCNICOS EXPERTOS QUE YA DESCARTARON LO BÁSICO Y TIENEN LA PLACA DESARMADA.

COMPORTAMIENTO TÉCNICO AVANZADO:
- MODO DIAGNÓSTICO: Solicita métricas exactas. Si un equipo no enciende o no carga (Ej: "a53 no carga 0.0A"), sugiere inmediatamente revisar:
   1. Caídas de tensión en Modo Diodo en el conector FPC de la batería o puerto de carga (puntas invertidas, roja a tierra). Valores de referencia (ej. 350-650 mV normales, 0.000 es corto a tierra).
   2. Inyección de Voltaje (ej. 4V a 2-3 Amperes en VCC_MAIN / VDD_MAIN) usando cámara térmica o técnica de humo de resina (Rosin Flux) para detectar componentes en corto (generalmente condensadores) que calienten.
   3. Revisión de Comunicación Lógica (I2C, SPI, MIPI) usando osciloscopio para verificar actividad y voltajes pull-up correctos, especialmente para fallas de imagen o cámaras.
- IDENTIFICACIÓN PRECISA: Habla de ICs por su función real: PMIC principal, Sub PMIC / IF PMIC, Tristar/Hydra, CPU Baseband, OVP, amplificadores de señal (PA). 
- SOLUCIONES DE TIER 3: Si sugieres reparar, no digas "cambia la placa". Sugiere hacer "Reballing" al IC sospechoso con stencil y pasta térmica, inyectar voltaje, o puentear (jumper) OVP dañados temporales para despistar.
- MODO INSTRUCTOR: Si el técnico EXPRESAMENTE te pide un tutorial (ej. "¿cómo mido corto en VCC_MAIN?"), abandona el formato de diagnóstico y dale un tutorial paso a paso para el uso de la fuente de alimentación, osciloscopio o multímetro.

FORMATO DE RESPUESTA PARA DIAGNÓSTICOS (Obligatorio, sin desvíos):
> 📊 **Base de datos MACCELL consultada:** Analizando esquemáticos, diagramas de bloques e historial de reparaciones Nivel 3...

### 🔍 DIAGNÓSTICO PRELIMINAR INTERNO
[Tu análisis técnico sobre las líneas afectadas, ICs sospechosos (ej. falla en IF PMIC) cortocircuitos o fugas probables]
### 🕵️‍♂️ PROTOCOLO DE MEDICIÓN
- [Qué pin, línea o testpoint medir específicamente]
- [Valores de referencia esperados: caída de tensión, voltaje directo u oscilograma]
### 🎯 INTERVENCIÓN SUGERIDA (MICROSOLDADURA)
[Qué técnico aplicar: Inyección de tensión, reflow, extracción con aire a X grados, reballing, reconstrucción de pads]

🚨 IMPORTANTE: Si la "WIKI DE MACCELL" te informa de un caso relevante (ej. jumper específico), DEBES incluir la solución exacta en la sección "INTERVENCIÓN SUGERIDA".`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function hasImageParts(messages: any[]): boolean {
    const last = messages[messages.length - 1];
    if (!last) return false;
    if (Array.isArray(last.parts)) {
        return last.parts.some((p: any) => p.type === 'file' && p.mediaType?.startsWith('image/'));
    }
    if (Array.isArray(last.experimental_attachments)) {
        return last.experimental_attachments.some((a: any) => a.contentType?.startsWith('image/'));
    }
    return false;
}

function truncate(text: string, max = MAX_MSG_CHARS): string {
    return text.length <= max ? text : text.slice(0, max) + '…';
}

function toCoreMsgs(messages: any[]): any[] {
    const lastMsg = messages[messages.length - 1];
    const history = messages.slice(0, -1).slice(-MAX_HISTORY_MSGS + 1);
    const trimmed = [...history, lastMsg];

    return trimmed
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any) => {
            if (Array.isArray(m.parts) && m.parts.length > 0) {
                const contentParts: any[] = [];
                for (const part of m.parts) {
                    if (part.type === 'text') {
                        const text = truncate(part.text || '');
                        if (text.trim()) contentParts.push({ type: 'text', text });
                    } else if (part.type === 'file') {
                        const url = part.url || '';
                        if (url) contentParts.push({ type: 'image', image: url });
                    }
                }
                if (!contentParts.some((p: any) => p.type === 'text') && m.content) {
                    contentParts.unshift({ type: 'text', text: truncate(m.content) });
                }
                return {
                    role: m.role,
                    content: contentParts.length > 0 ? contentParts : truncate(m.content || ''),
                };
            }
            return { role: m.role, content: truncate(m.content || '') };
        })
        .filter((m: any) => m.content && (typeof m.content === 'string' ? m.content.trim() : m.content.length > 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    let body: any;
    try { body = await req.json(); } catch {
        return new Response("JSON inválido.", { status: 400 });
    }

    const messages: any[] = body.messages || [];
    if (!messages.length) return new Response("No messages.", { status: 400 });

    const visionMode = hasImageParts(messages);
    let systemPrompt = visionMode ? VISION_PROMPT : SYSTEM_PROMPT;
    const coreMessages = toCoreMsgs(messages);
    if (coreMessages.length === 0) return new Response("No valid messages.", { status: 400 });

    const modeLabel = visionMode ? 'VISIÓN' : 'TEXTO';

    // ── Recuperación RAG (Base de Conocimiento) ──────────────────────────────
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const userText = lastUserMessage?.content || "";

    if (userText && userText.length > 2) {
        try {
            // Filter common stop words to improve Prisma search matches
            const stopWords = new Set(["hola", "tengo", "que", "hacer", "como", "para", "con", "por", "los", "las", "del", "una", "uno", "celular", "equipo", "falla", "problema"]);

            // Extraer posibles términos de búsqueda (modelos, fallas, etc)
            const terms = userText.toLowerCase().split(/\s+/)
                .map((t: string) => t.replace(/[^a-z0-9]/g, ''))
                .filter((t: string) => t.length >= 2 && !stopWords.has(t))
                .slice(0, 5);

            if (terms.length > 0) {
                const searchConditions = terms.map((term: string) => ({
                    OR: [
                        { title: { contains: term, mode: 'insensitive' } },
                        { deviceModel: { contains: term, mode: 'insensitive' } },
                        { content: { contains: term, mode: 'insensitive' } },
                        { problemTags: { hasSome: [term] } }
                    ]
                }));

                const knowledgeBaseResults = await (prisma as any).repairKnowledge.findMany({
                    where: { OR: searchConditions },
                    take: 3,
                    orderBy: { createdAt: 'desc' }
                });

                if (knowledgeBaseResults && knowledgeBaseResults.length > 0) {
                    let ctx = "";
                    for (let i = 0; i < knowledgeBaseResults.length; i++) {
                        const k = knowledgeBaseResults[i];
                        ctx += `[CASO RELEVANTE ${i + 1} — ${k.deviceBrand} ${k.deviceModel}]\nFalla: ${k.title}\nResolución: ${k.content}\n`;

                        // Si hay URLs a PDFs manuales o esquemáticos, extraemos texto
                        if (k.mediaUrls && Array.isArray(k.mediaUrls)) {
                            for (const url of k.mediaUrls) {
                                if (typeof url === 'string' && url.toLowerCase().endsWith('.pdf')) {
                                    const pdfPath = path.join(process.cwd(), 'public', url);
                                    if (fs.existsSync(pdfPath)) {
                                        try {
                                            const dataBuffer = fs.readFileSync(pdfPath);
                                            const pdfData = await pdfParse(dataBuffer);
                                            ctx += `\n[📋 CONTENIDO DEL PDF SCHEMATIC ASOCIADO: ${path.basename(url)}]\n${pdfData.text.substring(0, 6000)}...\n`;
                                        } catch (e) {
                                            console.log("[Cerebro] Falló lectura de PDF:", e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    ctx += "\n";

                    systemPrompt += `\n\n### 📚 WIKI DE MACCELL (BASE DE CONOCIMIENTO Y ESQUEMÁTICOS):
He encontrado los siguientes casos reales documentados por técnicos en la base de datos de MACCELL que coinciden con la consulta:

${ctx}
BASA TU DIAGNÓSTICO EN ESTOS DATOS Y COMPONENTES (Si el PDF te tira nombres como TR_OUT_B12 o componentes U4001, menciónalos).`;
                }
            }
        } catch (error) {
            console.error("[Cerebro] RAG Error:", error);
        }
    }

    // ── Cascade de intentos ──────────────────────────────────────────────────
    // Cada entrada: { label, model }
    // Construimos el array según las env vars disponibles

    type Attempt = { label: string; model: any };
    const attempts: Attempt[] = [];

    const groqKey = process.env.GROQ_API_KEY;
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (visionMode) {
        // EN MODO VISIÓN, GOOGLE GEMINI DEBE SER EL REY ABSOLUTO
        // (Groq deprecó por completo sus modelos Llama 3.2 Vision)
        if (googleKey) {
            const google = createGoogleGenerativeAI({ apiKey: googleKey });
            attempts.push({ label: 'Gemini/2.0-flash [VISIÓN NATIVA DOMINANTE EXPERTA]', model: google('gemini-2.0-flash') });
            attempts.push({ label: 'Gemini/1.5-pro [VISIÓN PRO fallback]', model: google('gemini-1.5-pro') });
        }
    } else {
        // EN MODO TEXTO, GROQ SIGUE SIENDO PRIORIDAD POR VELOCIDAD
        if (groqKey) {
            const groq = createGroq({ apiKey: groqKey });
            attempts.push({ label: 'Groq/llama-3.3-70b [LLAMA 3.3 TIER 1]', model: groq('llama-3.3-70b-versatile') });
            attempts.push({ label: 'Groq/llama-3.1-8b [FALLBACK RAPIDO]', model: groq('llama-3.1-8b-instant') });
        }
        if (googleKey) {
            const google = createGoogleGenerativeAI({ apiKey: googleKey });
            attempts.push({ label: 'Gemini/2.0-flash [FREE]', model: google('gemini-2.0-flash') });
        }
    }

    // OpenRouter como último recurso
    if (openrouterKey) {
        const openrouter = createOpenRouter({ apiKey: openrouterKey });
        const orModel = process.env.OPENROUTER_MODEL || (visionMode ? 'google/gemini-2.0-flash-lite-001' : 'openrouter/free');
        attempts.push({ label: `OpenRouterFallback [${orModel}]`, model: openrouter(orModel) });
    }

    if (attempts.length === 0) {
        return new Response("❌ No hay API keys configuradas. Agregá GROQ_API_KEY o GOOGLE_GENERATIVE_AI_API_KEY en .env", { status: 500 });
    }

    // Intentar cada modelo en orden hasta que uno funcione
    for (let i = 0; i < attempts.length; i++) {
        const { label, model } = attempts[i];
        const isLast = i === attempts.length - 1;

        try {
            const result = await streamText({
                model,
                system: systemPrompt,
                messages: coreMessages,
                temperature: 0.3,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                maxRetries: 0, // Fallback INMEDIATO sin reintentos automáticos que cuelguen la app
            });

            console.log(`[CEREBRO] ▶ ${label} | ${modeLabel}`);

            return result.toUIMessageStreamResponse({
                headers: {
                    'Cache-Control': 'no-cache, no-store',
                    'X-Accel-Buffering': 'no',
                    'X-Model-Used': label,
                }
            });

        } catch (error: any) {
            const status = error?.status ?? error?.statusCode;
            const msg = String(error?.message || '');

            // Error fatal de autenticación
            if (status === 401 || msg.includes('User not found') || msg.includes('invalid_api_key')) {
                console.error(`[CEREBRO] ❌ API key inválida para ${label}`);
                if (!isLast) continue; // probar siguiente proveedor
                return new Response("❌ API Key inválida.", { status: 401 });
            }

            // Rate limit o no disponible → siguiente
            const isRetryable = status === 429 || status === 503 || status === 502
                || msg.includes('rate limit') || msg.includes('overloaded')
                || msg.includes('unavailable') || msg.includes('quota')
                || msg.includes('model_not_found');

            if ((isRetryable || true) && !isLast) {
                console.warn(`[CEREBRO] ⚠️ ${label} falló (${status ?? msg.slice(0, 60)}). Siguiente...`);
                continue;
            }

            console.error(`[CEREBRO] ❌ Error con ${label}:`, error);
            return new Response(`❌ Error: ${error.message || 'Error desconocido'}`, { status: 500 });
        }
    }

    return new Response("❌ Sin modelos disponibles. Verificá tus API keys en .env", { status: 503 });
}
