import type { Prisma } from "@prisma/client";
import { externalPurchaseSchema } from "./external-purchases";

type SearchParams = Record<string, string | string[] | undefined>;

export function externalPurchaseFilters(params: SearchParams) {
    const q = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
    const from = typeof params.from === "string" ? params.from : "";
    const to = typeof params.to === "string" ? params.to : "";
    const requestedPage = Number(params.page);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100000) : 1;
    let error: string | null = null;
    if ((from && !externalPurchaseSchema.shape.purchasedAt.safeParse(from).success) ||
        (to && !externalPurchaseSchema.shape.purchasedAt.safeParse(to).success)) {
        error = "Ingresá fechas válidas para filtrar las compras.";
    } else if (from && to && from > to) {
        error = "La fecha desde no puede ser posterior a la fecha hasta.";
    }
    const where: Prisma.RepairExternalPurchaseWhereInput = q ? { OR: [
        { supplier: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { repair: { ticketNumber: { contains: q, mode: "insensitive" } } },
        { repair: { branch: { name: { contains: q, mode: "insensitive" } } } },
    ] } : {};
    if (error) {
        // Un período inválido nunca debe mostrar los totales de todas las fechas.
        where.id = { in: [] };
    } else if (from || to) {
        // purchasedAt es DATE en PostgreSQL: límites inclusivos sin conversión horaria.
        where.purchasedAt = {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
        };
    }
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    return { q, from, to, page, error, where, query };
}

export function externalPurchasePageUrl(query: URLSearchParams, page: number) {
    const next = new URLSearchParams(query);
    next.set("page", String(page));
    return `?${next}`;
}
