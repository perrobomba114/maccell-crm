"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";

export async function ensureProductStock(productId: string, branchId: string) {
    try {
        const stock = await prisma.productStock.upsert({
            where: {
                productId_branchId: {
                    productId,
                    branchId,
                },
            },
            update: {},
            create: {
                productId,
                branchId,
                quantity: 0,
            },
        });
        return { success: true, stock };
    } catch (error) {
        console.error("Ensure stock error:", error);
        return { success: false, error: "Error al inicializar stock" };
    }
}

export type ProductImportRow = {
    sku: string;
    name?: string;
    description?: string;
    categoryName?: string;
    costPrice?: number;
    price?: number;
    stocks: { branchId: string; quantity: number }[];
};

export async function bulkUpsertProducts(products: ProductImportRow[]) {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") {
        return { success: false, error: "No autorizado" };
    }
    try {
        const categories = await prisma.category.findMany();
        const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
        const skippedSkus: string[] = [];
        let processedCount = 0;

        await prisma.$transaction(async (tx) => {
            for (const p of products) {
                let categoryId = undefined;
                if (p.categoryName) {
                    const normalizedCat = p.categoryName.toLowerCase();
                    if (categoryMap.has(normalizedCat)) {
                        categoryId = categoryMap.get(normalizedCat);
                    } else {
                        const newCat = await tx.category.create({
                            data: { name: p.categoryName }
                        });
                        categoryMap.set(normalizedCat, newCat.id);
                        categoryId = newCat.id;
                    }
                }

                const existingProduct = await tx.product.findUnique({
                    where: { sku: p.sku }
                });

                let productId = existingProduct?.id;

                if (existingProduct) {
                    const updateData: any = {};
                    if (p.name !== undefined && p.name !== "") updateData.name = p.name;
                    if (p.description !== undefined) updateData.description = p.description;
                    if (categoryId !== undefined) updateData.categoryId = categoryId;

                    if (p.costPrice !== undefined) updateData.costPrice = p.costPrice;
                    if (p.price !== undefined) updateData.price = p.price;

                    const finalCost = p.costPrice !== undefined ? p.costPrice : existingProduct.costPrice;
                    const finalPrice = p.price !== undefined ? p.price : existingProduct.price;

                    if (finalCost > 0) {
                        updateData.profitMargin = ((finalPrice - finalCost) / finalCost) * 100;
                    }

                    updateData.deletedAt = null;

                    if (Object.keys(updateData).length > 0) {
                        await tx.product.update({
                            where: { id: existingProduct.id },
                            data: updateData
                        });
                    }
                    processedCount++;
                } else {
                    if (!p.name || p.price === undefined || p.costPrice === undefined) {
                        skippedSkus.push(p.sku);
                        continue;
                    }

                    const profitMargin = p.costPrice > 0
                        ? ((p.price - p.costPrice) / p.costPrice) * 100
                        : 0;

                    const newProduct = await tx.product.create({
                        data: {
                            sku: p.sku,
                            name: p.name,
                            description: p.description,
                            categoryId: categoryId, 
                            costPrice: p.costPrice,
                            price: p.price,
                            profitMargin: profitMargin,
                        }
                    });
                    productId = newProduct.id;
                    processedCount++;
                }

                if (productId && p.stocks && p.stocks.length > 0) {
                    for (const s of p.stocks) {
                        await tx.productStock.upsert({
                            where: {
                                productId_branchId: {
                                    productId: productId,
                                    branchId: s.branchId
                                }
                            },
                            update: { quantity: s.quantity },
                            create: {
                                productId: productId,
                                branchId: s.branchId,
                                quantity: s.quantity
                            }
                        });
                    }
                }
            }
        }, {
            timeout: 20000 
        });

        revalidatePath("/admin/products");
        return { success: true, count: processedCount, skippedCount: skippedSkus.length, skippedSkus };
    } catch (error) {
        console.error("Bulk upsert error:", error);
        return { success: false, error: "Error en carga masiva: " + (error instanceof Error ? error.message : "Error desconocido") };
    }
}
