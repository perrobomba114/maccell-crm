"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createNotificationAction } from "@/lib/actions/notifications";


export async function getReturnRequests(role: "ADMIN" | "TECHNICIAN", userId?: string) {
    try {
        const whereClause = role === "TECHNICIAN" && userId
            ? { technicianId: userId }
            : {};

        const returns = await db.returnRequest.findMany({
            where: whereClause,
            include: {
                repair: {
                    include: {
                        customer: true,
                        status: true,
                        parts: {
                            include: {
                                sparePart: true
                            }
                        }
                    }
                },
                technician: true,
                resolvedByUser: true
            },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: returns };
    } catch (error) {
        console.error("Error fetching return requests:", error);
        return { success: false, error: "Error al obtener devoluciones" };
    }
}

export async function resolveReturnRequest(requestId: string, adminId: string, status: "ACCEPTED" | "REJECTED", adminNote?: string) {
    try {
        const returnRequest = await db.returnRequest.findUnique({
            where: { id: requestId },
            include: {
                repair: {
                    include: {
                        parts: true
                    }
                }
            }
        });

        if (!returnRequest) return { success: false, error: "Solicitud no encontrada" };

        if (returnRequest.status !== "PENDING") {
            return { success: false, error: "La solicitud ya fue procesada" };
        }

        await db.$transaction(async (tx) => {
            // 1. Update Return Request Status
            await tx.returnRequest.update({
                where: { id: requestId },
                data: {
                    status,
                    resolvedBy: adminId,
                    resolutionDate: new Date(),
                    adminNote
                }
            });

            // 2. If ACCEPTED, restore stock and remove parts from Repair
            if (status === "ACCEPTED") {
                // Prepare parts list: Use snapshot if available, otherwise fallback to current parts
                // The Type must be handled carefully.
                const snapshot = (returnRequest as any).partsSnapshot as any[];

                if (snapshot && Array.isArray(snapshot) && snapshot.length > 0) {
                    // Restore from SNAPSHOT
                    for (const part of snapshot) {
                        // Restore Stock
                        await tx.sparePart.update({
                            where: { id: part.sparePartId }, // we saved this in snapshot
                            data: {
                                stockLocal: { increment: part.quantity }
                            }
                        });

                        // Remove from Repair (we attempt to delete the RepairPart relation)
                        // Note: If multiple similar parts exist, this deletes by ID if we captured it.
                        // Ideally we captured 'id' of the RepairPart in snapshot.
                        if (part.id) {
                            try {
                                await tx.repairPart.delete({
                                    where: { id: part.id }
                                });
                            } catch (e) {
                                // Ignore if already deleted
                            }
                        }
                    }
                } else {
                    // FALLBACK: Use live relation (Old behavior)
                    const parts = returnRequest.repair.parts;
                    for (const part of parts) {
                        // Restore Stock
                        await tx.sparePart.update({
                            where: { id: part.sparePartId },
                            data: {
                                stockLocal: { increment: part.quantity }
                            }
                        });

                        // Remove from Repair
                        await tx.repairPart.delete({
                            where: { id: part.id }
                        });
                    }
                }
            }
        });

        // Notify Technician
        await createNotificationAction({
            userId: returnRequest.technicianId,
            title: `Devolución ${status === "ACCEPTED" ? "Aceptada" : "Rechazada"}`,
            message: `Tu solicitud de devolución para la reparación #${returnRequest.repair.ticketNumber} ha sido ${status === "ACCEPTED" ? "aceptada" : "rechazada"}.`,
            type: "INFO",
            link: "/technician/returns"
        });

        revalidatePath("/admin/returns");
        revalidatePath("/technician/returns");
        revalidatePath(`/admin/repairs`); // Update repair view
        return { success: true };
    } catch (error) {
        console.error("Error resolving return request:", error);
        return { success: false, error: "Error al procesar la solicitud" };
    }
}

export async function createReturnRequestAction(repairId: string, technicianId: string, note: string) {
    try {
        // Fetch current parts for snapshot
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            include: {
                parts: {
                    include: {
                        sparePart: true
                    }
                }
            }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };

        const partsSnapshot = repair.parts.map(p => ({
            id: p.id,
            sparePartId: p.sparePartId, // Keep reference just in case
            quantity: p.quantity,
            name: p.sparePart.name,
            sku: p.sparePart.sku
        }));

        await db.returnRequest.create({
            data: {
                repairId,
                technicianId,
                technicianNote: note,
                status: "PENDING",
                partsSnapshot: partsSnapshot // Save snapshot
            } as any
        });

        // Notify Admins
        const admins = await db.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true }
        });

        // repair variable is already fetched above with parts.
        const techName = (await db.user.findUnique({ where: { id: technicianId }, select: { name: true } }))?.name || "Técnico";

        await Promise.all(admins.map(admin =>
            createNotificationAction({
                userId: admin.id,
                title: "Nueva Solicitud de Devolución",
                message: `${techName} ha solicitado devolver repuestos de la reparación #${repair?.ticketNumber || '?'}.`,
                type: "alert",
                link: "/admin/returns"
            })
        ));

        revalidatePath("/admin/returns");
        revalidatePath("/technician/returns");
        return { success: true };
    } catch (error) {
        console.error("Error creating return request:", error);
        return { success: false, error: "Error al crear solicitud" };
    }
}
