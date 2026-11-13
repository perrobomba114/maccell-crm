"use server";

import { db as prisma } from "@/lib/db";
import { getMonthlyRange } from "@/lib/date-utils";

export async function getProductStats(branchId?: string, date?: Date) {
    try {
        const referenceDateStr = date ? date.toISOString().split('T')[0] : undefined;
        const { start: firstDayOfMonth, end: lastDayOfMonth } = getMonthlyRange(referenceDateStr);

        const whereSale = branchId ? { branchId } : {};

        const [items, totalBranches] = await Promise.all([
            prisma.saleItem.findMany({
                where: {
                    productId: { not: null },
                    sale: { ...whereSale, createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth } }
                },
                select: {
                    productId: true,
                    name: true,
                    quantity: true,
                    price: true,
                    product: { select: { costPrice: true } }
                }
            }),
            prisma.branch.count()
        ]);

        const salesMap = new Map<string, { name: string, quantity: number, productId: string }>();
        items.forEach(item => {
            const key = item.productId || item.name;
            const current = salesMap.get(key) || { name: item.name, quantity: 0, productId: item.productId! };
            current.quantity += item.quantity;
            salesMap.set(key, current);
        });

        const topSelling = Array.from(salesMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        const activeSellingProductIds = Array.from(salesMap.keys()).filter(id => id.length > 10); 

        const activeProductsStock = await prisma.productStock.findMany({
            where: {
                productId: { in: activeSellingProductIds },
                product: { deletedAt: null }
            },
            select: { productId: true, quantity: true, product: { select: { name: true } } }
        });


        const unifiedStockMap = new Map<string, { name: string, totalStock: number, salesVolume: number }>();

        activeProductsStock.forEach(s => {
            const saleData = salesMap.get(s.productId);
            const current = unifiedStockMap.get(s.productId) || {
                name: s.product.name,
                totalStock: 0,
                salesVolume: saleData?.quantity || 0
            };
            current.totalStock += s.quantity;
            unifiedStockMap.set(s.productId, current);
        });

        const replenishmentSuggestions = Array.from(unifiedStockMap.values())
            .map(item => {
                const lowerName = item.name.toLowerCase();
                let targetPerBranch = 5; 

                if (lowerName.includes("templado")) targetPerBranch = 10;
                else if (lowerName.includes("funda")) targetPerBranch = 10;
                else if (lowerName.includes("hidrogel")) targetPerBranch = 20;

                const globalTarget = targetPerBranch * totalBranches;
                const suggestedQuantity = Math.max(0, globalTarget - item.totalStock);

                return {
                    name: item.name,
                    branch: "Todas las sucursales", 
                    quantity: item.totalStock,
                    suggestedQuantity,
                    salesVolume: item.salesVolume
                };
            })
            .filter(item => item.suggestedQuantity > 0)
            .sort((a, b) => {
                const urgencyA = a.suggestedQuantity * (1 + a.salesVolume);
                const urgencyB = b.suggestedQuantity * (1 + b.salesVolume);
                return urgencyB - urgencyA;
            })
            .slice(0, 40)
            .map(({ name, branch, quantity, suggestedQuantity }) => ({ name, branch, quantity, suggestedQuantity }));

        const profitMap = new Map<string, { name: string, profit: number }>();
        items.forEach(item => {
            if (!item.product) return;
            const key = item.productId!;
            const profit = (item.price - item.product.costPrice) * item.quantity;

            const current = profitMap.get(key) || { name: item.name, profit: 0 };
            current.profit += profit;
            profitMap.set(key, current);
        });

        const mostProfitable = Array.from(profitMap.values())
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10);

        return {
            topSelling,
            lowStock: replenishmentSuggestions,
            mostProfitable
        };

    } catch (error) {
        console.error("Error in getProductStats:", error);
        return { topSelling: [], lowStock: [], mostProfitable: [] };
    }
}
