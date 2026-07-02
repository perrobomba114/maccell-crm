import type { Prisma } from "@prisma/client";

function unique(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function contains(value: string) {
    return { contains: value, mode: "insensitive" as const };
}

export function getAdminRepairSearchTerms(query: string | null | undefined): string[] {
    return (query ?? "").trim().split(/\s+/).filter(Boolean);
}

export function getAdminRepairSearchTermVariants(term: string): string[] {
    const trimmed = term.trim();
    const compact = trimmed.replace(/[\s._-]+/g, "");
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

    const ticketLike = compact.match(/^([a-zA-Z]+\d)(\d{4,})$/);
    if (ticketLike) {
        const [, prefix, number] = ticketLike;
        variants.push(`${prefix}-${number}`);
    }

    return unique(variants);
}

function buildVariantConditions(variant: string): Prisma.RepairWhereInput[] {
    return [
        { ticketNumber: contains(variant) },
        { customer: { name: contains(variant) } },
        { customer: { phone: contains(variant) } },
        { deviceBrand: contains(variant) },
        { deviceModel: contains(variant) },
        { problemDescription: contains(variant) },
        { diagnosis: contains(variant) },
        { diagnosisEnriched: contains(variant) },
        { branch: { name: contains(variant) } },
        { assignedTo: { is: { name: contains(variant) } } },
        { createdBy: { name: contains(variant) } },
        { originalRepair: { is: { ticketNumber: contains(variant) } } },
        { originalRepair: { is: { problemDescription: contains(variant) } } },
    ];
}

export function buildAdminRepairSearchFilters(query: string | null | undefined): Prisma.RepairWhereInput[] {
    return getAdminRepairSearchTerms(query).map((term) => ({
        OR: getAdminRepairSearchTermVariants(term).flatMap(buildVariantConditions),
    }));
}
