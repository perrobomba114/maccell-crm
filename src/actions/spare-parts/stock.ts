"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth-actions";
import { createSparePart, updateSparePart } from "./mutations";

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

export async function replenishSparePart(id: string, quantity: number) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: "No autorizado" };

        const sparePart = await prisma.sparePart.findUnique({
            where: { id }
        });

        if (!sparePart) {
            return { success: false, error: "Repuesto no encontrado" };
        }

        if (quantity <= 0) {
            return { success: false, error: "La cantidad debe ser mayor a cero" };
        }

        if (sparePart.stockDepot < quantity) {
            return { success: false, error: "No hay suficiente stock en depósito" };
        }

        const branchId = user.branch?.id ?? (await prisma.branch.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id;
        if (!branchId) return { success: false, error: "No hay sucursal disponible para registrar el movimiento" };

        await prisma.$transaction(async (tx) => {
            await tx.sparePart.update({
                where: { id },
                data: {
                    stockDepot: { decrement: quantity },
                    stockLocal: { increment: quantity }
                }
            });

            await (tx as any).sparePartHistory.create({
                data: {
                    sparePartId: id,
                    userId: user.id,
                    branchId,
                    quantity,
                    reason: `Reposición desde depósito`,
                    isChecked: false
                }
            });
        });

        revalidatePath("/admin/repuestos");
        return { success: true };
    } catch (error) {
        console.error("Replenish error:", error);
        return { success: false, error: "Error al reponer stock" };
    }
}

export async function decrementStockLocal(id: string) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: "No autorizado" };

        const sparePart = await prisma.sparePart.findUnique({
            where: { id }
        });

        if (!sparePart) {
            return { success: false, error: "Repuesto no encontrado" };
        }

        if (sparePart.stockLocal <= 0) {
            return { success: false, error: "No hay stock local para descontar" };
        }

        await prisma.$transaction(async (tx) => {
            await tx.sparePart.update({
                where: { id },
                data: {
                    stockLocal: { decrement: 1 }
                }
            });

            if (user.branch?.id) {
                await (tx as any).sparePartHistory.create({
                    data: {
                        sparePartId: id,
                        userId: user.id,
                        branchId: user.branch.id,
                        quantity: -1,
                        reason: "Baja manual (stock local)",
                        isChecked: false
                    }
                });
            } else {
                const defaultBranch = await prisma.branch.findFirst({
                    orderBy: { createdAt: 'asc' }, 
                    select: { id: true, name: true }
                });

                if (defaultBranch) {
                    await (tx as any).sparePartHistory.create({
                        data: {
                            sparePartId: id,
                            userId: user.id,
                            branchId: defaultBranch.id,
                            quantity: -1,
                            reason: `Baja manual (Admin sin sucursal - asignado a ${defaultBranch.name})`,
                            isChecked: false
                        }
                    });
                } else {
                    throw new Error("No existen sucursales en el sistema para registrar la baja.");
                }
            }
        });

        revalidatePath("/admin/repuestos");
        return { success: true };
    } catch (error: any) {
        console.error("Decrement error:", error);
        return { success: false, error: error.message || "Error al descontar stock" };
    }
}

export async function bulkUpsertSpareParts(parts: SparePartImportRow[]) {
    try {
        let count = 0;
        const errors: string[] = [];

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
                        pricePos: p.pricePos ?? existing.pricePos
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
