"use server";

import { db } from "@/lib/db";
import { customerService } from "@/lib/services/customers";
import { saveRepairImages } from "@/lib/actions/upload";
import { revalidatePath } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/date-utils";
import { es } from "date-fns/locale";
import { createNotificationAction } from "@/lib/actions/notifications";
import { isValidImg } from "@/lib/utils";
import { getCurrentUser } from "@/actions/auth-actions";
import { checkTicketAvailability } from "./reference";

export async function createRepairAction(formData: FormData) {
    try {
        const caller = await getCurrentUser();
        if (!caller) return { success: false, error: "No autorizado" };

        const ticketNumber = formData.get("ticketNumber") as string;
        const branchId = formData.get("branchId") as string;
        const userId = formData.get("userId") as string;

        if (!ticketNumber || ticketNumber.trim().length === 0) {
            return { success: false, error: "Número de ticket requerido" };
        }

        const ticketCheck = await checkTicketAvailability(ticketNumber, branchId);
        if (!ticketCheck.available) {
            return { success: false, error: ticketCheck.error };
        }

        const customer = await customerService.findOrCreate({
            name: formData.get("customerName") as string,
            phone: formData.get("customerPhone") as string,
            email: formData.get("customerEmail") as string || null,
            branchId,
            userId,
            isFinalConsumer: false 
        });

        const savedImages = await saveRepairImages(formData, ticketNumber);

        const partsJson = formData.get("spareParts") as string;
        const parts = partsJson ? JSON.parse(partsJson) : [];
        if (parts.length > 3) {
            return { success: false, error: "Máximo 3 repuestos permitidos." };
        }

        const isWarranty = formData.get("isWarranty") === "true";
        const isWet = formData.get("isWet") === "true";
        const originalRepairId = formData.get("originalRepairId") as string;
        const deviceBrand = formData.get("deviceBrand") as string;
        const deviceModel = formData.get("deviceModel") as string;
        const problemDescription = formData.get("problemDescription") as string;
        const notes = formData.get("notes") as string;
        const promisedAt = new Date(formData.get("promisedAt") as string);
        const estimatedPrice = parseFloat(formData.get("estimatedPrice") as string) || 0;

        const observationText = notes || ""; 

        const repair = await db.repair.create({
            data: {
                ticketNumber,
                branchId,
                customerId: customer.id,
                userId,
                statusId: 1, // Ingresado
                deviceBrand,
                deviceModel,
                problemDescription,
                deviceImages: savedImages.filter(isValidImg),
                promisedAt,
                estimatedPrice,
                isWarranty,
                isWet,
                originalRepairId: isWarranty ? originalRepairId : null,
                parts: {
                    create: parts.map((p: any) => ({
                        sparePartId: p.id,
                        quantity: 1
                    }))
                },
                statusHistory: {
                    create: {
                        toStatusId: 1,
                        userId
                    }
                },
                ...(observationText ? {
                    observations: {
                        create: {
                            userId,
                            content: observationText
                        }
                    }
                } : {})
            },
            include: {
                customer: true,
                branch: true,
                status: true,
                parts: {
                    include: { sparePart: true }
                },
                statusHistory: {
                    orderBy: { createdAt: 'desc' },
                    include: { fromStatus: true, toStatus: true, user: true }
                }
            }
        });

        revalidatePath("/admin/repairs");
        revalidatePath("/technician/tickets");
        revalidatePath("/technician/dashboard");

        try {
            const technicians = await db.user.findMany({
                where: {
                    role: "TECHNICIAN",
                    OR: [
                        { branchId },
                        { branchId: null }
                    ]
                }
            });

            const formattedDate = formatInTimeZone(promisedAt, TIMEZONE, "dd/MM/yyyy", { locale: es });
            const formattedTime = formatInTimeZone(promisedAt, TIMEZONE, "HH:mm", { locale: es });

            for (const tech of technicians) {
                await createNotificationAction({
                    userId: tech.id,
                    title: `Nueva Reparación #${ticketNumber}`,
                    message: `Ingreso de reparación. Fecha prometida: ${formattedDate} ${formattedTime}`,
                    type: "REPAIR_ENTRY",
                    actionData: {
                        ticketNumber,
                        promisedDate: formattedDate,
                        promisedTime: formattedTime,
                        customerName: customer.name
                    },
                    link: `/technician/tickets`
                });
            }
        } catch (notifError) {
            console.error("Error sending notifications:", notifError);
        }

        return { success: true, repair: repair };

    } catch (error) {
        console.error("Error creating repair:", error);
        return { success: false, error: "Error interno del servidor" };
    }
}
