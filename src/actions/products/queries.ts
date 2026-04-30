"use server";

import { db as prisma } from "@/lib/db";

export async function getProducts(filters?: {
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
}) {
    try {
        const { search, categoryId, page = 1, limit = 50, sortColumn = "sku", sortDirection = "desc" } = filters || {};
        const skip = (page - 1) * limit;

        const where: any = {
            deletedAt: null, 
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
            ];
        }

        if (categoryId && categoryId !== "all") {
            where.categoryId = categoryId;
        }

        if (sortColumn.startsWith("stock_")) {
            const targetBranchId = sortColumn.replace("stock_", "");

            const allMatchingProducts = await prisma.product.findMany({
                where,
                select: { id: true }
            });

            const allIds = allMatchingProducts.map(p => p.id);
            const total = allIds.length;

            const stocks = await prisma.productStock.findMany({
                where: {
                    productId: { in: allIds },
                    branchId: targetBranchId
                },
                select: { productId: true, quantity: true }
            });

            const stockMap = new Map<string, number>();
            stocks.forEach(s => stockMap.set(s.productId, s.quantity));

            allIds.sort((a, b) => {
                const qtyA = stockMap.get(a) || 0;
                const qtyB = stockMap.get(b) || 0;

                if (sortDirection === "asc") return qtyA - qtyB;
                return qtyB - qtyA;
            });

            const pagedIds = allIds.slice(skip, skip + limit);

            const products = await prisma.product.findMany({
                where: { id: { in: pagedIds } },
                include: {
                    category: true,
                    stock: true,
                }
            });

            const sortedProducts = pagedIds.map(id => products.find(p => p.id === id)).filter(Boolean);

            return { success: true, products: sortedProducts, total, totalPages: Math.ceil(total / limit) };
        }

        const allowedSorts = ["sku", "name", "price", "costPrice", "createdAt"];
        const safeSortColumn = allowedSorts.includes(sortColumn) ? sortColumn : "sku";
        const safeSortDirection = sortDirection === "asc" ? "asc" : "desc";

        const orderBy: any[] = [];

        orderBy.push({ [safeSortColumn]: safeSortDirection });

        if (safeSortColumn !== "id") {
            orderBy.push({ id: "desc" });
        }

        const [products, total] = await prisma.$transaction([
            prisma.product.findMany({
                where,
                include: {
                    category: true,
                    stock: true, 
                },
                skip,
                take: limit,
                orderBy,
            }),
            prisma.product.count({ where }),
        ]);

        return { success: true, products, total, totalPages: Math.ceil(total / limit) };
    } catch (error) {
        console.error("Get products error:", error);
        return { success: false, error: "Error al obtener productos" };
    }
}

export async function getAllProductsForExport() {
    try {
        const products = await prisma.product.findMany({
            where: { deletedAt: null },
            include: {
                category: true,
                stock: {
                    include: { branch: true } 
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, products };
    } catch (error) {
        console.error("Export error:", error);
        return { success: false, error: "Error al exportar productos" };
    }
}
