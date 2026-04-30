"use server";

import { db } from "@/lib/db";
import { saveRepairImages } from "@/lib/actions/upload";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs/promises";
import { isValidImg } from "@/lib/utils";
import { getCurrentUser } from "@/actions/auth-actions";

export async function updateRepairAction(formData: FormData) {
    try {
        const repairId = formData.get("repairId") as string;
        const customerName = formData.get("customerName") as string;
        const customerPhone = formData.get("customerPhone") as string;
        const customerEmail = formData.get("customerEmail") as string;
        const deviceBrand = formData.get("deviceBrand") as string;
        const deviceModel = formData.get("deviceModel") as string;
        const problemDescription = formData.get("problemDescription") as string;
        const promisedAt = new Date(formData.get("promisedAt") as string);
        const estimatedPrice = parseFloat(formData.get("estimatedPrice") as string) || 0;
        const statusId = parseInt(formData.get("statusId") as string) || undefined;
        const diagnosis = formData.get("diagnosis") as string || null;
        const isWarranty = formData.get("isWarranty") === "true";
        const isWet = formData.get("isWet") === "true";
        let assignedUserId: string | null = formData.get("assignedUserId") as string;
        if (!assignedUserId || assignedUserId === "unassigned") assignedUserId = null;

        const partsJson = formData.get("spareParts") as string;
        const parts = partsJson ? JSON.parse(partsJson) : [];

        const existingRepair = await db.repair.findUnique({
            where: { id: repairId },
            include: { customer: true }
        });

        if (!existingRepair) return { success: false, error: "Reparación no encontrada" };

        const currentUser = await getCurrentUser();
        if (!currentUser) return { success: false, error: "No autorizado" };

        await db.customer.update({
            where: { id: existingRepair.customerId },
            data: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail || null
            }
        });

        const statusIdNum = statusId ? parseInt(statusId.toString()) : undefined;
        const statusChanged = statusIdNum !== undefined && statusIdNum !== existingRepair.statusId;

        await db.repair.update({
            where: { id: repairId },
            data: {
                deviceBrand,
                deviceModel,
                problemDescription,
                promisedAt,
                estimatedPrice,
                isWarranty,
                isWet,
                assignedUserId,
                diagnosis,
                ...(statusIdNum ? { statusId: statusIdNum } : {}),
                ...(statusChanged ? {
                    statusHistory: {
                        create: {
                            fromStatusId: existingRepair.statusId,
                            toStatusId: statusIdNum,
                            userId: currentUser?.id
                        }
                    }
                } : {})
            }
        });

        const submittedKeepImagesJson = formData.get("existingImages") as string;
        const originalImagesJson = formData.get("originalImages") as string;

        const submittedKeepImages = JSON.parse(submittedKeepImagesJson || "[]") as string[];
        const originalLoadImages = JSON.parse(originalImagesJson || "[]") as string[];

        const explicitlyDeleted = originalLoadImages.filter(img => !submittedKeepImages.includes(img));

        const freshRepair = await db.repair.findUnique({
            where: { id: repairId },
            select: { deviceImages: true }
        });
        const currentDbImages = freshRepair?.deviceImages || [];

        const imagesToKeep = currentDbImages.filter(img => !explicitlyDeleted.includes(img));

        const newImagesPaths = await saveRepairImages(formData, existingRepair.ticketNumber);

        const finalImages = [...imagesToKeep, ...newImagesPaths].filter(isValidImg);

        if (explicitlyDeleted.length > 0) {
            (async () => {
                try {
                    const publicDir = path.join(process.cwd(), "public");
                    for (const imgPath of explicitlyDeleted) {
                        if (!imgPath.includes('..') && imgPath.startsWith('/repairs/images/')) {
                            const fullPath = path.join(publicDir, imgPath);
                            await fs.unlink(fullPath).catch(err => console.error(`Failed to delete file ${imgPath}:`, err.message));
                        }
                    }
                } catch (err) {
                    console.error("Error during file cleanup:", err);
                }
            })();
        }

        await db.repair.update({
            where: { id: repairId },
            data: { deviceImages: finalImages }
        });

        if (partsJson) { 
            const currentRepairParts = await db.repairPart.findMany({
                where: { repairId },
                select: { id: true, sparePartId: true, quantity: true }
            });

            const newPartIds = parts.map((p: any) => p.id);
            const currentPartIds = currentRepairParts.map(p => p.sparePartId);

            const partsToAdd = parts.filter((p: any) => !currentPartIds.includes(p.id));
            const partsToRemove = currentRepairParts.filter(p => !newPartIds.includes(p.sparePartId));

            await db.$transaction(async (tx) => {
                for (const p of partsToRemove) {
                    await tx.repairPart.delete({ where: { id: p.id } });
                    await tx.sparePart.update({
                        where: { id: p.sparePartId },
                        data: { stockLocal: { increment: p.quantity } }
                    });

                    const branchIdToLog = currentUser?.branch?.id || existingRepair.branchId;

                    if (currentUser && branchIdToLog) {
                        await (tx as any).sparePartHistory.create({
                            data: {
                                sparePartId: p.sparePartId,
                                userId: currentUser.id,
                                branchId: branchIdToLog,
                                quantity: p.quantity,
                                reason: `Reparación #${existingRepair.ticketNumber} (Devolución/Remoción)`,
                                isChecked: false
                            }
                        });
                    }
                }

                for (const p of partsToAdd) {
                    await tx.repairPart.create({
                        data: {
                            repairId,
                            sparePartId: p.id,
                            quantity: 1
                        }
                    });
                    await tx.sparePart.update({
                        where: { id: p.id },
                        data: { stockLocal: { decrement: 1 } }
                    });

                    const branchIdToLog = currentUser?.branch?.id || existingRepair.branchId;

                    if (currentUser && branchIdToLog) {
                        await (tx as any).sparePartHistory.create({
                            data: {
                                sparePartId: p.id,
                                userId: currentUser.id,
                                branchId: branchIdToLog,
                                quantity: -1,
                                reason: `Reparación #${existingRepair.ticketNumber} (Agregado en edición)`,
                                isChecked: false
                            }
                        });
                    }
                }
            });
        }

        revalidatePath("/admin/repairs");
        revalidatePath("/technician/tickets");
        revalidatePath("/technician/dashboard");
        revalidatePath(`/technician/repairs/${repairId}`);
        return { success: true };

    } catch (error) {
        console.error("Error updating repair:", error);
        return { success: false, error: "Error al actualizar reparación" };
    }
}
