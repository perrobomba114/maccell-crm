import { z } from "zod";

export const closureLearningSchema = z.object({
    symptom: z.string().trim().min(8).max(1500),
    rootCause: z.string().trim().min(8).max(2000),
    confirmingEvidence: z.string().trim().min(8).max(3000),
    intervention: z.string().trim().min(8).max(3000),
    verification: z.string().trim().min(8).max(2000),
    affectedReferences: z.array(z.string().trim().min(2).max(32)).max(12).default([]),
    schematicPages: z.array(z.object({ documentId: z.string().uuid(), pageNumber: z.number().int().positive() })).max(8).default([]),
    externalSources: z.array(z.object({ url: z.string().url(), title: z.string().trim().max(300) })).max(5).default([]),
});

export type ClosureLearningInput = z.infer<typeof closureLearningSchema>;
export type ClosureLearningAuthority = "CONFIRMED_SUCCESS" | "INCOMPLETE" | "FAILED";
export type TechnicalOutcomeEvent = {
    statusId: number;
    statusName: string;
    createdAt: Date;
};

const PHONE_PATTERN = /(?:\+?54\s*)?(?:9\s*)?(?:\(?\d{2,4}\)?[\s.-]*)?\d{4}[\s.-]?\d{4}/g;
const PRICE_PATTERN = /(?:US\$|USD|ARS|\$)\s*\d[\d.,]*/gi;

function sanitize(value: string): string {
    return value.replace(PHONE_PATTERN, "[TELEFONO_REMOVIDO]").replace(PRICE_PATTERN, "[PRECIO_REMOVIDO]").trim();
}

const REPAIR_STATUS = { PENDING: 1, CLAIMED: 2, IN_PROGRESS: 3, PAUSED: 4, OK: 5, DELIVERED: 6, NO_REPAIR: 7, INVOICED: 10 } as const;
const VAGUE_EVIDENCE = /^(?:todo\s+)?(?:ok|bien|funciona|probado|listo|resuelto)[.!\s]*$/i;
const INCONCLUSIVE_EVIDENCE = /(?:no se (?:realiz[oó]|hizo|pudo|logr[oó])|sin (?:medici[oó]n|verificaci[oó]n|comprobar)|pendiente|inconclus[oa]|no verificado|no fue verificado)/i;
const VAGUE_INTERVENTION = /^(?:se\s+)?(?:revis[oó]|prob[oó]|cheque[oó])(?:\s+el|\s+la)?\s+equipo[.!\s]*$/i;
const UNKNOWN_CAUSE = /^(?:causa\s+)?(?:no determinada|desconocida|sin determinar)$/i;

export function isUnknownRootCause(value: string): boolean {
    return UNKNOWN_CAUSE.test(value.trim());
}

export function isClosureVersionCurrent(expectedVersion: string | null, currentUpdatedAt: Date | null): boolean {
    return expectedVersion === (currentUpdatedAt?.toISOString() ?? null);
}

export function canApproveClosure(input: { dirty: boolean; serverCanReview: boolean; expectedVersion: string | null }): boolean {
    return !input.dirty && input.serverCanReview && input.expectedVersion !== null;
}

export function deriveLatestTechnicalOutcome(events: readonly TechnicalOutcomeEvent[]): ClosureLearningAuthority {
    let outcome: ClosureLearningAuthority = "INCOMPLETE";
    for (const event of [...events].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())) {
        if (event.statusId >= REPAIR_STATUS.PENDING && event.statusId <= REPAIR_STATUS.PAUSED) outcome = "INCOMPLETE";
        if (event.statusId === REPAIR_STATUS.OK) outcome = "CONFIRMED_SUCCESS";
        if (event.statusId === REPAIR_STATUS.NO_REPAIR) outcome = "FAILED";
    }
    return outcome;
}

function hasSpecificEvidence(value: string): boolean {
    return value.trim().length >= 12 && !VAGUE_EVIDENCE.test(value.trim()) && !INCONCLUSIVE_EVIDENCE.test(value);
}

function closureQualityIssues(closure: ClosureLearningInput): string[] {
    const issues: string[] = [];
    if (!hasSpecificEvidence(closure.confirmingEvidence)) issues.push("Falta evidencia confirmatoria específica");
    if (!hasSpecificEvidence(closure.verification)) issues.push("Falta una prueba final verificable");
    if (closure.intervention.trim().length < 12 || VAGUE_INTERVENTION.test(closure.intervention.trim())) issues.push("La intervención realizada es demasiado genérica");
    return issues;
}

export function buildClosureLearningRecord(technicalOutcome: ClosureLearningAuthority, input: Partial<ClosureLearningInput>): {
    authority: ClosureLearningAuthority;
    closure: ClosureLearningInput;
    qualityAccepted: boolean;
    qualityIssues: string[];
} {
    const parsed = closureLearningSchema.safeParse(input);
    const closure = parsed.success ? {
        ...parsed.data,
        symptom: sanitize(parsed.data.symptom),
        rootCause: sanitize(parsed.data.rootCause),
        confirmingEvidence: sanitize(parsed.data.confirmingEvidence),
        intervention: sanitize(parsed.data.intervention),
        verification: sanitize(parsed.data.verification),
    } : {
        symptom: sanitize(input.symptom ?? ""),
        rootCause: sanitize(input.rootCause ?? ""),
        confirmingEvidence: sanitize(input.confirmingEvidence ?? ""),
        intervention: sanitize(input.intervention ?? ""),
        verification: sanitize(input.verification ?? ""),
        affectedReferences: input.affectedReferences ?? [],
        schematicPages: input.schematicPages ?? [],
        externalSources: input.externalSources ?? [],
    };
    const qualityIssues = parsed.success ? closureQualityIssues(closure) : ["El cierre técnico está incompleto"];
    const qualityAccepted = parsed.success && qualityIssues.length === 0;
    if (technicalOutcome === "FAILED") return { authority: "FAILED", closure, qualityAccepted, qualityIssues };
    const causeIsKnown = !isUnknownRootCause(closure.rootCause);
    const confirmed = technicalOutcome === "CONFIRMED_SUCCESS" && qualityAccepted && causeIsKnown;
    return { authority: confirmed ? "CONFIRMED_SUCCESS" : "INCOMPLETE", closure, qualityAccepted, qualityIssues };
}
