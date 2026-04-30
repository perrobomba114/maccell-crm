"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";

export async function searchWarrantyRepairs(term: string, branchId: string) {
    if (!branchId || term.length < 2) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const repairs = await db.repair.findMany({
        where: {
            branchId,
            statusId: 10,
            updatedAt: { gte: thirtyDaysAgo },
            OR: [
                { ticketNumber: { contains: term, mode: 'insensitive' } },
                { customer: { name: { contains: term, mode: 'insensitive' } } },
                { customer: { phone: { contains: term, mode: 'insensitive' } } }
            ]
        },
        include: {
            customer: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    return repairs.map(r => ({
        id: r.id,
        ticketNumber: r.ticketNumber,
        customerName: r.customer.name,
        customerPhone: r.customer.phone,
        customerEmail: r.customer.email,
        deviceBrand: r.deviceBrand,
        deviceModel: r.deviceModel,
        problemDescription: r.problemDescription,
        date: r.updatedAt.toISOString(),
        isWet: r.isWet,
        isWarranty: r.isWarranty
    }));
}

export async function searchSparePartsAction(term: string) {
    const caller = await getCurrentUser();
    if (!caller) return [];

    const cleanTerm = term?.trim();

    if (!cleanTerm || cleanTerm.length < 2) {
        return [];
    }

    try {
        let last4Digits: string | null = null;
        if (/^9988\d{4}$/.test(cleanTerm)) {
            last4Digits = cleanTerm.slice(-4);
        }

        const searchConditions = [
            { name: { contains: cleanTerm, mode: 'insensitive' } },
            { sku: { equals: cleanTerm, mode: 'insensitive' } },
            { sku: { contains: cleanTerm, mode: 'insensitive' } },
            { sku: { endsWith: cleanTerm, mode: 'insensitive' } },
            { sku: { startsWith: cleanTerm, mode: 'insensitive' } }
        ] as any[];

        if (last4Digits) {
            searchConditions.push(
                { sku: { equals: last4Digits, mode: 'insensitive' } },
                { sku: { endsWith: last4Digits, mode: 'insensitive' } },
                { sku: { contains: last4Digits, mode: 'insensitive' } }
            );
        }

        const parts = await db.sparePart.findMany({
            where: {
                OR: searchConditions,
            },
            take: 20
        });

        if (parts.length > 0 && (parts[0] as any).pricePos === undefined) {
            try {
                const rawPrices = await db.$queryRaw`SELECT id, "pricePos" FROM "spare_parts" WHERE "deletedAt" IS NULL`;
                const priceMap = new Map();
                if (Array.isArray(rawPrices)) {
                    rawPrices.forEach((p: any) => priceMap.set(p.id, p.pricePos));
                }
                parts.forEach((part: any) => {
                    part.pricePos = priceMap.get(part.id) || 0;
                });
            } catch (e) { console.error("Search fallback error", e); }
        }

        return parts.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.priceArg,
            pricePos: p.pricePos || 0,
            stock: p.stockLocal
        }));
    } catch (error) {
        console.error("Search Error:", error);
        return [];
    }
}
