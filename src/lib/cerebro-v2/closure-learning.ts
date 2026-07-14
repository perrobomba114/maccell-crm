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

const PHONE_PATTERN = /(?:\+?54\s*)?(?:9\s*)?(?:\(?\d{2,4}\)?[\s.-]*)?\d{4}[\s.-]?\d{4}/g;
const PRICE_PATTERN = /(?:US\$|USD|ARS|\$)\s*\d[\d.,]*/gi;

function sanitize(value: string): string {
    return value.replace(PHONE_PATTERN, "[TELEFONO_REMOVIDO]").replace(PRICE_PATTERN, "[PRECIO_REMOVIDO]").trim();
}

function isFinalizedOk(statusName: string): boolean {
    return statusName.trim().toLocaleLowerCase("es-AR") === "finalizado ok";
}

function isNoRepair(statusName: string): boolean {
    return statusName.trim().toLocaleLowerCase("es-AR") === "no reparado";
}

export function buildClosureLearningRecord(statusName: string, input: Partial<ClosureLearningInput>): {
    authority: ClosureLearningAuthority;
    closure: ClosureLearningInput;
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
    if (isNoRepair(statusName)) return { authority: "FAILED", closure };
    return { authority: isFinalizedOk(statusName) && parsed.success ? "CONFIRMED_SUCCESS" : "INCOMPLETE", closure };
}
