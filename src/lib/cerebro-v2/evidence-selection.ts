import type { CerebroSource } from "./types";

const normalized = (value: string): string => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

function evidenceKey(source: CerebroSource): string {
    if (source.sourceType === "PDF") {
        return `PDF|${normalized(source.brand)}|${normalized(source.title)}|${source.pageNumber ?? 0}`;
    }
    return `${source.sourceType}|${source.documentId}`;
}

export function selectEvidence(groups: readonly (readonly CerebroSource[])[], limit = 8): CerebroSource[] {
    const seen = new Set<string>();
    const unique = groups.flat().filter(source => {
        const key = evidenceKey(source);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    const repairs = unique.filter(source => source.sourceType === "REPAIR")
        .sort((left, right) => right.score - left.score).slice(0, Math.min(3, limit));
    const documents = unique.filter(source => source.sourceType !== "REPAIR")
        .sort((left, right) => right.score - left.score).slice(0, Math.max(0, limit - repairs.length));
    return [...repairs, ...documents].sort((left, right) => right.score - left.score);
}
