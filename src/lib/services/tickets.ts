import { db } from "@/lib/db";

export class TicketService {
    async validateTicketUnique(ticketNumber: string, branchId: string): Promise<boolean> {
        if (!ticketNumber) return false;

        const existing = await db.repair.findFirst({
            where: {
                ticketNumber: ticketNumber,
                branchId: branchId, // Scope to branch? 
                // User requirement manual said "El vendedor no puede poner el mismo valor 2 veces".
                // Usually implies global uniqueness if ticket format is "PREFIX-NUMBER", or branch uniqueness if multiple branches share numbers?
                // The schema has `@@unique([ticketNumber])`. So it must be globally unique.
                // However, I'll check if it exists globally to be safe + conform to schema.
            }
        });

        // Also check global uniqueness since schema enforces it
        const existingGlobal = await db.repair.findUnique({
            where: { ticketNumber }
        });

        if (existingGlobal) return false;

        return true;
    }

    async isTicketAvailable(ticketNumber: string): Promise<boolean> {
        const count = await db.repair.count({
            where: { ticketNumber }
        });
        return count === 0;
    }
}

export const ticketService = new TicketService();
