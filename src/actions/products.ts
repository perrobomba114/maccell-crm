"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
            deletedAt: null, // Soft delete check
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

        // --- BRANCH STOCK SORTING LOGIC ---
        if (sortColumn.startsWith("stock_")) {
            const targetBranchId = sortColumn.replace("stock_", "");

            // 1. Fetch ALL matching IDs (lightweight)
            const allMatchingProducts = await prisma.product.findMany({
                where,
                select: { id: true }
            });

            const allIds = allMatchingProducts.map(p => p.id);
            const total = allIds.length;

            // 2. Fetch stocks for these products in the target branch
            const stocks = await prisma.productStock.findMany({
                where: {
                    productId: { in: allIds },
                    branchId: targetBranchId
                },
                select: { productId: true, quantity: true }
            });

            // Map productId -> quantity
            const stockMap = new Map<string, number>();
            stocks.forEach(s => stockMap.set(s.productId, s.quantity));

            // 3. Sort IDs in memory
            allIds.sort((a, b) => {
                const qtyA = stockMap.get(a) || 0;
                const qtyB = stockMap.get(b) || 0;

                if (sortDirection === "asc") return qtyA - qtyB;
                return qtyB - qtyA;
            });

            // 4. Slice for pagination
            const pagedIds = allIds.slice(skip, skip + limit);

            // 5. Fetch full data for the slice
            const products = await prisma.product.findMany({
                where: { id: { in: pagedIds } },
                include: {
                    category: true,
                    stock: true,
                }
            });

            // 6. Re-order results to match the sorted pagedIds (database doesn't guarantee order with 'in')
            const sortedProducts = pagedIds.map(id => products.find(p => p.id === id)).filter(Boolean);

            return { success: true, products: sortedProducts, total, totalPages: Math.ceil(total / limit) };
        }

        // --- STANDARD SORTING LOGIC ---

        // Safe sort columns
        const allowedSorts = ["sku", "name", "price", "costPrice", "createdAt"];
        const safeSortColumn = allowedSorts.includes(sortColumn) ? sortColumn : "sku";
        const safeSortDirection = sortDirection === "asc" ? "asc" : "desc";

        const orderBy: any[] = [];

        // Primary sort
        orderBy.push({ [safeSortColumn]: safeSortDirection });

        // Secondary stable sort to prevent pagination jitter
        if (safeSortColumn !== "id") {
            orderBy.push({ id: "desc" });
        }

        const [products, total] = await prisma.$transaction([
            prisma.product.findMany({
                where,
                include: {
                    category: true,
                    stock: true, // Include stock per branch
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

export async function createProduct(data: {
    name: string;
    sku: string;
    categoryId?: string;
    costPrice: number;
    profitMargin: number;
    price: number;
    description?: string;
    stocks?: { branchId: string; quantity: number }[];
}) {
    try {
        // Check if SKU exists
        const existing = await prisma.product.findUnique({
            where: { sku: data.sku },
        });

        if (existing) {
            // If soft deleted, maybe restore? For now, just error.
            if (existing.deletedAt) {
                return { success: false, error: "Un producto con este SKU existe en la papelera." };
            }
            return { success: false, error: "El SKU ya existe." };
        }

        const product = await prisma.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: {
                    name: data.name,
                    sku: data.sku,
                    categoryId: data.categoryId,
                    costPrice: data.costPrice,
                    profitMargin: data.profitMargin,
                    price: data.price,
                    description: data.description,
                },
            });

            if (data.stocks && data.stocks.length > 0) {
                await tx.productStock.createMany({
                    data: data.stocks.map(s => ({
                        productId: newProduct.id,
                        branchId: s.branchId,
                        quantity: Number(s.quantity)
                    }))
                });
            }

            return newProduct;
        });

        revalidatePath("/admin/products");
        return { success: true, product };
    } catch (error) {
        console.error("Create product error:", error);
        return { success: false, error: "Error al crear producto" };
    }
}

export async function updateProduct(id: string, data: {
    name?: string;
    categoryId?: string;
    costPrice?: number;
    profitMargin?: number;
    description?: string;
    sku?: string;
    price?: number;
    stocks?: { branchId: string; quantity: number }[];
}) {
    try {
        const { stocks, ...updateData } = data;

        // Fetch current product to recalculate price if needed
        const current = await prisma.product.findUnique({ where: { id } });
        if (!current) return { success: false, error: "Producto no encontrado" };

        let price = current.price;

        // If price is explicitly provided, use it
        if (updateData.price !== undefined) {
            price = updateData.price;
        }

        // Check availability of SKU if it's being changed
        if (updateData.sku && updateData.sku !== current.sku) {
            const existingSku = await prisma.product.findFirst({
                where: {
                    sku: updateData.sku,
                    id: { not: id }
                }
            });
            if (existingSku) {
                return { success: false, error: "El SKU ya existe en otro producto." };
            }
        }
        // Otherwise recalculate if cost or margin changed, BUT ONLY if price wasn't explicitly set
        else if ((updateData.costPrice !== undefined || updateData.profitMargin !== undefined) && updateData.price === undefined) {
            const newCost = updateData.costPrice !== undefined ? updateData.costPrice : current.costPrice;
            const newMargin = updateData.profitMargin !== undefined ? updateData.profitMargin : current.profitMargin;

            price = newCost * (1 + newMargin / 100);
            price = parseFloat(price.toFixed(2));
        }

        const product = await prisma.$transaction(async (tx) => {
            const updatedProduct = await tx.product.update({
                where: { id },
                data: {
                    ...updateData,
                    price,
                },
            });

            if (stocks && stocks.length > 0) {
                for (const stock of stocks) {
                    await tx.productStock.upsert({
                        where: {
                            productId_branchId: {
                                productId: id,
                                branchId: stock.branchId,
                            },
                        },
                        create: {
                            productId: id,
                            branchId: stock.branchId,
                            quantity: Number(stock.quantity),
                        },
                        update: {
                            quantity: Number(stock.quantity),
                        },
                    });
                }
            }

            return updatedProduct;
        });

        revalidatePath("/admin/products");
        return { success: true, product };
    } catch (error) {
        console.error("Update product error:", error);
        return { success: false, error: "Error al actualizar producto" };
    }
}

export async function deleteProduct(id: string) {
    try {
        // Soft delete
        await prisma.product.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        revalidatePath("/admin/products");
        return { success: true };
    } catch (error) {
        console.error("Delete product error:", error);
        return { success: false, error: "Error al eliminar producto" };
    }
}

// Ensure stock exists for a branch (can be called lazy or upfront)
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

// --- BULK OPERATIONS FOR IMPORT/EXPORT ---

export async function getAllProductsForExport() {
    try {
        const products = await prisma.product.findMany({
            where: { deletedAt: null },
            include: {
                category: true,
                stock: {
                    include: { branch: true } // Include branch info to map stock to columns
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
    try {
        const categories = await prisma.category.findMany();
        const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
        const skippedSkus: string[] = [];
        let processedCount = 0;

        await prisma.$transaction(async (tx) => {
            for (const p of products) {
                // 1. Resolve Category (only if provided)
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

                // 2. Check existence
                const existingProduct = await tx.product.findUnique({
                    where: { sku: p.sku }
                });

                let productId = existingProduct?.id;

                if (existingProduct) {
                    // --- UPDATE SCENARIO ---
                    // Build update object dynamically. Only include defined fields.
                    const updateData: any = {};
                    if (p.name !== undefined && p.name !== "") updateData.name = p.name;
                    if (p.description !== undefined) updateData.description = p.description;
                    if (categoryId !== undefined) updateData.categoryId = categoryId;

                    // Handle Price/Cost logic
                    if (p.costPrice !== undefined) updateData.costPrice = p.costPrice;
                    if (p.price !== undefined) updateData.price = p.price;

                    // Recalculate margin if both new prices are available OR safely reuse existing
                    const finalCost = p.costPrice !== undefined ? p.costPrice : existingProduct.costPrice;
                    const finalPrice = p.price !== undefined ? p.price : existingProduct.price;

                    if (finalCost > 0) {
                        updateData.profitMargin = ((finalPrice - finalCost) / finalCost) * 100;
                    }

                    // Restore if deleted
                    updateData.deletedAt = null;

                    if (Object.keys(updateData).length > 0) {
                        await tx.product.update({
                            where: { id: existingProduct.id },
                            data: updateData
                        });
                    }
                    processedCount++;
                } else {
                    // --- CREATE SCENARIO ---
                    // Must have required fields
                    if (!p.name || p.price === undefined || p.costPrice === undefined) {
                        // Skip quietly, collect SKU
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
                            categoryId: categoryId, // might be undefined/null, acceptable? Schema allows null categoryId? 
                            // Note: Prisma schema usually has categoryId String? (optional). Assuming yes.
                            costPrice: p.costPrice,
                            price: p.price,
                            profitMargin: profitMargin,
                        }
                    });
                    productId = newProduct.id;
                    processedCount++;
                }

                // 3. Update Stocks (Always, if provided)
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
            timeout: 20000 // Increase timeout for bulk ops
        });

        revalidatePath("/admin/products");
        return { success: true, count: processedCount, skippedCount: skippedSkus.length, skippedSkus };
    } catch (error) {
        console.error("Bulk upsert error:", error);
        return { success: false, error: "Error en carga masiva: " + (error instanceof Error ? error.message : "Error desconocido") };
    }
}
