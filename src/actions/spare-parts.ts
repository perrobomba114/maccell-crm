"use server";

import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { SparePartCreateInput, SparePartUpdateInput } from "@/types/spare-parts";
import { getCurrentUser } from "@/actions/auth-actions";

export async function getSpareParts(options?: { sort?: string; order?: 'asc' | 'desc' }) {
    try {
        const { sort = 'createdAt', order = 'desc' } = options || {};

        let orderBy: any = {};
        if (sort === 'category') {
            orderBy = { category: { name: order } };
        } else if (sort === 'reponer') {
            // Default sort for DB query when using computed sort
            orderBy = { name: 'asc' };
        } else {
            orderBy = { [sort]: order };
        }

        const spareParts = await prisma.sparePart.findMany({
            where: {
                deletedAt: null,
            },
            include: {
                category: true,
            },
            orderBy: orderBy,
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

        // Handle computed sort for 'reponer'
        if (sort === 'reponer') {
            spareParts.sort((a, b) => {
                const neededA = Math.max(0, a.maxStockLocal - a.stockLocal);
                const reponerA = Math.min(neededA, a.stockDepot);

                const neededB = Math.max(0, b.maxStockLocal - b.stockLocal);
                const reponerB = Math.min(neededB, b.stockDepot);

                if (order === 'asc') return reponerA - reponerB;
                return reponerB - reponerA;
            });
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

        // Use transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
            await tx.sparePart.update({
                where: { id },
                data: {
                    stockLocal: { decrement: 1 }
                }
            });

            // Log history
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
                console.warn("User has no branch, skipping history branch link or failing?");
                // If branch is required we must provide one.
                // Assuming admin might operate without branch?
                // But schema requires branchId.
                // Let's try to fetch a default or fail.
                // The prompt implies multiple branches exist.
                // If user is ADMIN, maybe they are associated with a main branch?
                // Let's assume user.branch is populated. If not, we might fail.
                // For safety, if no branch, we can't log 'branchId'.
                // But DB requires it.
                // Implementation detail: we will error if no branch, as a 'Sale' needs a branch.
                // A 'baja' physically happens somewhere.
                throw new Error("El usuario no tiene sucursal asignada para registrar la baja.");
            }
        });

        revalidatePath("/admin/repuestos");
        return { success: true };
    } catch (error: any) {
        console.error("Decrement error:", error);
        return { success: false, error: error.message || "Error al descontar stock" };
    }
}

export async function getSparePartsHistory({
    page = 1,
    limit = 25,
    date
}: {
    page?: number,
    limit?: number,
    date?: string // YYYY-MM-DD
}) {
    try {
        const where: any = {};

        if (date) {
            // Adjust for timezone if needed, or just match the day in general
            // Date string comes as YYYY-MM-DD
            const start = new Date(date);
            // Fix timezone offset issues by treating it as local or UTC?
            // "date" usually implies local date selected in picker.
            // Let's assume start of day 00:00 to 23:59 local time (server time).
            // But server is UTC-3 likely.
            // If date is "2024-02-03", new Date("2024-02-03") is UTC 00:00.
            // If we want Argentina time, we need to be careful.
            // Simplified: Filter by >= date T00:00 and <= date T23:59

            // To ensure we cover the full day regardless of timezone shifts:
            const startDate = new Date(date);
            // set to 00:00 UTC?
            startDate.setUTCHours(0, 0, 0, 0);
            // Actually, Prisma stores DateTime as UTC. 
            // If user selects "Today" in Argentina, it matches a range in UTC.
            // For simplicity, we'll try to match the date string part logic if possible?
            // No, Prisma doesn't support generic string matching easily on DateTime.

            // Better approach:
            // Input date "2024-02-03". 
            // Start: 2024-02-03T00:00:00.000 (Local/UTC?)
            // We'll construct ranges.

            // If we assume the input is YYYY-MM-DD
            const startOfDay = new Date(`${date}T00:00:00`);
            const endOfDay = new Date(`${date}T23:59:59.999`);

            where.createdAt = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        const skip = (page - 1) * limit;

        const [history, total] = await Promise.all([
            (prisma as any).sparePartHistory.findMany({
                where,
                include: {
                    user: { select: { name: true, email: true } },
                    branch: { select: { name: true, code: true } },
                    sparePart: { select: { name: true, sku: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            (prisma as any).sparePartHistory.count({ where })
        ]);

        return {
            success: true,
            history,
            pagination: {
                total,
                limit,
                page,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error("Get history error:", error);
        return { success: false, error: "Error al obtener historial" };
    }
}

export async function toggleHistoryChecked(id: string) {
    try {
        const item = await (prisma as any).sparePartHistory.findUnique({ where: { id } });
        if (!item) return { success: false, error: "Registro no encontrado" };

        await (prisma as any).sparePartHistory.update({
            where: { id },
            data: { isChecked: !item.isChecked }
        });

        // Loophole: revalidatePath might not work dynamic if the path is dynamic.
        // But the page is /admin/repuestos/historial (static).
        revalidatePath("/admin/repuestos/historial");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar" };
    }
}

/**
 * Backfill/Sync History from RepairParts
 * Scans RepairParts from the last X days and creates History entries if missing.
 */
export async function syncRepairHistoryAction() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "ADMIN") {
            return { success: false, error: "No autorizado" };
        }

        // 1. Fetch RepairParts from last 60 days
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 60);

        const repairParts = await prisma.repairPart.findMany({
            where: {
                assignedAt: {
                    gte: limitDate
                }
            },
            include: {
                repair: true,
                sparePart: true
            }
        });

        console.log(`[syncHistory] Found ${repairParts.length} repair parts since ${limitDate.toISOString()}`);

        let addedCount = 0;

        for (const rp of repairParts) {
            // Determine Reason String (Must match pattern used in other actions)
            // Pattern: "Reparación #1234..."
            const ticketPattern = `Reparación #${rp.repair.ticketNumber}`;

            // Check if exists
            const existing = await (prisma as any).sparePartHistory.findFirst({
                where: {
                    sparePartId: rp.sparePartId,
                    // Fuzzy match on reason to avoid duplicates
                    reason: {
                        contains: ticketPattern
                    },
                    // Optional: check date proximity?
                    // createdAt: { gte: rp.assignedAt, lte: ... } 
                    // Let's rely on Reason + Part ID for now.
                }
            });

            if (!existing) {
                // Determine User ID (Technician or Creator)
                const userId = rp.repair.assignedUserId || rp.repair.userId;

                // Determine Branch (Repair Branch)
                const branchId = rp.repair.branchId;

                await (prisma as any).sparePartHistory.create({
                    data: {
                        sparePartId: rp.sparePartId,
                        userId: userId,
                        branchId: branchId,
                        quantity: -rp.quantity, // Usage = Negative
                        reason: `${ticketPattern} (Sincronizado)`,
                        isChecked: true, // Auto-check synced items?
                        createdAt: rp.assignedAt // Backdate!
                    }
                });
                addedCount++;
            }
        }

        revalidatePath("/admin/repuestos/historial");
        return { success: true, count: addedCount };

    } catch (error: any) {
        console.error("Error syncing history:", error);
        return { success: false, error: `Error: ${error.message || "Desconocido"}` };
    }
}
