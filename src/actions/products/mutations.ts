"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";

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
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") {
        return { success: false, error: "No autorizado" };
    }
    try {
        const existing = await prisma.product.findUnique({
            where: { sku: data.sku },
        });

        if (existing) {
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
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") {
        return { success: false, error: "No autorizado" };
    }
    try {
        const { stocks, ...updateData } = data;

        const current = await prisma.product.findUnique({ where: { id } });
        if (!current) return { success: false, error: "Producto no encontrado" };

        let price = current.price;

        if (updateData.price !== undefined) {
            price = updateData.price;
        }

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
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") {
        return { success: false, error: "No autorizado" };
    }
    try {
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
