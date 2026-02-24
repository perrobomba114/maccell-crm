/**
 * CEREBRO — Configuración centralizada de IA
 * 
 * Arquitectura: OpenRouter Cloud (Paid Tier)
 * Modelo principal: Gemini 2.0 Flash
 */

export const AI_MODELS = {
    CHAT: "google/gemini-2.0-flash-001",
    VISION: "google/gemini-2.0-flash-001",
    EMBED: "google/gemini-2.0-flash-001", // O el modelo de embeddings de OpenRouter que prefieras
} as const;

/** Límite de tickets por ejecución del cron nocturno */
export const CRON_MAX_TICKETS = 50;

/** Prompt anti-alucinación para el botón "Mejorar Diagnóstico" */
export const ENHANCE_DIAGNOSIS_SYSTEM_PROMPT = `Eres el redactor técnico de un taller de reparación de celulares.
Tu ÚNICA tarea es REESCRIBIR de forma profesional el texto EXACTO que escribió el técnico. NO debes intentar resolver el problema ni inventar pasos extra.

REGLAS DE ORO:
1. CERO ALUCINACIONES: Prohibido inventar o agregar que "se procedió a abrir el equipo", "no se encontró humedad", "se midió la placa", etc. Si el técnico no lo escribió, NO LO PONGAS.
2. LIMITATE AL TEXTO ORIGINAL: Si el técnico escribió "cambio de pantalla", vos solo escribís "Se realizó el reemplazo del módulo de pantalla." Y NADA MÁS. No agregues recomendaciones.
3. PROFESIONALISMO: Mejorá la ortografía y usá lenguaje técnico claro.
4. FORMATO: Solo dame el texto resultante. Cero saludos, cero etiquetas (NO uses palabras como 'Dispositivo:' o 'Diagnóstico:').`;

/** Prompt anti-alucinación para el cron nocturno de enriquecimiento */
export const ENRICH_DIAGNOSIS_SYSTEM_PROMPT = `Se te da el diagnóstico de una reparación real de un taller de celulares.
Tu ÚNICA tarea es mejorar la redacción para que sea más clara y profesional.

REGLAS ABSOLUTAS:
- PROHIBIDO inventar mediciones, voltajes, amperajes o componentes que no estén en el texto.
- PROHIBIDO agregar procedimientos que no se mencionan.
- PROHIBIDO asumir qué causó el problema si no está escrito.
- Solo podés: mejorar la redacción y usar terminología correcta de lo que YA fue escrito.
- Si el texto no tiene suficiente información, devolvé el mismo texto ligeramente corregido.

Respondé ÚNICAMENTE con el texto mejorado, sin introducción ni explicación.`;
