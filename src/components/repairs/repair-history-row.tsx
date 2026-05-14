"use client";

// Desktop table row for a single repair entry in the history list.
// Shown on screens >= sm (640px). Mobile uses RepairHistoryCard instead.

import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Loader2, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { type RepairData, STATUS_COLOR_MAP, calcDuration, durationColorClass } from "./repair-history-types";

interface RepairHistoryRowProps {
    repair: RepairData;
    isPending: boolean;
    loadingId: string | null;
    onPrint: (repair: RepairData) => void;
    onViewDetails: (id: string) => void;
}

export function RepairHistoryRow({ repair, isPending, loadingId, onPrint, onViewDetails }: RepairHistoryRowProps) {
    const colorClass = STATUS_COLOR_MAP[repair.status.color ?? ""] || "bg-gray-100 text-gray-800";
    const duration = calcDuration(repair.startedAt, repair.finishedAt);
    const dColor = durationColorClass(duration);

    return (
        <TableRow className="border-b border-border/60 transition-colors hover:bg-muted/40 group">
            <TableCell className="text-center py-5 px-3">
                <div className={cn(
                    "inline-flex flex-col items-center justify-center min-w-[95px] p-2.5 rounded-2xl border-2 transition-[transform,box-shadow,background-color] duration-300 group-hover:scale-105 tabular-nums",
                    repair.isWet ? "bg-blue-600/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]" :
                        repair.isWarranty ? "bg-amber-600/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]" :
                            "bg-card border-border shadow-sm"
                )}>
                    <span className={cn(
                        "text-[9px] font-black tracking-[0.2em] leading-none mb-1.5 uppercase",
                        repair.isWet ? "text-blue-500" : repair.isWarranty ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                    )}>
                        {repair.ticketNumber.split("-")[0]}
                    </span>
                    <span className="text-base font-black font-mono leading-none tracking-tighter text-foreground">
                        {repair.ticketNumber.split("-").pop()}
                    </span>
                </div>
            </TableCell>

            <TableCell className="text-center px-3">
                <div className="flex flex-col items-center tabular-nums">
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
                        {repair.updatedAt ? format(new Date(repair.updatedAt), "dd/MM/yy", { locale: es }) : "–"}
                    </span>
                    <div className="flex items-center gap-1.5 mt-2 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            {repair.updatedAt ? format(new Date(repair.updatedAt), "HH:mm", { locale: es }) : ""} HS
                        </span>
                    </div>
                </div>
            </TableCell>

            <TableCell className="text-center px-3">
                <div className={cn("inline-flex items-center justify-center px-4 py-1 rounded-full border font-black text-[11px] italic tracking-tight tabular-nums", dColor)}>
                    {duration}
                </div>
            </TableCell>

            <TableCell className="text-center px-3">
                <span className="font-black text-[13px] text-foreground uppercase tracking-tight leading-tight group-hover:text-blue-500 transition-colors duration-300">
                    {repair.customer.name}
                </span>
            </TableCell>

            <TableCell className="text-center px-3">
                <div className="inline-flex items-center justify-center bg-muted/50 px-3 py-1.5 rounded-xl border border-border tabular-nums shadow-sm group-hover:border-blue-500/30 transition-colors duration-300">
                    <span className="text-sm font-black text-foreground uppercase tracking-tight">
                        {repair.customer.phone || "———"}
                    </span>
                </div>
            </TableCell>

            <TableCell className="text-center px-3">
                <div className="inline-flex flex-col items-center justify-center bg-card border border-border px-3 py-2 rounded-xl shadow-sm group-hover:border-blue-500/30 transition-colors duration-300">
                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5 italic">
                        {repair.deviceBrand}
                    </span>
                    <span className="text-[11px] font-black text-foreground uppercase tracking-tight leading-none">
                        {repair.deviceModel}
                    </span>
                </div>
            </TableCell>

            <TableCell className="text-center px-3">
                <div className="flex flex-col items-center gap-1.5">
                    <Badge className={`font-black rounded-lg px-3 py-1 text-[10px] uppercase tracking-wider border-2 ${colorClass}`}>
                        {repair.status.name}
                    </Badge>
                    {repair.statusHistory?.[0] && (
                        <div className="text-[9px] text-muted-foreground mt-1 tabular-nums font-bold uppercase tracking-tighter">
                            Prev: <span className="text-blue-500">{repair.statusHistory[0].fromStatus?.name || 'Registro'}</span>
                        </div>
                    )}
                </div>
            </TableCell>

            <TableCell className="text-center px-3">
                <div className="flex items-center justify-center gap-1.5 h-7">
                    <Button variant="ghost" size="icon-xs" onClick={() => onPrint(repair)} className="text-muted-foreground hover:text-foreground hover:bg-muted transition-[color,background-color] duration-200" title="Imprimir Ticket">
                        <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => onViewDetails(repair.id)} disabled={isPending && loadingId === repair.id} className="text-muted-foreground hover:text-blue-500 hover:bg-muted transition-[color,background-color] duration-200" title="Ver Detalles">
                        {isPending && loadingId === repair.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
