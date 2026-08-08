import { db } from "@/lib/db";
import { createNotificationAction } from "@/lib/actions/notifications";
import { isPosDeliveryBlockedStatus } from "@/lib/repairs/status";

type BlockedRepair = {
    id: string;
    ticketNumber: string;
    statusId: number;
    status: { name: string };
    assignedUserId: string | null;
};

export async function notifyBlockedRepairDeliveryAttempt(
    repairIds: string[],
    branchId: string,
    vendorName: string,
): Promise<BlockedRepair[]> {
    if (repairIds.length === 0) return [];

    const repairs = await db.repair.findMany({
        where: { id: { in: repairIds }, branchId },
        select: {
            id: true,
            ticketNumber: true,
            statusId: true,
            status: { select: { name: true } },
            assignedUserId: true,
        },
    });
    const blockedRepairs = repairs.filter((repair) => isPosDeliveryBlockedStatus(repair.statusId));
    const hasUnassignedRepairs = blockedRepairs.some((repair) => !repair.assignedUserId);
    const branchTechnicians = hasUnassignedRepairs
        ? await db.user.findMany({ where: { branchId, role: "TECHNICIAN" }, select: { id: true } })
        : [];
    const notifications = blockedRepairs.flatMap((repair) => {
        const recipientIds = repair.assignedUserId
            ? [repair.assignedUserId]
            : branchTechnicians.map((technician) => technician.id);

        return recipientIds.map((userId) => createNotificationAction({
            userId,
            title: "⚠️ Entrega bloqueada: actualizar estado",
            message: `${vendorName} intentó entregar el equipo del ticket #${repair.ticketNumber}. Cambiá el estado de la reparación desde ${repair.status.name} antes de que el vendedor pueda entregarla al cliente.`,
            type: "WARNING",
            link: "/technician/repairs",
        }));
    });

    await Promise.all(notifications);
    return blockedRepairs;
}
