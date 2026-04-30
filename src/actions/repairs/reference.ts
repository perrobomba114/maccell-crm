"use server";

import { db } from "@/lib/db";

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
