function unique(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function compactSearchTerm(term: string): string {
    return term.trim().replace(/[\s._-]+/g, "");
}

export function getAdminRepairSearchTerms(query: string | null | undefined): string[] {
    return (query ?? "").trim().split(/\s+/).filter(Boolean);
}

export function getAdminRepairSearchTermVariants(term: string): string[] {
    const trimmed = term.trim();
    const compact = compactSearchTerm(trimmed);
    const variants = [trimmed];

    if (compact !== trimmed) {
        variants.push(compact);
    }

    const letterNumber = compact.match(/^([a-zA-Z]+)(\d+)$/);
    if (letterNumber) {
        const [, letters, digits] = letterNumber;
        variants.push(`${letters} ${digits}`, `${letters}-${digits}`);

        if (digits.length > 1) {
            variants.push(`${letters}${digits[0]}-${digits.slice(1)}`);
        }
    }

    const ticketLike = compact.match(/^([a-zA-Z]{2,}\d)(\d+)$/);
    if (ticketLike) {
        const [, prefix, number] = ticketLike;
        variants.push(`${prefix}-${number}`);

        if (number.length < 8) {
            variants.push(`${prefix}-${number.padStart(8, "0")}`);
        }
    }

    return unique(variants);
}

export function isAdminRepairTicketLookupQuery(query: string | null | undefined): boolean {
    const terms = getAdminRepairSearchTerms(query);
    if (terms.length !== 1) return false;

    const compact = compactSearchTerm(terms[0]);
    return /^\d{3,}$/.test(compact) || /^[a-zA-Z]{2,}\d{4,}$/.test(compact);
}
