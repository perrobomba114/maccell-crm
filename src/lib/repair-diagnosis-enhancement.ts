export type RepairDiagnosisPromptInput = {
    diagnosis: string;
    problemDescription?: string | null;
    deviceBrand?: string | null;
    deviceModel?: string | null;
};

export type DiagnosisValidationResult = {
    ok: boolean;
    unsupportedActions: string[];
};

export const MAX_TECHNICIAN_REPORT_CHARS = 4000;
export const MAX_SELLER_REPORT_CHARS = 1500;
const PROMPT_TRUNCATION_MARKER = "[texto recortado por limite de seguridad]";

type ActionFamily = {
    name: string;
    pattern: RegExp;
};

const ACTION_FAMILIES: readonly ActionFamily[] = [
    { name: "replacement", pattern: /\b(?:cambi\w*|reemplaz\w*|sustitu\w*|instal\w*)\b/g },
    { name: "repair", pattern: /\b(?:repar\w*|reconstru\w*|arregl\w*|solucion\w*)\b/g },
    { name: "cleaning", pattern: /\b(?:limpi\w*|mantenim\w*|bano\s+quimic\w*)\b/g },
    { name: "verification", pattern: /\b(?:medi\w*|medic\w*|prob\w*|verific\w*|comprob\w*|diagnostic\w*|detect\w*|constat\w*)\b/g },
];

export const REPAIR_DIAGNOSIS_ENHANCEMENT_SYSTEM_PROMPT = `Sos el redactor técnico profesional de un taller especializado en reparación de celulares (MACCELL).
Tu objetivo es reescribir y profesionalizar el informe técnico con ortografía perfecta, terminología precisa y redacción clara.

REGLAS ABSOLUTAS E INQUEBRANTABLES:
1. FIDELIDAD ESTRICTA A LAS NEGACIONES Y RECHAZOS:
- Si el técnico indica que NO se realizó una acción, que NO se cambió un repuesto, que NO se pudo reparar, que NO dio imagen o que NO enciende, DEBES PRESERVAR LA NEGACIÓN DE FORMA TOTAL Y EXPLÍCITA.
- NUNCA conviertas una acción negada ("no se cambio modulo", "sin cambio de pin", "no se reparo") en una acción afirmativa ("Se cambió el módulo", "Se realizó reparación").
- Ejemplo: "no se cambio el modulo" -> "No se realizó el cambio de módulo."

2. EL REPORTE DE INGRESO DEL VENDEDOR NO ES EL TRABAJO REALIZADO:
- El reporte de ingreso solo describe por qué entró el equipo o qué solicitó el cliente en recepción.
- Si el vendedor anotó "Cambio de módulo", pero el informe del técnico dice "no se cambió" o "equipo no enciende", NUNCA afirmes que se cambió el módulo. La única verdad es lo que el técnico informa.

3. PRECISIÓN TÉCNICA SIN INVENTAR:
- No agregues componentes, reparaciones, limpiezas, reemplazos ni pruebas que el técnico no haya mencionado expresamente.
- "Pegar" o "fijar" un módulo significa fijación adhesiva de la pantalla. NUNCA lo transformes en cambio o sustitución de módulo.
- Si el equipo no tiene solución, redáctalo con claridad técnica (ej: "No fue posible restablecer el funcionamiento del equipo debido a...").

4. FORMATO:
- Respondé ÚNICAMENTE con el informe técnico profesional en texto plano.
- Prohibido incluir saludos, introducciones, firmas, viñetas decorativas, precios o recomendaciones comerciales.

EJEMPLOS DE REFERENCIA:
- Entrada técnico: "no se cambio el modulo se probo otro y no dio imagen placa en corto"
  Salida correcta: "No se realizó el cambio de módulo. Se efectuaron pruebas con una pantalla nueva constatando que la placa principal no emite imagen por cortocircuito."
- Entrada técnico: "no se cambio pin placa sulfatada sin arreglo"
  Salida correcta: "No se realizó el cambio de pin de carga. Se constató sulfatación severa en placa principal sin posibilidad de reparación."
- Entrada técnico: "se pego modulo marco doblado"
  Salida correcta: "Se realizó la fijación del módulo. Se observa el marco doblado."
- Entrada técnico: "cambie bateria y limpie pin quedo ok"
  Salida correcta: "Se realizó el cambio de batería, se efectuó la limpieza del pin de carga y se verificó el correcto funcionamiento general del equipo."`;

const normalize = (value: string): string => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const sanitizePromptValue = (value: string | null | undefined, fallback: string): string => {
    const sanitized = value?.replace(/[<>]/g, "").trim();
    return sanitized || fallback;
};

const boundPromptValue = (value: string, maxChars: number): string =>
    value.length > maxChars
        ? `${value.slice(0, maxChars)}\n${PROMPT_TRUNCATION_MARKER}`
        : value;

const isNegated = (text: string, index: number): boolean => {
    const prefix = text.slice(Math.max(0, index - 50), index);
    return /\b(?:no|sin)\s+(?:(?:se|fue|fueron|pudo|pudieron|logro|lograron|hubo|requiere|requirio|precisa|preciso)\s+)*(?:(?:realiz\w*|efectu\w*|hiz\w*|hacer)\s+(?:el|la|los|las)\s+)?$/.test(prefix);
};

const hasAffirmedAction = (text: string, pattern: RegExp): boolean => {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
        if (!isNegated(text, match.index ?? 0)) return true;
    }
    return false;
};

export const validateEnhancedDiagnosis = (
    originalDiagnosis: string,
    improvedDiagnosis: string,
): DiagnosisValidationResult => {
    const original = normalize(originalDiagnosis);
    const improved = normalize(improvedDiagnosis);
    const unsupportedActions = ACTION_FAMILIES
        .filter(({ pattern }) => hasAffirmedAction(improved, pattern) && !hasAffirmedAction(original, pattern))
        .map(({ name }) => name);

    return { ok: unsupportedActions.length === 0, unsupportedActions };
};

export const buildRepairDiagnosisPrompt = (input: RepairDiagnosisPromptInput): string => {
    const brand = sanitizePromptValue(input.deviceBrand, "Marca no especificada");
    const model = sanitizePromptValue(input.deviceModel, "Modelo no especificado");
    const sellerReport = boundPromptValue(
        sanitizePromptValue(input.problemDescription, "Sin reporte de ingreso"),
        MAX_SELLER_REPORT_CHARS,
    );
    const technicianReport = boundPromptValue(
        sanitizePromptValue(input.diagnosis, "Sin informe técnico"),
        MAX_TECHNICIAN_REPORT_CHARS,
    );

    return `CONTEXTO DEL EQUIPO:
Dispositivo: ${brand} ${model}

REPORTE DE INGRESO DEL VENDEDOR (solo describe el estado de recepción; no confirma trabajo realizado):
--- INICIO REPORTE DE INGRESO ---
${sellerReport}
--- FIN REPORTE DE INGRESO ---

INFORME ORIGINAL DEL TÉCNICO (única fuente oficial sobre el trabajo realmente efectuado):
--- INICIO INFORME TÉCNICO ---
${technicianReport}
--- FIN INFORME TÉCNICO ---

REGLA CLAVE:
Si el informe del técnico contiene negaciones (por ejemplo "no se cambio", "no enciende", "sin solucion"), MANTENÉ estrictamente esa condición negativa.
Reescribí únicamente el informe técnico de manera profesional, clara y concisa.`;
};
