"use server";

import { db } from "@/lib/db";
import { businessHoursService } from "@/lib/services/business-hours";
import { customerService } from "@/lib/services/customers";
import { saveRepairImages } from "@/lib/actions/upload";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs/promises";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createNotificationAction } from "./notifications";
import { getImgUrl, isValidImg } from "@/lib/utils";

export async function searchWarrantyRepairs(term: string, branchId: string) {
    if (!branchId || term.length < 2) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const repairs = await db.repair.findMany({
        where: {
            branchId,
            statusId: 10, // ONLY "Entregado"
            updatedAt: { gte: thirtyDaysAgo }, // Delivered within last 30 days
            OR: [
                { ticketNumber: { contains: term, mode: 'insensitive' } },
                { customer: { name: { contains: term, mode: 'insensitive' } } },
                { customer: { phone: { contains: term, mode: 'insensitive' } } }
            ]
        },
        include: {
            customer: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    return repairs.map(r => ({
        id: r.id,
        ticketNumber: r.ticketNumber,
        customerName: r.customer.name,
        customerPhone: r.customer.phone,
        customerEmail: r.customer.email,
        deviceBrand: r.deviceBrand,
        deviceModel: r.deviceModel,
        problemDescription: r.problemDescription,
        date: r.updatedAt.toISOString(), // Using updatedAt as per new logic
        isWet: r.isWet,
        isWarranty: r.isWarranty
    }));
}

export async function checkTicketAvailability(ticketNumber: string, branchId: string) {
    if (!ticketNumber) return { available: false, error: "Ticket required" };

    const existing = await db.repair.findUnique({
        where: { ticketNumber }
    });

    if (existing) {
        return { available: false, error: "Este número de ticket ya existe." };
    }

    return { available: true };
}

export async function calculatePromisedDateAction(startDateIso: string, minutesToAdd: number) {
    const startDate = new Date(startDateIso);
    const newDate = businessHoursService.addBusinessMinutes(startDate, minutesToAdd);
    return newDate.toISOString();
}

export async function searchSparePartsAction(term: string) {
    // Clean search term (remove leading/trailing whitespace and line breaks)
    const cleanTerm = term?.trim();

    // Enhanced logging for production debugging
    console.log("=== SPARE PART SEARCH ===");
    console.log("Original term:", JSON.stringify(term), `(length: ${term?.length || 0})`);
    console.log("Cleaned term:", JSON.stringify(cleanTerm), `(length: ${cleanTerm?.length || 0})`);
    console.log("Had whitespace:", term !== cleanTerm);

    if (!cleanTerm || cleanTerm.length < 2) {
        console.log("Search term too short, returning empty");
        return [];
    }

    try {
        console.log("DB Query Starting...");

        // Special handling for barcode format: Always 8 digits starting with 9988
        // Last 4 digits are unique (e.g., 99880711 -> 0711)
        let last4Digits: string | null = null;
        if (/^9988\d{4}$/.test(cleanTerm)) {
            last4Digits = cleanTerm.slice(-4);
            console.log("Detected barcode format 9988XXXX, last 4 digits:", last4Digits);
        }

        const searchConditions = [
            // Search in name
            { name: { contains: cleanTerm, mode: 'insensitive' } },

            // Multiple SKU search strategies
            { sku: { equals: cleanTerm, mode: 'insensitive' } },      // Exact match full code
            { sku: { contains: cleanTerm, mode: 'insensitive' } },    // Contains full code
            { sku: { endsWith: cleanTerm, mode: 'insensitive' } },    // For prefixed SKUs
            { sku: { startsWith: cleanTerm, mode: 'insensitive' } }   // For suffixed SKUs
        ] as any[];

        // If it's a barcode format (9988XXXX), also search by last 4 digits
        if (last4Digits) {
            searchConditions.push(
                { sku: { equals: last4Digits, mode: 'insensitive' } },      // Exact match last 4
                { sku: { endsWith: last4Digits, mode: 'insensitive' } },    // Ends with last 4
                { sku: { contains: last4Digits, mode: 'insensitive' } }     // Contains last 4
            );
        }

        const parts = await db.sparePart.findMany({
            where: {
                OR: searchConditions,
            },
            take: 20
        });

        // Log results for debugging
        console.log("DB Query Result:", parts.length, "parts found");
        if (parts.length > 0) {
            console.log("First match - SKU:", JSON.stringify(parts[0].sku), "| Name:", parts[0].name, "| Stock:", parts[0].stockLocal);
        } else {
            console.log("No matches found for term:", JSON.stringify(cleanTerm), last4Digits ? `(also tried: ${last4Digits})` : "");
        }

        // Check for stale client (missing pricePos in result)
        // Note: checking first item is enough
        if (parts.length > 0 && (parts[0] as any).pricePos === undefined) {
            try {
                const rawPrices = await db.$queryRaw`SELECT id, "pricePos" FROM "spare_parts" WHERE "deletedAt" IS NULL`;
                const priceMap = new Map();
                if (Array.isArray(rawPrices)) {
                    rawPrices.forEach((p: any) => priceMap.set(p.id, p.pricePos));
                }
                parts.forEach((part: any) => {
                    part.pricePos = priceMap.get(part.id) || 0;
                });
            } catch (e) { console.error("Search fallback error", e); }
        }

        return parts.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.priceArg,
            pricePos: p.pricePos || 0,
            stock: p.stockLocal
        }));
    } catch (error) {
        console.error("Search Error:", error);
        return [];
    }
}

export async function createRepairAction(formData: FormData) {
    try {
        const ticketNumber = formData.get("ticketNumber") as string;
        const branchId = formData.get("branchId") as string;
        const userId = formData.get("userId") as string;

        // 1. Verify Ticket again
        const ticketCheck = await checkTicketAvailability(ticketNumber, branchId);
        if (!ticketCheck.available) {
            return { success: false, error: ticketCheck.error };
        }

        // 2. Customer
        const customer = await customerService.findOrCreate({
            name: formData.get("customerName") as string,
            phone: formData.get("customerPhone") as string,
            email: formData.get("customerEmail") as string || null,
            branchId,
            userId,
            isFinalConsumer: false // Logic?
        });

        // 3. Images
        const savedImages = await saveRepairImages(formData, ticketNumber); // Autosave unique names

        // 4. Parts
        const partsJson = formData.get("spareParts") as string;
        const parts = partsJson ? JSON.parse(partsJson) : [];
        if (parts.length > 3) {
            return { success: false, error: "Máximo 3 repuestos permitidos." };
        }

        // 5. Create Repair
        const isWarranty = formData.get("isWarranty") === "true";
        const isWet = formData.get("isWet") === "true";
        const originalRepairId = formData.get("originalRepairId") as string;
        const deviceBrand = formData.get("deviceBrand") as string;
        const deviceModel = formData.get("deviceModel") as string;
        const problemDescription = formData.get("problemDescription") as string;
        const notes = formData.get("notes") as string;
        const promisedAt = new Date(formData.get("promisedAt") as string);
        const estimatedPrice = parseFloat(formData.get("estimatedPrice") as string) || 0;

        // Initial Observation
        const observationText = notes || ""; // Only notes. If empty string, fine? Or should we not create observation? 
        // Logic below creates observation always. If content is empty string, maybe Prisma allows it.
        // Actually, if notes is empty, maybe we don't need initial observation if "Ingresado el" is removed?
        // But usually tracking "Created" is good.
        // I will default to "Reparación Ingresada" if notes empty, but clean.
        // User specifically said "no tiene que ver nuevo ingreso".
        // I will just use `notes` variable. If empty, maybe "Inicio de reparación".
        // Let's assume just notes.

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
                }
            }
        });


        revalidatePath("/admin/repairs");
        revalidatePath("/technician/tickets");
        revalidatePath("/technician/dashboard");

        // Notify Technicians
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

            const formattedDate = format(promisedAt, "dd/MM/yyyy", { locale: es });
            const formattedTime = format(promisedAt, "HH:mm", { locale: es });

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
            // Don't fail the request if notification fails
        }

        return { success: true, repair: repair };

    } catch (error) {
        console.error("Error creating repair:", error);
        return { success: false, error: "Error interno del servidor" };
    }
}

export async function getActiveRepairsAction(branchId: string, statusIds?: number[]) {
    // console.log("getActiveRepairsAction called with:", { branchId, statusIds });

    const defaultStatuses = [1, 2, 3, 4, 8, 9];
    const filterStatuses = statusIds && statusIds.length > 0 ? statusIds : defaultStatuses;

    try {
        const whereClause: any = {
            statusId: {
                in: filterStatuses
            }
        };

        if (branchId) {
            whereClause.branchId = branchId;
        }

        const repairs = await db.repair.findMany({
            where: whereClause,
            include: {
                customer: true,
                status: true,
                assignedTo: true,
                branch: true,
                parts: {
                    include: { sparePart: true }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        console.log(`getActiveRepairsAction found ${repairs.length} repairs (Branch: ${branchId || "ALL"})`);
        // Force serialization to safely pass Prisma Decimals/Dates to Client
        return JSON.parse(JSON.stringify(repairs));
    } catch (error) {
        console.error("Error fetching active repairs:", error);
        return [];
    }
}

export async function getRepairHistoryAction(branchId: string, query: string = "") {
    if (!branchId) return [];

    try {
        const whereClause: any = {
            branchId,
            statusId: {
                in: [5, 6, 7, 10] // History statuses
            }
        };

        if (query) {
            whereClause.OR = [
                { ticketNumber: { contains: query, mode: "insensitive" } },
                { customer: { name: { contains: query, mode: "insensitive" } } },
                { customer: { phone: { contains: query, mode: "insensitive" } } },
                { deviceBrand: { contains: query, mode: "insensitive" } },
                { deviceModel: { contains: query, mode: "insensitive" } },
            ];
        }

        const repairs = await db.repair.findMany({
            where: whereClause,
            include: {
                customer: true,
                status: true,
                assignedTo: true,
                branch: true,
                parts: {
                    include: { sparePart: true }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return repairs;
    } catch (error) {
        console.error("Error fetching repair history:", error);
        return [];
    }
}

export async function takeRepairAction(
    repairId: string,
    userId: string,
    parts: { id: string, name: string }[],
    extendMinutes?: number
) {
    if (!repairId || !userId) return { success: false, error: "Datos incompletos" };

    try {
        let newPromisedAt: Date | null = null;
        let creatorUserId: string | null = null;
        let ticketNumberValue: string = "";

        // Pre-fetch repair to get creator and ticket number for notification
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: { userId: true, ticketNumber: true, promisedAt: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };
        creatorUserId = repair.userId;
        ticketNumberValue = repair.ticketNumber;

        await db.$transaction(async (tx) => {
            const updateData: any = {
                statusId: 2, // 2 = En Revisión / Taller
                // assignedUserId: userId // REMOVED as per request: Retirar does not assign user yet
            };

            if (extendMinutes && extendMinutes > 0) {
                // Calculate new date starting from NOW (or from original promise if preferred? 
                // User said "agregar 60 minutos para reparar". Usually implies from now if overdue.)
                const now = new Date();
                const baseDate = now > repair.promisedAt ? now : repair.promisedAt;

                // However, businessHoursService.addBusinessMinutes operates on a start date.
                // If overdue, we start counting from NOW.
                const calculatedDate = businessHoursService.addBusinessMinutes(now, extendMinutes);
                updateData.promisedAt = calculatedDate;
                newPromisedAt = calculatedDate;
            }

            // 1. Assign to Technician and Update Status
            await tx.repair.update({
                where: { id: repairId },
                data: updateData
            });

            // 2. Add Parts
            if (parts.length > 0) {
                for (const part of parts) {
                    await tx.repairPart.create({
                        data: {
                            repairId,
                            sparePartId: part.id,
                            quantity: 1
                        }
                    });

                    // Decrement stock
                    await tx.sparePart.update({
                        where: { id: part.id },
                        data: {
                            stockLocal: { decrement: 1 }
                        }
                    });
                }
            }

            // 3. Add system observation
            let obsContent = `Reparación tomada por técnico.`;
            if (extendMinutes && newPromisedAt) {
                obsContent += ` Fecha prometida actualizada a ${format(newPromisedAt, "dd/MM HH:mm", { locale: es })}.`;
            }
            if (parts.length > 0) {
                obsContent += ` Repuestos: ${parts.map(p => p.name).join(", ")}`;
            }

            await tx.repairObservation.create({
                data: {
                    repairId,
                    userId,
                    content: obsContent
                }
            });
        });

        // Notify Creator if date changed
        if (newPromisedAt && creatorUserId) {
            const formattedDate = format(newPromisedAt, "dd/MM HH:mm", { locale: es });
            await createNotificationAction({
                userId: creatorUserId,
                title: `Cambio en Ticket #${ticketNumberValue}`,
                message: `El técnico ha actualizado la fecha prometida a ${formattedDate} (Reparación extendida).`,
                type: "INFO",
                link: `/vendor/repairs/active` // Or relevant link
            });
        }

        revalidatePath("/technician/tickets");
        revalidatePath("/technician/repairs");
        revalidatePath("/technician/dashboard");
        revalidatePath("/admin/repairs"); // Allow admin to see change too
        return { success: true };
    } catch (error) {
        console.error("Take Repair Error:", error);
        return { success: false, error: "Error al asignar reparación." };
    }
}

export async function getAllRepairsForAdminAction(query: string = "") {
    try {
        const whereClause: any = {};

        if (query) {
            whereClause.OR = [
                { ticketNumber: { contains: query, mode: "insensitive" } },
                { customer: { name: { contains: query, mode: "insensitive" } } },
                { customer: { phone: { contains: query, mode: "insensitive" } } },
                { deviceBrand: { contains: query, mode: "insensitive" } },
                { deviceModel: { contains: query, mode: "insensitive" } },
            ];
        }

        const repairs = await db.repair.findMany({
            where: whereClause,
            include: {
                customer: true,
                status: true,
                assignedTo: true,
                branch: true,
                parts: {
                    include: { sparePart: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return repairs;
    } catch (error) {
        console.error("Error fetching all repairs for admin:", error);
        return [];
    }
}

export async function deleteRepairAction(repairId: string) {
    try {
        await db.repair.delete({
            where: { id: repairId }
        });

        revalidatePath("/admin/repairs");
        return { success: true };
    } catch (error) {
        console.error("Error deleting repair:", error);
        return { success: false, error: "Error al eliminar la reparación" };
    }
}


export async function getRepairByIdAction(repairId: string) {
    try {
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            include: {
                customer: true,
                branch: true,
                status: true,
                parts: {
                    include: { sparePart: true }
                },
                observations: {
                    orderBy: { createdAt: 'desc' },
                    include: { user: true }
                }
            }
        });
        return repair;
    } catch (error) {
        console.error("Error fetching repair by id:", error);
        return null;
    }
}

export async function updateRepairAction(formData: FormData) {
    try {
        const repairId = formData.get("repairId") as string;
        const customerName = formData.get("customerName") as string;
        const customerPhone = formData.get("customerPhone") as string;
        const customerEmail = formData.get("customerEmail") as string;
        const deviceBrand = formData.get("deviceBrand") as string;
        const deviceModel = formData.get("deviceModel") as string;
        const problemDescription = formData.get("problemDescription") as string;
        const notes = formData.get("notes") as string;
        const promisedAt = new Date(formData.get("promisedAt") as string);
        const estimatedPrice = parseFloat(formData.get("estimatedPrice") as string) || 0;
        const statusId = parseInt(formData.get("statusId") as string) || undefined;
        const diagnosis = formData.get("diagnosis") as string || null;
        const isWarranty = formData.get("isWarranty") === "true";
        const isWet = formData.get("isWet") === "true";
        let assignedUserId: string | null = formData.get("assignedUserId") as string;
        if (!assignedUserId || assignedUserId === "unassigned") assignedUserId = null;

        // Parts handling could be complex (add/remove). 
        // For simplicity in this edit v1, we might skip parts editing or handle it simply.
        // The form sends 'spareParts' as JSON.
        const partsJson = formData.get("spareParts") as string;
        const parts = partsJson ? JSON.parse(partsJson) : [];

        const existingImagesJson = formData.get("existingImages") as string;
        const existingImagesSnap = existingImagesJson ? JSON.parse(existingImagesJson) : [];

        // Update Customer (or find existing if name changed? Usually we update the linked customer or search?)
        // In this logic, we'll update the LINKED customer's details or just the repair's snapshot if that was the design.
        // Looking at create: findOrCreate customer. 
        // Here we should probably update the customer record itself or find a new one if completely changed.
        // Let's assume we update the customer linked to this repair for now.
        // Actually, fetching the repair gives us customerId.

        const existingRepair = await db.repair.findUnique({
            where: { id: repairId },
            include: { customer: true }
        });

        if (!existingRepair) return { success: false, error: "Reparación no encontrada" };

        await db.customer.update({
            where: { id: existingRepair.customerId },
            data: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail || null
            }
        });

        // Update Repair
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
                ...(statusId ? { statusId } : {}),
            }
        });

        // 3. Handle Images with Smart Concurrency & Hygiene
        // 3. Handle Images with Smart Concurrency & Hygiene
        const submittedKeepImagesJson = formData.get("existingImages") as string;
        const originalImagesJson = formData.get("originalImages") as string;

        const submittedKeepImages = JSON.parse(submittedKeepImagesJson || "[]") as string[];
        const originalLoadImages = JSON.parse(originalImagesJson || "[]") as string[];

        // A. Determine what was explicitly deleted by the Admin
        // Deleted = Was in Original BUT is NOT in Submitted
        const explicitlyDeleted = originalLoadImages.filter(img => !submittedKeepImages.includes(img));

        // B. Get current DB State (to check for new images added by Techs during edit)
        const freshRepair = await db.repair.findUnique({
            where: { id: repairId },
            select: { deviceImages: true }
        });
        const currentDbImages = freshRepair?.deviceImages || [];

        // C. Calculate Final State
        // Keep = (CurrentDB - Deleted) + NewUploads
        // This preserves unseen images (Tech uploads) while respecting Admin deletions
        const imagesToKeep = currentDbImages.filter(img => !explicitlyDeleted.includes(img));

        // D. Save New Images
        const newImagesPaths = await saveRepairImages(formData, existingRepair.ticketNumber);

        const finalImages = [...imagesToKeep, ...newImagesPaths].filter(isValidImg);

        // E. File Hygiene: Delete physical files that were explicitly deleted
        if (explicitlyDeleted.length > 0) {
            // We do this asynchronously to not block the UI response
            (async () => {
                try {
                    const publicDir = path.join(process.cwd(), "public");
                    for (const imgPath of explicitlyDeleted) {
                        // Security check: ensure path is relative and safe
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

        // 4. Handle Parts (Delete all and recreate? Or diff?)
        // Delete all repairParts and recreate is easiest for now.
        // 4. Handle Parts with Stock Management (Diffing)
        if (partsJson) { // Only if parts field was sent (check based on logic)
            // Fetch current parts to compare
            const currentRepairParts = await db.repairPart.findMany({
                where: { repairId },
                select: { id: true, sparePartId: true, quantity: true }
            });

            const newPartIds = parts.map((p: any) => p.id);
            const currentPartIds = currentRepairParts.map(p => p.sparePartId);

            // Determine Additions and Removals
            const partsToAdd = parts.filter((p: any) => !currentPartIds.includes(p.id));
            const partsToRemove = currentRepairParts.filter(p => !newPartIds.includes(p.sparePartId));

            // Execute Updates
            await db.$transaction(async (tx) => {
                // A. Remove Parts -> Increment Stock
                for (const p of partsToRemove) {
                    await tx.repairPart.delete({ where: { id: p.id } });
                    await tx.sparePart.update({
                        where: { id: p.sparePartId },
                        data: { stockLocal: { increment: p.quantity } }
                    });
                }

                // B. Add Parts -> Decrement Stock
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

export async function getAllStatusesAction() {
    try {
        const statuses = await db.repairStatus.findMany({
            orderBy: { id: 'asc' }
        });
        return statuses;
    } catch (error) {
        console.error("Error fetching statuses:", error);
        return [];
    }
}

export async function getAllTechniciansAction() {
    try {
        const technicians = await db.user.findMany({
            where: {
                role: { in: ["TECHNICIAN", "ADMIN"] }
            },
            orderBy: { name: 'asc' }
        });
        return technicians;
    } catch (error) {
        console.error("Error fetching technicians:", error);
        return [];
    }
}

export async function addRepairImagesAction(formData: FormData) {
    const repairId = formData.get("repairId") as string;

    if (!repairId) return { success: false, error: "ID de reparación requerido" };

    try {
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: { deviceImages: true, ticketNumber: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };

        const currentImages = repair.deviceImages || [];
        const files = formData.getAll("images");

        if (currentImages.length + files.length > 3) {
            return { success: false, error: `Máximo 3 imágenes permitidas. Ya tienes ${currentImages.length} cargadas.` };
        }

        // Save new images with unique names
        const newImages = await saveRepairImages(formData, repair.ticketNumber);

        // Update DB
        await db.repair.update({
            where: { id: repairId },
            data: {
                deviceImages: [...currentImages, ...newImages].filter(isValidImg)
            }
        });

        revalidatePath("/vendor/repairs/active");
        revalidatePath("/admin/repairs");

        return { success: true };

    } catch (error) {
        console.error("Error adding images:", error);
        return { success: false, error: "Error al subir imágenes" };
    }
}

export async function removeRepairImageAction(repairId: string, imageUrl: string) {
    try {
        if (!repairId || !imageUrl) return { success: false, error: "Datos incompletos" };

        const repair = await db.repair.findUnique({
            where: { id: repairId },
            select: { deviceImages: true }
        });

        if (!repair) return { success: false, error: "Reparación no encontrada" };

        const currentImages = repair.deviceImages || [];
        const updatedImages = currentImages.filter(img => img !== imageUrl);

        if (currentImages.length === updatedImages.length) {
            return { success: false, error: "La imagen no existe en esta reparación" };
        }

        await db.repair.update({
            where: { id: repairId },
            data: {
                deviceImages: updatedImages
            }
        });

        revalidatePath("/technician/repairs");
        revalidatePath(`/admin/repairs`);
        return { success: true };

    } catch (error) {
        console.error("Error removing image:", error);
        return { success: false, error: "Error de servidor al eliminar imagen" };
    }
}
