"use client";

// Stats banner + quick status chip filters for the active repairs table.
// Computes overdue / unassigned counts client-side from the already-fetched data.

import { cn } from "@/lib/utils";
import { AlertTriangle, Wrench, UserX, CheckCircle2, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { type ActiveRepair, STATUS_CHIPS, isOverdue } from "./active-repairs-types";

interface ActiveRepairsStatsProps {
    repairs: ActiveRepair[];
    activeChip: number;
    onChipChange: (statusId: number) => void;
    completedToday?: number;
    globalPendingCount?: number;
}

export function ActiveRepairsStats({ 
    repairs, 
    activeChip, 
    onChipChange,
    completedToday = 0,
    globalPendingCount = 0
}: ActiveRepairsStatsProps) {
    const router = useRouter();

    const total = repairs.length;
    const overdueCount = repairs.filter(r => isOverdue(r.promisedAt)).length;
    const unassignedCount = repairs.filter(r => !r.assignedTo).length;
    const readyCount = repairs.filter(r => r.statusId === 5).length;

    const stats = [
        {
            label: "Hoy",
            value: completedToday,
            icon: CheckCircle2,
            className: "text-white bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/30 shadow-lg shadow-emerald-500/10",
        },
        {
            label: "Ingresos",
            value: globalPendingCount,
            icon: RefreshCcw,
            className: "text-white bg-gradient-to-br from-amber-500 to-orange-600 border-orange-400/30 shadow-lg shadow-orange-500/10",
        },
        {
            label: "Activas",
            value: total,
            icon: Wrench,
            className: "text-white bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/30 shadow-lg shadow-blue-500/10",
        },
        {
            label: "Vencidas",
            value: overdueCount,
            icon: AlertTriangle,
            className: overdueCount > 0
                ? "text-white bg-gradient-to-br from-red-500 to-rose-600 border-red-400/30 shadow-lg shadow-red-500/10"
                : "text-muted-foreground bg-muted/40 border-border",
        },
    ];

    return (
        <div className="space-y-3">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stats.map(({ label, value, icon: Icon, className }) => (
                    <div
                        key={label}
                        className={cn(
                            "flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 transition-colors",
                            className
                        )}
                    >
                        <Icon className="h-4 w-4 mb-1 shrink-0" />
                        <span className="text-xl font-black tabular-nums leading-none">{value}</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest mt-1 text-center leading-none opacity-80">{label}</span>
                    </div>
                ))}
            </div>

            {/* Status chips + refresh button */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {STATUS_CHIPS.map(chip => (
                    <button
                        key={chip.statusId}
                        type="button"
                        onClick={() => onChipChange(chip.statusId)}
                        className={cn(
                            "shrink-0 inline-flex items-center h-7 rounded-full px-3 text-[11px] font-bold border transition-all whitespace-nowrap",
                            activeChip === chip.statusId
                                ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                                : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                        )}
                    >
                        {chip.label}
                        {chip.statusId !== 0 && (
                            <span className={cn(
                                "ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[9px] font-black tabular-nums",
                                activeChip === chip.statusId ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {repairs.filter(r => r.statusId === chip.statusId).length}
                            </span>
                        )}
                    </button>
                ))}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 ml-auto text-muted-foreground hover:text-foreground"
                    onClick={() => router.refresh()}
                    title="Actualizar"
                >
                    <RefreshCcw className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
