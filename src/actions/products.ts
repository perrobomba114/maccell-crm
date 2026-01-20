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

        console.log("getProducts params:", { page, limit, skip, where, sortColumn, sortDirection });

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
        // Otherwise recalculate if cost or margin changed
        else if (updateData.costPrice !== undefined || updateData.profitMargin !== undefined) {
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
    name: string;
    description?: string;
    categoryName?: string;
    costPrice: number;
    price: number;
    stocks: { branchId: string; quantity: number }[];
};

export async function bulkUpsertProducts(products: ProductImportRow[]) {
    try {
        // We'll process sequentially or in small batches to simple handling of categories creation
        // Optimization: Pre-fetch categories
        const categories = await prisma.category.findMany();
        const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

        await prisma.$transaction(async (tx) => {
            for (const p of products) {
                // 1. Resolve Category
                let categoryId = null;
                if (p.categoryName) {
                    const normalizedCat = p.categoryName.toLowerCase();
                    if (categoryMap.has(normalizedCat)) {
                        categoryId = categoryMap.get(normalizedCat);
                    } else {
                        // Create new category on the fly
                        const newCat = await tx.category.create({
                            data: { name: p.categoryName }
                        });
                        categoryMap.set(normalizedCat, newCat.id);
                        categoryId = newCat.id;
                    }
                }

                // 2. Upsert Product
                // Calculate margin if strictly cost and price specific
                // Or verify logic. If cost=0, margin=0.
                const profitMargin = p.costPrice > 0
                    ? ((p.price - p.costPrice) / p.costPrice) * 100
                    : 0;

                const upsertData = {
                    name: p.name,
                    description: p.description,
                    categoryId: categoryId,
                    costPrice: p.costPrice,
                    price: p.price,
                    profitMargin: profitMargin,
                    deletedAt: null // Restore if it was deleted
                };

                const product = await tx.product.upsert({
                    where: { sku: p.sku },
                    update: upsertData,
                    create: {
                        sku: p.sku,
                        ...upsertData,
                        createdAt: new Date(),
                    }
                });

                // 3. Update Stocks
                if (p.stocks && p.stocks.length > 0) {
                    for (const s of p.stocks) {
                        await tx.productStock.upsert({
                            where: {
                                productId_branchId: {
                                    productId: product.id,
                                    branchId: s.branchId
                                }
                            },
                            update: { quantity: s.quantity },
                            create: {
                                productId: product.id,
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
        return { success: true, count: products.length };
    } catch (error) {
        console.error("Bulk upsert error:", error);
        return { success: false, error: "Error en carga masiva: " + (error instanceof Error ? error.message : "Error desconocido") };
    }
}
