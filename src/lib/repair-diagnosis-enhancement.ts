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

export const REPAIR_DIAGNOSIS_ENHANCEMENT_SYSTEM_PROMPT = `Sos el redactor técnico de un taller de reparación de celulares.
Reescribí el informe del técnico con ortografía correcta, frases breves y lenguaje técnico que cualquier cliente pueda entender.

REGLAS ABSOLUTAS:
- El INFORME ORIGINAL DEL TÉCNICO es la única fuente que confirma el trabajo realizado.
- El REPORTE DE INGRESO DEL VENDEDOR solo describe el pedido y el estado de recepción. Nunca lo presentes como trabajo realizado.
- No agregues cambios, reemplazos, reparaciones, limpiezas, pruebas, mediciones, componentes, resultados ni conclusiones que el técnico no haya escrito.
- Conservá negaciones y diferencias entre una observación, un diagnóstico y una acción realizada.
- "Pegar" o "fijar" un módulo significa fijarlo. Nunca lo conviertas en cambio, instalación o reemplazo.
- Si el texto es ambiguo, corregilo de forma literal y prudente, sin completar información probable.
- Respondé únicamente con el informe mejorado. No uses saludos, títulos, etiquetas, precios ni recomendaciones comerciales.

EJEMPLO:
Reporte de ingreso: "Pegar módulo / ingresa con módulo despegado".
Informe técnico: "se pego modulo marco doblado".
Salida correcta: "Se realizó la fijación del módulo. El marco se encuentra doblado.".
Salida prohibida: "Se realizó el reemplazo y fijación del módulo.".`;

const normalize = (value: string): string => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const sanitizePromptValue = (value: string | null | undefined, fallback: string): string => {
    const sanitized = value?.replace(/[<>]/g, "").trim();
    return sanitized || fallback;
};

const isNegated = (text: string, index: number): boolean => {
    const prefix = text.slice(Math.max(0, index - 45), index);
    return /\b(?:no|sin)\s+(?:(?:se|fue|pudo|pudieron|logro|lograron)\s+|realizar\s+(?:el|la)\s+){0,2}$/.test(prefix);
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
    const sellerReport = sanitizePromptValue(input.problemDescription, "Sin reporte de ingreso");
    const technicianReport = sanitizePromptValue(input.diagnosis, "Sin informe técnico");

    return `CONTEXTO DEL EQUIPO (solo identifica el dispositivo):
Marca: ${brand}
Modelo: ${model}

REPORTE DE INGRESO DEL VENDEDOR (contexto; no confirma trabajo realizado):
--- INICIO REPORTE DE INGRESO ---
${sellerReport}
--- FIN REPORTE DE INGRESO ---

INFORME ORIGINAL DEL TÉCNICO (única fuente sobre el trabajo realizado):
--- INICIO INFORME TÉCNICO ---
${technicianReport}
--- FIN INFORME TÉCNICO ---

Reescribí únicamente el informe técnico. Respondé solo con la versión profesional, breve y comprensible.`;
};
