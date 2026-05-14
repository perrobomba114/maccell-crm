// Shared types and utilities for the Active Repairs table.

import { type RepairDetails } from "./repair-details-dialog";

export type ActiveRepair = RepairDetails & {
    statusId: number;
    status: RepairDetails["status"] & { id?: number };
    startedAt?: Date | string | null;
    finishedAt?: Date | string | null;
    estimatedTime?: number | null;
    estimatedPrice?: number | null;
};

export interface ActiveRepairsTableProps {
    repairs: ActiveRepair[];
    emptyMessage?: string;
    enableTakeover?: boolean;
    enableManagement?: boolean;
    enableImageUpload?: boolean;
    currentUserId?: string;
    showIssueSummary?: boolean;
}

export const ACTIVE_STATUS_COLOR_MAP: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    indigo: "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
    green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    amber: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    slate: "bg-slate-800 text-white border-slate-900 hover:bg-slate-900",
};

export function positionBadgeClass(position: number): string {
    if (position <= 3) return "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700";
    if (position <= 6) return "bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700";
    return "bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600";
}

export function calcRepairDuration(startedAt?: Date | string | null, finishedAt?: Date | string | null): string | null {
    if (!startedAt || !finishedAt) return null;
    const diff = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** Returns true if the promised delivery date has already passed */
export function isOverdue(promisedAt: string | Date): boolean {
    return new Date(promisedAt).getTime() < Date.now();
}

/** Status chip options for quick filtering. statusId === 0 means "All". */
export const STATUS_CHIPS = [
    { label: "Todas", statusId: 0 },
    { label: "Pendiente", statusId: 1 },
    { label: "Tomada", statusId: 2 },
    { label: "En Proceso", statusId: 3 },
    { label: "Pausada", statusId: 4 },
    { label: "Lista", statusId: 5 },
] as const;
