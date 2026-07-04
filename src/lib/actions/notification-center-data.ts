import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
    buildNotificationCenterPage,
    extractNotificationSaleNumber,
    isJsonObject,
    readNotificationString,
    type NotificationCenterBranchOption,
} from "@/lib/notification-center";

const MAX_NOTIFICATIONS = 300;

type NotificationCenterFilters = {
    status?: string;
    type?: string;
    branchId?: string;
};

export async function getNotificationCenterPageData(
    userId: string,
    filters?: NotificationCenterFilters,
    page: number = 1,
    limit: number = 25
) {
    if (!userId) {
        return emptyNotificationCenterData(limit);
    }

    try {
        const whereClause: Prisma.NotificationWhereInput = { userId };

        if (filters?.type && filters.type !== "ALL") {
            whereClause.type = filters.type;
        }

        const [notifications, branches] = await Promise.all([
            db.notification.findMany({
                where: whereClause,
                take: MAX_NOTIFICATIONS,
                orderBy: { createdAt: "desc" },
            }),
            db.branch.findMany({
                select: {
                    id: true,
                    name: true,
                    code: true,
                    ticketPrefix: true,
                },
                orderBy: { name: "asc" },
            }),
        ]);

        const relatedSales = await getRelatedSaleBranches(notifications, branches);
        const pageData = buildNotificationCenterPage(notifications, {
            branches,
            status: filters?.status,
            branchId: filters?.branchId,
            page,
            limit,
            relatedSaleBranches: relatedSales.byNumber,
            relatedSaleIdBranches: relatedSales.byId,
        });

        return {
            ...pageData,
            branches,
        };
    } catch (error) {
        console.error("Error fetching all notifications:", error);
        return emptyNotificationCenterData(limit);
    }
}

function emptyNotificationCenterData(limit: number) {
    return {
        notifications: [],
        total: 0,
        totalPages: 1,
        page: 1,
        pageSize: limit,
        from: 0,
        to: 0,
        counts: { total: 0, pending: 0, accepted: 0, rejected: 0, unread: 0 },
        branches: [],
    };
}

async function getRelatedSaleBranches(
    notifications: { message: string; link: string | null; actionData: unknown }[],
    branches: NotificationCenterBranchOption[]
): Promise<{
    byNumber: Record<string, NotificationCenterBranchOption>;
    byId: Record<string, NotificationCenterBranchOption>;
}> {
    const saleNumbers = Array.from(new Set(
        notifications
            .map((notification) => extractNotificationSaleNumber(notification))
            .filter((saleNumber): saleNumber is string => saleNumber !== null)
    ));
    const saleIds = Array.from(new Set(
        notifications
            .map((notification) => {
                const actionData = isJsonObject(notification.actionData) ? notification.actionData : null;
                return actionData ? readNotificationString(actionData.saleId) : null;
            })
            .filter((saleId): saleId is string => saleId !== null)
    ));

    if (saleNumbers.length === 0 && saleIds.length === 0) return { byNumber: {}, byId: {} };

    const saleWhere: Prisma.SaleWhereInput[] = [];
    if (saleNumbers.length > 0) saleWhere.push({ saleNumber: { in: saleNumbers } });
    if (saleIds.length > 0) saleWhere.push({ id: { in: saleIds } });

    const sales = await db.sale.findMany({
        where: { OR: saleWhere },
        select: {
            id: true,
            saleNumber: true,
            branch: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    ticketPrefix: true,
                },
            },
        },
    });

    const branchesById = new Map(branches.map((branch) => [branch.id, branch]));
    const byNumber: Record<string, NotificationCenterBranchOption> = {};
    const byId: Record<string, NotificationCenterBranchOption> = {};
    for (const sale of sales) {
        const branch = branchesById.get(sale.branch.id) ?? sale.branch;
        byNumber[sale.saleNumber] = branch;
        byId[sale.id] = branch;
    }

    return { byNumber, byId };
}
