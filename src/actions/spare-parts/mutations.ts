"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SparePartCreateInput, SparePartUpdateInput } from "@/types/spare-parts";

export async function createSparePart(data: SparePartCreateInput & { priceArg?: number }, options?: { skipRevalidation?: boolean }) {
    try {
        const existing = await prisma.sparePart.findUnique({
            where: { sku: data.sku },
        });

        if (existing) {
            return { success: false, error: "Ya existe un repuesto con ese SKU" };
        }

        const createData: any = {
            name: data.name,
            sku: data.sku,
            brand: data.brand,
            categoryId: data.categoryId,
            stockLocal: data.stockLocal,
            stockDepot: data.stockDepot,
            maxStockLocal: data.maxStockLocal,
            priceUsd: data.priceUsd,
            priceArg: data.priceArg || 0,
            pricePos: data.pricePos || 0,
        };

        let sparePart;
        try {
            sparePart = await prisma.sparePart.create({
                data: createData,
            });
        } catch (createError: any) {
            if (createError.message && createError.message.includes("Unknown argument")) {
                console.warn("Retrying create without pricePos due to stale client...");
                const { pricePos, ...safeData } = createData;
                sparePart = await prisma.sparePart.create({
                    data: safeData,
                });
                if (data.pricePos) {
                    await prisma.$executeRaw`UPDATE "spare_parts" SET "pricePos" = ${data.pricePos} WHERE "id" = ${sparePart.id}`;
                    (sparePart as any).pricePos = data.pricePos;
                }
            } else {
                throw createError;
            }
        }

        revalidatePath("/admin/repuestos");
        return { success: true, sparePart };
    } catch (error) {
        console.error("Create spare part error:", error);
        return { success: false, error: "Error al crear repuesto" };
    }
}

export async function updateSparePart(id: string, data: SparePartUpdateInput, options?: { skipRevalidation?: boolean }) {
    try {
        if (data.sku) {
            const existing = await prisma.sparePart.findFirst({
                where: { sku: data.sku, id: { not: id } },
            });
            if (existing) {
                return { success: false, error: "SKU ya está en uso" };
            }
        }

        const updateData: any = {
            name: data.name,
            sku: data.sku,
            brand: data.brand,
            stockLocal: data.stockLocal,
            stockDepot: data.stockDepot,
            maxStockLocal: data.maxStockLocal,
            priceUsd: data.priceUsd,
            priceArg: data.priceArg,
            pricePos: data.pricePos,
        };

        try {
            if (data.categoryId) {
                updateData.category = {
                    connect: { id: data.categoryId }
                };
            }

            const sparePart = await prisma.sparePart.update({
                where: { id },
                data: updateData,
            });
            revalidatePath("/admin/repuestos");
            return { success: true, sparePart };
        } catch (updateError: any) {
            if (updateError.message && updateError.message.includes("Unknown argument")) {
                console.warn("Retrying update without pricePos due to stale client...");
                const { pricePos, ...safeData } = updateData;

                if (data.categoryId) {
                    safeData.category = {
                        connect: { id: data.categoryId }
                    };
                }

                const sparePart = await prisma.sparePart.update({
                    where: { id },
                    data: safeData,
                });

                if (data.pricePos !== undefined) {
                    await prisma.$executeRaw`UPDATE "spare_parts" SET "pricePos" = ${data.pricePos} WHERE "id" = ${id}`;
                }

                if (!options?.skipRevalidation) {
                    revalidatePath("/admin/repuestos");
                }
                return { success: true, sparePart: { ...sparePart, pricePos: data.pricePos || 0 } as any };
            }
            throw updateError;
        }

    } catch (error: any) {
        console.error("Update spare part error:", error);
        return { success: false, error: error.message || "Error al actualizar repuesto" };
    }
}

export async function deleteSparePart(id: string) {
    try {
        await prisma.sparePart.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        revalidatePath("/admin/repuestos");
        return { success: true };
    } catch (error) {
        console.error("Delete spare part error:", error);
        return { success: false, error: "Error al eliminar repuesto" };
    }
}

export async function updateSparePartsPrices(rate: number) {
    try {
        await prisma.$executeRaw`
            UPDATE "spare_parts"
            SET "priceArg" = "priceUsd" * ${rate}
            WHERE "deletedAt" IS NULL
        `;

        revalidatePath("/admin/repuestos");
        return { success: true };
    } catch (error) {
        console.error("Update prices error:", error);
        return { success: false, error: "Error al actualizar precios" };
    }
}
