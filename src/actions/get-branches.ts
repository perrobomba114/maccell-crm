"use server";

import { db as prisma } from "@/lib/db";

export async function getAllBranches() {
    try {
        const branches = await prisma.branch.findMany({
            orderBy: { createdAt: 'asc' }
        });
        return branches;
    } catch (error) {
        console.error("Error fetching branches:", error);
        return [];
    }
}
