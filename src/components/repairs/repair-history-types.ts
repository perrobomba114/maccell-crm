// Types and pure utility functions for the repair history table.
// Keep all shared logic here to avoid duplication between mobile/desktop views.

export type RepairData = {
    id: string;
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    isWet: boolean;
    isWarranty: boolean;
    startedAt: Date | string | null;
    finishedAt: Date | string | null;
    updatedAt: Date | string | null;
    customer: { name: string; phone?: string | null };
    status: { id: number; name: string; color: string | null };
    statusId?: number;
    statusHistory?: Array<{ fromStatus?: { name: string } | null }>;
    branch?: { name?: string | null; address?: string | null; phone?: string | null; imageUrl?: string | null } | null;
};

export const STATUS_COLOR_MAP: Record<string, string> = {
    blue: "bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.4)]",
    indigo: "bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.4)]",
    yellow: "bg-amber-500 text-white border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]",
    gray: "bg-slate-600 text-white border-slate-400 shadow-[0_0_10px_rgba(71,85,105,0.4)]",
    green: "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_10px_rgba(5,150,105,0.4)]",
    red: "bg-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.4)]",
    purple: "bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.4)]",
    orange: "bg-orange-600 text-white border-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.4)]",
    amber: "bg-amber-600 text-white border-amber-400 shadow-[0_0_10_rgba(217,119,6,0.4)]",
    slate: "bg-slate-800 text-white border-slate-600",
};

export function calcDuration(startedAt: Date | string | null, finishedAt: Date | string | null): string {
    if (!startedAt || !finishedAt) return "-";
    const diff = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    if (diff <= 0) return "-";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours === 0 ? `${minutes} min` : `${hours}h ${minutes}m`;
}

export function durationColorClass(duration: string): string {
    if (duration === "-") return "text-muted-foreground bg-muted/50 border-border";
    if (duration.includes("h")) return "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20";
    if (duration.includes("min") && parseInt(duration) < 30) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
}
