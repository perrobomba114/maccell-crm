"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SparePartCreateInput, SparePartUpdateInput } from "@/types/spare-parts";

export async function getSpareParts() {
    try {
        const spareParts = await prisma.sparePart.findMany({
            where: {
                deletedAt: null,
            },
            include: {
                category: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Check if pricePos is missing from the first result (stale client issue)
        if (spareParts.length > 0 && (spareParts[0] as any).pricePos === undefined) {
            console.warn("Detected stale client in getSpareParts (missing pricePos). Fetching manually.");
            try {
                // Fetch just IDs and pricePos raw
                const rawPrices = await prisma.$queryRaw`SELECT id, "pricePos" FROM "spare_parts" WHERE "deletedAt" IS NULL`;

                // Create map for O(1) lookup
                const priceMap = new Map();
                if (Array.isArray(rawPrices)) {
                    rawPrices.forEach((p: any) => priceMap.set(p.id, p.pricePos));
                }

                // Merge
                spareParts.forEach((part: any) => {
                    part.pricePos = priceMap.get(part.id) || 0;
                });
            } catch (rawError) {
                console.error("Failed to fetch raw pricePos:", rawError);
            }
        }

        return { success: true, spareParts };
    } catch (error) {
        console.error("Get spare parts error:", error);
        return { success: false, error: "Error al obtener repuestos" };
    }
}

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
                // Raw update pricePos
                if (data.pricePos) {
                    await prisma.$executeRaw`UPDATE "spare_parts" SET "pricePos" = ${data.pricePos} WHERE "id" = ${sparePart.id}`;
                    // Manually patch result
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
        // Check SKU uniqueness if changing
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
            // categoryId: data.categoryId, // Removing scalar update to fix "Unknown argument" error
            stockLocal: data.stockLocal,
            stockDepot: data.stockDepot,
            maxStockLocal: data.maxStockLocal,
            priceUsd: data.priceUsd,
            priceArg: data.priceArg,
            pricePos: data.pricePos,
        };

        // Try standard update first
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
            // Fallback: If error is about "Unknown argument", try updating without pricePos, then raw update pricePos
            if (updateError.message && updateError.message.includes("Unknown argument")) {
                console.warn("Retrying update without pricePos due to stale client...");
                const { pricePos, ...safeData } = updateData;

                // Restore logic to connect category if categoryId was provided
                if (data.categoryId) {
                    safeData.category = {
                        connect: { id: data.categoryId }
                    };
                }

                // Note: updates to scalar fields in safeData are fine.
                // We just needed to ensure 'pricePos' was removed from the main update execution path 
                // that failed validation.

                const sparePart = await prisma.sparePart.update({
                    where: { id },
                    data: safeData,
                });

                // Now raw update pricePos
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
        // Use raw query for performance
        // Note: Prisma schema uses camelCase, but DB usually uses mixed case if Quoted or lowercase if not.
        // Prisma standard naming in PostGres: table "spare_parts", columns ...
        // We know from previous step (db push) that mapped names are consistent.
        // We will fallback to using findMany + update in transaction if raw fails, but raw is better.
        // Actually, if we use queryRaw, we must be sure of table names.
        // @map("spare_parts") is used.
        // Column names: name, sku... likely lowercase or quoted.
        // Safer to iterate if not sure? No, "EXTREMELY CAREFUL".
        // Let's use Prisma updateMany not supported? 
        // updateMany does NOT support referencing other columns.

        // I will use $executeRaw but be careful with Quotes
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

export type SparePartImportRow = {
    sku: string;
    name: string;
    categoryName?: string;
    stockLocal: number;
    stockDepot: number;
    maxStockLocal: number;
    priceUsd: number;
    brand: string;
    pricePos?: number;
};

export async function bulkUpsertSpareParts(parts: SparePartImportRow[]) {
    try {
        let count = 0;
        const errors: string[] = [];

        // Fetch current dollar rate
        let rate = 0;
        try {
            const res = await fetch("https://dolarapi.com/v1/dolares/oficial", { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                rate = data.venta;
            }
        } catch (e) {
            console.error("Error fetching dollar rate for import:", e);
        }

        for (const p of parts) {
            try {
                // Find or create category
                let categoryId = "";
                if (p.categoryName) {
                    const cat = await prisma.category.findFirst({
                        where: { name: { equals: p.categoryName, mode: "insensitive" } },
                    });
                    if (cat) {
                        categoryId = cat.id;
                    } else {
                        const newCat = await prisma.category.create({
                            data: {
                                name: p.categoryName,
                                type: "PART"
                            }
                        });
                        categoryId = newCat.id;
                    }
                } else {
                    errors.push(`SKU ${p.sku}: Sin categoría`);
                    continue;
                }

                const priceArg = rate > 0 ? Math.ceil(p.priceUsd * rate) : 0;

                const existing = await prisma.sparePart.findUnique({
                    where: { sku: p.sku },
                });

                if (existing) {
                    await updateSparePart(existing.id, {
                        name: p.name,
                        brand: p.brand,
                        categoryId,
                        stockLocal: p.stockLocal,
                        stockDepot: p.stockDepot,
                        maxStockLocal: p.maxStockLocal,
                        priceUsd: p.priceUsd,
                        priceArg: priceArg > 0 ? priceArg : existing.priceArg,
                        pricePos: p.pricePos ?? 0
                    }, { skipRevalidation: true });
                } else {
                    await createSparePart({
                        sku: p.sku,
                        name: p.name,
                        brand: p.brand,
                        categoryId,
                        stockLocal: p.stockLocal,
                        stockDepot: p.stockDepot,
                        maxStockLocal: p.maxStockLocal,
                        priceUsd: p.priceUsd,
                        priceArg: priceArg,
                        pricePos: p.pricePos ?? 0
                    }, { skipRevalidation: true });
                }
                count++;
            } catch (err) {
                console.error(`Error processing SKU ${p.sku}:`, err);
                errors.push(`SKU ${p.sku}: Error al procesar`);
            }
        }

        revalidatePath("/admin/repuestos");
        return { success: true, count, errors };
    } catch (error) {
        console.error("Bulk upsert error:", error);
        return { success: false, error: "Error general en importación" };
    }
}

export async function getAllSparePartsForExport() {
    try {
        const spareParts = await prisma.sparePart.findMany({
            where: { deletedAt: null },
            include: { category: true },
            orderBy: { name: "asc" }
        });

        // Fallback for stale client
        if (spareParts.length > 0 && (spareParts[0] as any).pricePos === undefined) {
            try {
                const rawPrices = await prisma.$queryRaw`SELECT id, "pricePos" FROM "spare_parts" WHERE "deletedAt" IS NULL`;
                const priceMap = new Map();
                if (Array.isArray(rawPrices)) {
                    rawPrices.forEach((p: any) => priceMap.set(p.id, p.pricePos));
                }
                spareParts.forEach((part: any) => {
                    part.pricePos = priceMap.get(part.id) || 0;
                });
            } catch (e) { console.error("Export fallback error", e); }
        }

        return { success: true, spareParts };
    } catch (error) {
        console.error("Export error:", error);
        return { success: false, error: "Error al obtener datos para exportar" };
    }
}

export async function replenishSparePart(id: string, quantity: number) {
    try {
        const sparePart = await prisma.sparePart.findUnique({
            where: { id }
        });

        if (!sparePart) {
            return { success: false, error: "Repuesto no encontrado" };
        }

        if (sparePart.stockDepot < quantity) {
            return { success: false, error: "No hay suficiente stock en depósito" };
        }

        await prisma.sparePart.update({
            where: { id },
            data: {
                stockDepot: { decrement: quantity },
                stockLocal: { increment: quantity }
            }
        });

        revalidatePath("/admin/repuestos");
        return { success: true };
    } catch (error) {
        console.error("Replenish error:", error);
        return { success: false, error: "Error al reponer stock" };
    }
}
