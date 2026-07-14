import type { CerebroSource } from "./types";

function extractionLooksWeak(content: string): boolean {
    if (content.trim().length < 80) return true;
    const readable = [...content].filter((character) => /[\p{L}\p{N}\s]/u.test(character)).length;
    return readable / content.length < 0.62;
}

export function shouldLoadVisualEvidence(source: CerebroSource): boolean {
    if (source.sourceType !== "PDF" || source.pageNumber === null) return false;
    return extractionLooksWeak(source.content)
        || /SCHEMATIC|ESQUEMATICO|ESQUEMÁTICO|PLANO|PCB|LAYOUT/i.test(source.title);
}
