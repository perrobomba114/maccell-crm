"use client";

// Mobile card for a single repair entry in the history list.
// Shown on screens < sm (640px). Desktop uses RepairHistoryRow instead.

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Loader2, Printer, Droplets, ShieldCheck, Phone, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { RepairImagesActionButton } from "./repair-images-action-button";
import { type RepairData, STATUS_COLOR_MAP, calcDuration, durationColorClass } from "./repair-history-types";

interface RepairHistoryCardProps {
    repair: RepairData;
    isPending: boolean;
    loadingId: string | null;
    onPrint: (repair: RepairData) => void;
    onViewDetails: (id: string) => void;
    onViewImages: (repair: RepairData) => void;
}

export function RepairHistoryCard({ repair, isPending, loadingId, onPrint, onViewDetails, onViewImages }: RepairHistoryCardProps) {
    const colorClass = STATUS_COLOR_MAP[repair.status.color ?? ""] || "bg-slate-600 text-white border-slate-400";
    const duration = calcDuration(repair.startedAt, repair.finishedAt);
    const dColor = durationColorClass(duration);
    const isLoading = isPending && loadingId === repair.id;

    return (
        <li className="p-4 flex flex-col gap-3 hover:bg-muted/30 transition-colors">
            {/* Row 1: Ticket badge + Status + Actions */}
            <div className="flex items-start justify-between gap-2">
                <div className={cn(
                    "inline-flex flex-col items-center justify-center min-w-[80px] px-2.5 py-2 rounded-2xl border-2 tabular-nums",
                    repair.isWet ? "bg-blue-600/10 border-blue-500/50" :
                        repair.isWarranty ? "bg-amber-600/10 border-amber-500/50" :
                            "bg-card border-border"
                )}>
                    <span className={cn(
                        "text-[8px] font-black tracking-[0.2em] leading-none mb-1 uppercase",
                        repair.isWet ? "text-blue-500" : repair.isWarranty ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                    )}>
                        {repair.ticketNumber.split("-")[0]}
                    </span>
                    <span className="text-sm font-black font-mono leading-none tracking-tighter text-foreground">
                        {repair.ticketNumber.split("-").pop()}
                    </span>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-1">
                    <Badge className={`font-black rounded-lg px-3 py-1 text-[10px] uppercase tracking-wider border-2 ${colorClass}`}>
                        {repair.status.name}
                    </Badge>
                    <div className="flex items-center gap-1">
                        {repair.isWet && <Droplets className="h-3.5 w-3.5 text-blue-500" />}
                        {repair.isWarranty && <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => onViewDetails(repair.id)} disabled={isLoading} className="h-9 w-9 text-muted-foreground hover:text-blue-500" title="Ver detalles">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <RepairImagesActionButton
                        images={repair.deviceImages}
                        ticketNumber={repair.ticketNumber}
                        layout="mobile"
                        onClick={() => onViewImages(repair)}
                        className="size-9"
                    />
                    <Button variant="ghost" size="icon" onClick={() => onPrint(repair)} className="h-9 w-9 text-muted-foreground hover:text-foreground" title="Imprimir">
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Row 2: Device + Customer */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest italic leading-none">{repair.deviceBrand}</span>
                    <span className="text-sm font-black text-foreground uppercase tracking-tight leading-snug">{repair.deviceModel}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-foreground uppercase tracking-tight">{repair.customer.name}</span>
                    {repair.customer.phone && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground tabular-nums">
                            <Phone className="h-3 w-3" />{repair.customer.phone}
                        </span>
                    )}
                </div>
            </div>

            {/* Row 3: Date + Duration */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {repair.updatedAt ? format(new Date(repair.updatedAt), "dd/MM/yy HH:mm", { locale: es }) : "–"}
                </span>
                <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-black italic tabular-nums", dColor)}>
                    <Clock className="h-3 w-3" />{duration}
                </span>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {repair.assignedTo ? repair.assignedTo.name?.split(" ")[0] : "Sin técnico"}
                </span>
                <span className="text-sm font-black tabular-nums">
                    {(repair.estimatedPrice ?? 0) > 0 ? `$${repair.estimatedPrice!.toLocaleString()}` : "-"}
                </span>
            </div>
        </li>
    );
}
