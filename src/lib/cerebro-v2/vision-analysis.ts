import { z } from "zod";

const visibleFactsSchema = z.object({
    visibleReferences: z.array(z.string().trim().min(1).max(48)).max(24).default([]),
    visibleNets: z.array(z.string().trim().min(1).max(80)).max(24).default([]),
    visibleTestPoints: z.array(z.string().trim().min(1).max(48)).max(16).default([]),
    visibleConnectors: z.array(z.string().trim().min(1).max(80)).max(16).default([]),
    readableNotes: z.array(z.string().trim().min(1).max(240)).max(12).default([]),
    uncertainty: z.string().trim().min(1).max(600),
});

export type VisibleSchematicFacts = z.infer<typeof visibleFactsSchema>;

export const VISION_FACTS_SYSTEM_PROMPT = [
    "Extraés únicamente hechos visibles de un schematic o boardview.",
    "No diagnostiques ni propongas reparaciones.",
    "No inventes referencias, nets, tensiones, valores ni páginas ilegibles.",
    "Respondé solo JSON con visibleReferences, visibleNets, visibleTestPoints, visibleConnectors, readableNotes y uncertainty.",
].join(" ");

export function parseVisibleSchematicFacts(value: string): VisibleSchematicFacts | null {
    try {
        return visibleFactsSchema.parse(JSON.parse(value));
    } catch {
        return null;
    }
}

export function formatVisibleSchematicFacts(facts: VisibleSchematicFacts): string {
    const list = (label: string, values: string[]) => `${label}: ${values.length > 0 ? values.join(", ") : "ninguno legible"}`;
    return [
        "HECHOS_VISUALES_DEL_SCHEMATIC (no son diagnóstico):",
        list("Referencias visibles", facts.visibleReferences),
        list("Nets visibles", facts.visibleNets),
        list("Test points visibles", facts.visibleTestPoints),
        list("Conectores visibles", facts.visibleConnectors),
        list("Notas legibles", facts.readableNotes),
        `Incertidumbre visual: ${facts.uncertainty}`,
    ].join("\n");
}
