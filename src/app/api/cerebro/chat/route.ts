import { NextRequest } from "next/server";
import { OLLAMA_MODELS } from "@/config/ai-models";
import { findSimilarRepairs, formatRAGContext } from "@/lib/cerebro-rag";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const VISION_PROMPT = `Sos un técnico de microsoldadura. Analizá esta imagen de placa electrónica.
Respondé SOLO con esto (máximo 5 líneas):
1. DAÑO VISIBLE: [describe exactamente lo que ves roto/quemado/sulfatado/faltante]
2. COMPONENTE: [tipo de componente y ubicación en la placa]
3. ACCIÓN: [qué hay que hacer para repararlo]
Si no podés ver daño claro, decí: "Imagen poco clara. Necesito más luz o acercamiento al área dañada."`;

const SYSTEM_PROMPT = `Eres "Cerebro", el sistema operativo de inteligencia técnica de MACCELL. Tu núcleo de conocimiento reside en San Luis, Argentina. No eres un asistente general; eres una herramienta de diagnóstico de precisión quirúrgica vinculada a una base de datos de tickets reales y esquemáticos vectorizados.

PROTOCOLO DE INTERACCIÓN CON LA BASE DE DATOS:
- Antes de responder, simula que consultas la base de datos de MACCELL buscando fallas similares por modelo y síntomas.
- Si el diagnóstico actual es exitoso, genera un bloque de "APRENDIZAJE PARA LA DB" al final para que el CRM indexe la solución.

REGLAS DE RESPUESTA (NIVEL SENIOR):
1. PROHIBICIÓN DE PROSA Y PENSAMIENTO CORTO: Prohibido usar saludos. MANTÉN TU BLOQUE <think> MUY BREVE (máximo 2 oraciones), no iterés infinitamente sobre el caso. Ve directo a la física y la electrónica.
2. ESTRUCTURA OBLIGATORIA (EXTENDIDA):

   ### 📂 REFERENCIA HISTÓRICA (Maccell DB)
   - [Si hay coincidencia]: "Se encontró coincidencia en Ticket #MACX-XXXX. Causa: [Causa]. Solución aplicada: [Solución]."
   - [Si no hay coincidencia]: "Falla nueva. Iniciando protocolo de diagnóstico desde cero."

   ### 🔍 ANÁLISIS DE CONSUMO Y PROTOCOLO DE ARRANQUE
   - Análisis detallado del estado del equipo basado en la fuente de poder. Diferencia entre consumos antes de Power (fugas) y después de Power (ciclo de encendido).

   ### 🛠️ MEDICIONES EN LÍNEA DE FUEGO (Escala de Diodo y Voltaje)
   - Lista detallada de puntos de prueba con designadores (U, C, L, R, Q).
   - Formato: [Línea] -> [Componente] -> [Valor Esperado (V o mV en Caída de Tensión)].

   ### 🎯 SOSPECHOSOS Y ACCIÓN DE MICROSOLDADURA
   - Diagnóstico final basado en probabilidades. Indica si requiere separación de sándwich (iPhone), Reballing de CPU/Memoria o reemplazo de IC (Hydra, Tristar, Tigris, PMIC).

   ### 📝 APRENDIZAJE PARA LA BASE DE DATOS (Indexing)
   - Genera un resumen en formato JSON para que el CRM lo guarde: {"modelo": "...", "falla": "...", "solucion_sugerida": "..."}

3. MANEJO DE DATOS INSUFICIENTES:
   Si el técnico no reporta mediciones, responde ÚNICAMENTE con la "TRIADA DE INGRESO MACCELL":
   1. Consumo en fuente (con y sin Power).
   2. Tensión de batería y estado de línea VBUS.
   3. Reconocimiento de puerto (¿Aparece en administrador de dispositivos/3uTools?).

4. TERMINOLOGÍA TÉCNICA REQUERIDA:
   - Usa "Caída de Tensión" (mV) para escala de diodo.
   - Usa "Línea en fuga" para consumos menores a 100mA.
   - Usa "Cortocircuito" para consumos máximos o caída de tensión 000.`;

// ─────────────────────────────────────────────────────────────────────────────
// VISION ROUTER — Clasificador previo ultrarrápido
// Usa llama3.2:1b para decidir si la imagen es una PCB antes de llamar a llava
// ─────────────────────────────────────────────────────────────────────────────

async function isElectronicBoard(base64Image: string): Promise<boolean> {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODELS.ROUTER,
                messages: [{
                    role: 'user',
                    content: 'Does this image show an electronic circuit board (PCB) with visible components like chips, capacitors, resistors or copper traces? Answer ONLY with YES or NO.',
                    images: [base64Image]
                }],
                stream: false,
                options: { temperature: 0, num_predict: 5 }
            })
        });
        if (!res.ok) return true; // Si el router falla, dejamos pasar al modelo principal
        const data = await res.json();
        const answer = (data.message?.content || '').toLowerCase().trim();
        console.log(`[CEREBRO_ROUTER] Clasificación: "${answer}"`);
        return answer.startsWith('yes') || answer.startsWith('sí') || answer.startsWith('si');
    } catch {
        return true; // Si hay error, dejamos pasar (fail open)
    }
}


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages } = body;

        console.log(`[CEREBRO] Recibidos ${messages.length} mensajes. Último:`, JSON.stringify(messages[messages.length - 1]).substring(0, 200));

        // 1. Mapear mensajes al formato NATIVO de Ollama
        const ollamaMessages = messages.map((m: any) => {
            // Extraer texto correctamente dependiendo del formato del SDK
            // El SDK puede enviar `content` (string) o `parts` (array)
            let textContent = "";
            const images: string[] = [];

            // Helper para limpiar el Base64 (Ollama sólo quiere el código puro)
            const extractBase64 = (url: string) => {
                if (url.startsWith('data:image')) {
                    return url.split(',')[1];
                }
                return null;
            };

            if (m.parts && Array.isArray(m.parts) && m.parts.length > 0) {
                // Formato moderno: partes estructuradas
                for (const part of m.parts) {
                    if (part.type === 'text') {
                        textContent += part.text || "";
                    } else if (part.type === 'file' && part.file) {
                        const fileData = part.file.url || (part.file.data ? `data:${part.file.type};base64,${part.file.data}` : '');
                        const b64 = extractBase64(fileData);
                        if (b64) images.push(b64);
                    }
                }
            }

            // Fallback: si el contenido de parts está vacío, usamos m.content
            if (!textContent && m.content && typeof m.content === 'string') {
                textContent = m.content;
            }

            if (m.experimental_attachments) {
                for (const att of m.experimental_attachments) {
                    if (att.url) {
                        const b64 = extractBase64(att.url);
                        if (b64) images.push(b64);
                    }
                }
            }

            return {
                role: m.role,
                content: textContent,
                images: images.length > 0 ? images : undefined
            };
        }).filter((m: any) => m.content || (m.images && m.images.length > 0)); // Descartar mensajes vacíos

        console.log(`[CEREBRO] Mapeados ${ollamaMessages.length} mensajes. Último texto: "${ollamaMessages[ollamaMessages.length - 1]?.content?.substring(0, 50)}"`);

        // 2. Truncar historial para evitar confusión (últimos 10 mensajes)
        const truncatedHistory = ollamaMessages.slice(-10);

        // 3. Detectar si el ÚLTIMO mensaje del usuario tiene imágenes para elegir el prompt
        const lastUserMessage = [...truncatedHistory].reverse().find((m: any) => m.role === 'user');
        const hasImagesInLastMessage = !!(lastUserMessage?.images && lastUserMessage.images.length > 0);

        let messagesForOllama: any[];

        if (hasImagesInLastMessage) {
            // 🔀 VISION ROUTER: Clasificar la imagen ANTES de llamar al modelo costoso
            const firstImage = lastUserMessage.images[0];
            const isPCB = await isElectronicBoard(firstImage);

            if (!isPCB) {
                // No es una PCB — devolver respuesta inmediata sin gastar tokens del modelo de visión
                const notPCBMsg = "⚠️ Imagen no técnica detectada. La foto no muestra una placa electrónica. Adjuntá una foto real de la placa del dispositivo para continuar el diagnóstico.";
                return new Response(
                    new ReadableStream({
                        start(c) { c.enqueue(new TextEncoder().encode(notPCBMsg)); c.close(); }
                    }),
                    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
                );
            }

            // Es una PCB — análisis completo con llava:13b
            const userText = lastUserMessage.content || '';
            const visionSystemContent = userText
                ? `${VISION_PROMPT}\n\nEl técnico indicó: "${userText}". Usá esa info como contexto.`
                : VISION_PROMPT;
            messagesForOllama = [
                { role: 'system', content: visionSystemContent },
                { role: 'user', content: userText || 'Analizá el daño visible en la placa.', images: lastUserMessage.images }
            ];
        } else {
            // Para texto: RAG + historial completo
            // Buscar casos similares en la base de datos de MACCELL (en paralelo para no agregar latencia)
            const userQuery = lastUserMessage?.content || '';
            let ragContext = '';
            if (userQuery.length > 10) {
                const similarRepairs = await findSimilarRepairs(userQuery, 3, 0.72);
                ragContext = formatRAGContext(similarRepairs);
                if (ragContext) {
                    console.log(`[CEREBRO_RAG] ${similarRepairs.length} casos similares inyectados en el contexto`);
                }
            }

            const systemWithRAG = ragContext
                ? SYSTEM_PROMPT + ragContext
                : SYSTEM_PROMPT;

            truncatedHistory.unshift({ role: 'system', content: systemWithRAG });
            messagesForOllama = truncatedHistory;
        }

        const modelToUse = hasImagesInLastMessage ? OLLAMA_MODELS.VISION : OLLAMA_MODELS.CHAT;
        console.log(`[CEREBRO] Modelo=${modelToUse} | Modo=${hasImagesInLastMessage ? 'VISION + ROUTER ✅' : 'TEXTO (deepseek-r1)'} | Msgs=${messagesForOllama.length}`);

        const geminiKey = req.cookies.get('geminiKey')?.value;
        const openrouterKey = req.cookies.get('openrouterKey')?.value;

        // 4. Modo OpenRouter o Google Cloud (Nube)
        if (openrouterKey || geminiKey) {
            console.log(`[CEREBRO] Ruteando hacia LA NUBE - Bypass de Ollama local.`);

            let modelProvider;
            let modelName = 'liquid/lfm-40b:free'; // Default OpenRouter Free LLM

            if (openrouterKey) {
                console.log("[CEREBRO] Usando llave de OPENROUTER gratis");
                const openrouter = createOpenRouter({ apiKey: openrouterKey });
                modelProvider = openrouter;
                // Using a known free model if using free tier OpenRouter
                modelName = 'google/gemini-2.5-flash-lite-preview-02-05:free'; // free tier gemini inside openrouter
            } else if (geminiKey) {
                console.log("[CEREBRO] Usando llave local de GOOGLE GEMINI AI STUDIO");
                const google = createGoogleGenerativeAI({ apiKey: geminiKey });
                modelProvider = google;
                modelName = 'gemini-1.5-pro';
            }

            const coreMessages = messagesForOllama.map(m => {
                let content: any = m.content || "";

                if (m.images && m.images.length > 0 && m.role === 'user') {
                    content = [
                        { type: 'text', text: m.content || "Analiza esta placa electrónica." }
                    ];
                    m.images.forEach((b64: string) => {
                        content.push({ type: 'image', image: `data:image/jpeg;base64,${b64}` });
                    });
                }
                return { role: m.role, content };
            });

            // Usamos modelo online a través de Vercel AI SDK Standardized Object 
            try {
                const result = streamText({
                    model: modelProvider!(modelName),
                    messages: coreMessages as any,
                    temperature: 0.6,
                });

                const stream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const textPart of result.textStream) {
                                controller.enqueue(new TextEncoder().encode(textPart));
                            }
                        } catch (e: any) {
                            console.error("[CLOUD_API] Stream error:", e);
                            controller.enqueue(new TextEncoder().encode(`\n[Error de Cloud API: ${e.message}]`));
                        } finally {
                            controller.close();
                        }
                    }
                });

                return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
            } catch (error: any) {
                console.error("[CEREBRO NUBE] Fallo ruteo a api:", error);
                return new Response(`[Error fatal del servidor enrutador: ${error.message}]`, { status: 500 })
            }
        }

        // 4. Petición manual a Ollama con soporte para Abort Signal (Modo Local Legacy)
        const controller = new AbortController();
        req.signal.addEventListener('abort', () => {
            console.log("[CEREBRO] Ollama stream aborted: Cliente canceló la petición.");
            controller.abort();
        });

        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                model: modelToUse,
                messages: messagesForOllama,
                stream: true,
                options: {
                    temperature: hasImagesInLastMessage ? 0 : 0.6, // deepseek-r1 requires 0.6 to avoid infinite thinking loops
                    num_predict: hasImagesInLastMessage ? 250 : 800, // Limitar tokens (800 es suficiente para el diagnóstico y limita el tiempo de pensamiento)
                    repeat_penalty: hasImagesInLastMessage ? 1.5 : 1.1
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        // 5. Adaptar el NDJSON de Ollama a un stream de texto plano (compatible con TextStreamChatTransport)
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                const decoder = new TextDecoder();
                let buffer = "";

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        let newlineIndex;

                        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                            const line = buffer.slice(0, newlineIndex);
                            buffer = buffer.slice(newlineIndex + 1);

                            if (line.trim()) {
                                try {
                                    const parsed = JSON.parse(line);
                                    if (parsed.message?.content) {
                                        // Texto plano puro — compatible con TextStreamChatTransport
                                        controller.enqueue(
                                            new TextEncoder().encode(parsed.message.content)
                                        );
                                    }
                                } catch (e) {
                                    // Ignorar errores de parseo en chunks parciales
                                }
                            }
                        }
                    }
                } catch (e: any) {
                    if (e.name !== 'AbortError') console.error('[CEREBRO] Stream error:', e);
                } finally {
                    reader.releaseLock();
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            }
        });
    } catch (error: any) {
        console.error("[Cerebro Chat] DETAILED ERROR:", error);
        return new Response(JSON.stringify({
            error: "No se pudo conectar a los modelos de inteligencia artificial.",
            details: error.message || "Error desconocido"
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
