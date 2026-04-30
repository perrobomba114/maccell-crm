"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth-actions";

export async function getAllRepairsForAdminAction(query: string = "") {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== "ADMIN") return [];

    try {
        const whereClause: any = {};

        if (query) {
            const words = query.trim().split(/\s+/).filter(Boolean);
            if (words.length > 0) {
                whereClause.AND = words.map(word => ({
                    OR: [
                        { ticketNumber: { contains: word, mode: "insensitive" } },
                        { customer: { name: { contains: word, mode: "insensitive" } } },
                        { customer: { phone: { contains: word, mode: "insensitive" } } },
                        { deviceBrand: { contains: word, mode: "insensitive" } },
                        { deviceModel: { contains: word, mode: "insensitive" } },
                    ],
                }));
            }
        }

        const repairs = await db.repair.findMany({
            where: whereClause,
            take: 400,
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                status: { select: { id: true, name: true, color: true } },
                assignedTo: { select: { id: true, name: true } },
                branch: { select: { id: true, name: true } },
                originalRepair: { select: { ticketNumber: true, problemDescription: true } },
                statusHistory: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        fromStatus: { select: { id: true, name: true } },
                        toStatus: { select: { id: true, name: true } },
                        user: { select: { id: true, name: true, role: true } },
                    }
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

export async function getRepairByIdAction(repairId: string) {
    const caller = await getCurrentUser();
    if (!caller) return null;

    try {
        const repair = await db.repair.findUnique({
            where: { id: repairId },
            include: {
                customer: true,
                branch: true,
                status: true,
                originalRepair: true,
                parts: {
                    include: { sparePart: true }
                },
                observations: {
                    orderBy: { createdAt: 'desc' },
                    include: { user: true }
                },
                statusHistory: {
                    orderBy: { createdAt: 'desc' },
                    include: { fromStatus: true, toStatus: true, user: true }
                }
            }
        });
        return repair;
    } catch (error) {
        console.error("Error fetching repair by id:", error);
        return null;
    }
}
