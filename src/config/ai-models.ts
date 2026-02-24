/**
 * CEREBRO — Configuración centralizada de IA
 *
 * Arquitectura: Ollama (local, $0, sin límites)
 *
 * Ollama en Windows con RTX 3090 vía Tailscale:
 *   - deepseek-r1:14b   → CHAT principal (mejor razonamiento lógico)
 *   - llava:13b          → VISION (análisis de PCBs, menos alucinación que llama3.2-vision)
 *   - llama3.2:1b        → ROUTER (clasificador ultrarrápido: PCB sí/no)
 *   - nomic-embed-text   → EMBED (vectorización para RAG)
 *   - deepseek-r1:14b    → DEEP_REASONING (cron nocturno)
 *   - llama3.1:8b        → ENHANCER (mejora diagnósticos, rápido)
 */

/** Modelos de Ollama (local, $0.00, sin rate limit) */
export const OLLAMA_MODELS = {
    ENHANCER: "llama3.1:8b",           // Mejora de diagnósticos (rápido)
    VISION: "llava:13b",               // Análisis de imágenes PCB (mejorado)
    ROUTER: "llama3.2:1b",             // Clasificador imagen: PCB sí/no (<1s)
    EMBED: "nomic-embed-text",          // Embeddings para RAG
    DEEP_REASONING: "deepseek-r1:14b", // Cron nocturno
    CHAT: "deepseek-r1:14b",           // Chat principal Cerebro (mejorado)
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
