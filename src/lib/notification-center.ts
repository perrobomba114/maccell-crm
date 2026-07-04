import { deriveNotificationBranches } from "./notification-center-branches";
import { isJsonObject, readNotificationString } from "./notification-center-utils";

export {
    extractNotificationSaleNumber,
    isJsonObject,
    readNotificationString,
} from "./notification-center-utils";

export type NotificationCenterStatusFilter = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED";

export type NotificationCenterBranchOption = {
    id: string;
    name: string;
    code?: string | null;
    ticketPrefix?: string | null;
};

export type NotificationCenterSource = {
    id: string;
    title: string;
    message: string;
    type: string;
    status: string | null;
    actionData: unknown;
    link?: string | null;
    createdAt: Date;
    isRead?: boolean;
};

export type NotificationActionConfig =
    | {
        mode: "respond";
        acceptLabel: string;
        rejectLabel: string;
    }
    | {
        mode: "link";
        href: string;
        linkLabel: string;
    }
    | {
        mode: "none";
    };

export type NotificationCenterViewItem = NotificationCenterSource & {
    branch: NotificationCenterBranchOption | null;
    branches: NotificationCenterBranchOption[];
    actionConfig: NotificationActionConfig;
    typeLabel: string;
    statusLabel: string;
    tone: "request" | "warning" | "info";
};

export type NotificationCenterCounts = {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    unread: number;
};

export type NotificationCenterPage = {
    notifications: NotificationCenterViewItem[];
    total: number;
    totalPages: number;
    page: number;
    pageSize: number;
    from: number;
    to: number;
    counts: NotificationCenterCounts;
};

export type BuildNotificationCenterPageOptions = {
    branches: NotificationCenterBranchOption[];
    status?: string | null;
    branchId?: string | null;
    page?: number;
    limit?: number;
    relatedSaleBranches?: Record<string, NotificationCenterBranchOption | undefined>;
    relatedSaleIdBranches?: Record<string, NotificationCenterBranchOption | undefined>;
};

const DEFAULT_STATUS_FILTER: NotificationCenterStatusFilter = "PENDING";
const ALL_BRANCHES = "ALL";

export function normalizeNotificationStatusFilter(value?: string | null): NotificationCenterStatusFilter {
    if (value === "ALL" || value === "PENDING" || value === "ACCEPTED" || value === "REJECTED") {
        return value;
    }

    return DEFAULT_STATUS_FILTER;
}

export function normalizeNotificationBranchFilter(value?: string | null): string {
    return value && value.trim() ? value : ALL_BRANCHES;
}

export function getNotificationActionRequestKey(actionData: unknown): string | null {
    if (!isJsonObject(actionData)) return null;

    const type = readNotificationString(actionData.type);
    if (!type) return null;

    if (type === "STOCK_DISCREPANCY") {
        const discrepancyId = readNotificationString(actionData.discrepancyId);
        const stockId = readNotificationString(actionData.stockId);
        return discrepancyId ? `${type}:${discrepancyId}` : stockId ? `${type}:${stockId}` : null;
    }

    if (type === "CHANGE_PAYMENT") {
        const saleId = readNotificationString(actionData.saleId);
        const newMethod = readNotificationString(actionData.newMethod);
        return saleId && newMethod ? `${type}:${saleId}:${newMethod}` : null;
    }

    if (type === "RETURN_REQUEST") {
        const returnRequestId = readNotificationString(actionData.returnRequestId);
        return returnRequestId ? `${type}:${returnRequestId}` : null;
    }

    if (type === "TRANSFER_REQUEST") {
        const transferId = readNotificationString(actionData.transferId);
        return transferId ? `${type}:${transferId}` : null;
    }

    return null;
}

export function getNotificationActionConfig(
    notification: Pick<NotificationCenterSource, "type" | "actionData" | "link">
): NotificationActionConfig {
    if (notification.type !== "ACTION_REQUEST") {
        return { mode: "none" };
    }

    const actionType = isJsonObject(notification.actionData)
        ? readNotificationString(notification.actionData.type)
        : null;

    if (actionType === "STOCK_DISCREPANCY") {
        return {
            mode: "respond",
            acceptLabel: "Aceptar ajuste",
            rejectLabel: "Rechazar ajuste",
        };
    }

    if (actionType === "CHANGE_PAYMENT") {
        return {
            mode: "respond",
            acceptLabel: "Aceptar cambio",
            rejectLabel: "Rechazar cambio",
        };
    }

    if (notification.link) {
        return {
            mode: "link",
            href: notification.link,
            linkLabel: actionType === "RETURN_REQUEST" ? "Abrir devoluciones" : "Abrir gestión",
        };
    }

    return { mode: "none" };
}

export function buildNotificationCenterPage(
    notifications: NotificationCenterSource[],
    options: BuildNotificationCenterPageOptions
): NotificationCenterPage {
    const statusFilter = normalizeNotificationStatusFilter(options.status);
    const branchFilter = normalizeNotificationBranchFilter(options.branchId);
    const pageSize = normalizePositiveInteger(options.limit, 25);

    const decorated = notifications.map((notification) => decorateNotification(notification, options));
    const branchFiltered = decorated.filter((notification) => {
        return branchFilter === ALL_BRANCHES || notification.branches.some((branch) => branch.id === branchFilter);
    });

    const counts = buildCounts(branchFiltered);
    const filtered = branchFiltered.filter((notification) => {
        return statusFilter === "ALL" || notification.status === statusFilter;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(totalPages, normalizePositiveInteger(options.page, 1));
    const start = (page - 1) * pageSize;
    const pageNotifications = filtered.slice(start, start + pageSize);

    return {
        notifications: pageNotifications,
        total,
        totalPages,
        page,
        pageSize,
        from: total === 0 ? 0 : start + 1,
        to: Math.min(start + pageSize, total),
        counts,
    };
}

function decorateNotification(
    notification: NotificationCenterSource,
    options: BuildNotificationCenterPageOptions
): NotificationCenterViewItem {
    const branches = deriveNotificationBranches(notification, options);
    return {
        ...notification,
        branch: branches[0] ?? null,
        branches,
        actionConfig: getNotificationActionConfig(notification),
        typeLabel: getNotificationTypeLabel(notification.type),
        statusLabel: getNotificationStatusLabel(notification.status),
        tone: getNotificationTone(notification.type),
    };
}

function buildCounts(notifications: NotificationCenterViewItem[]): NotificationCenterCounts {
    return notifications.reduce<NotificationCenterCounts>((counts, notification) => {
        counts.total += 1;
        if (notification.status === "PENDING") counts.pending += 1;
        if (notification.status === "ACCEPTED") counts.accepted += 1;
        if (notification.status === "REJECTED") counts.rejected += 1;
        if (notification.isRead === false) counts.unread += 1;
        return counts;
    }, {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        unread: 0,
    });
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
    if (!value || !Number.isFinite(value)) return fallback;
    return Math.max(1, Math.trunc(value));
}

function getNotificationTypeLabel(type: string): string {
    if (type === "ACTION_REQUEST") return "Solicitud";
    if (type === "WARNING") return "Alerta";
    if (type === "REPAIR_ENTRY") return "Ingreso";
    return "Info";
}

function getNotificationStatusLabel(status: string | null): string {
    if (status === "PENDING") return "Pendiente";
    if (status === "ACCEPTED") return "Aceptada";
    if (status === "REJECTED") return "Rechazada";
    return "Informativa";
}

function getNotificationTone(type: string): NotificationCenterViewItem["tone"] {
    if (type === "ACTION_REQUEST") return "request";
    if (type === "WARNING") return "warning";
    return "info";
}
