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
import { RepairImagesActionButton } from "./repair-images-action-button";
import { type RepairData, STATUS_COLOR_MAP, calcDuration, durationColorClass } from "./repair-history-types";

interface RepairHistoryRowProps {
    repair: RepairData;
    isPending: boolean;
    loadingId: string | null;
    onPrint: (repair: RepairData) => void;
    onViewDetails: (id: string) => void;
    onViewImages: (repair: RepairData) => void;
}

export function RepairHistoryRow({ repair, isPending, loadingId, onPrint, onViewDetails, onViewImages }: RepairHistoryRowProps) {
    const colorClass = STATUS_COLOR_MAP[repair.status.color ?? ""] || "bg-gray-100 text-gray-800";
    const duration = calcDuration(repair.startedAt, repair.finishedAt);
    const dColor = durationColorClass(duration);
    const isLoading = isPending && loadingId === repair.id;

    return (
        <TableRow className="border-b border-border/60 transition-colors hover:bg-muted/40 group">
            <TableCell className={cn(
                "text-center py-5 px-3 font-bold font-mono text-sm",
                repair.isWet ? "text-blue-500" : repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" : ""
            )}>
                <div className="flex flex-col items-center gap-1">
                    <span>{repair.ticketNumber}</span>
                    <div className="flex gap-1">
                        {repair.isWet && (
                            <span className="rounded bg-blue-600 px-1 text-[8px] font-black text-white shadow-sm">MOJADO</span>
                        )}
                        {repair.isWarranty && (
                            <span className="rounded bg-amber-500 px-1 text-[8px] font-black text-white shadow-sm">GARANTÍA</span>
                        )}
                    </div>
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
                <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold leading-tight text-foreground group-hover:text-blue-500 transition-colors duration-300">
                        {repair.customer.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{repair.customer.phone || "Sin contacto"}</span>
                </div>
            </TableCell>

            <TableCell className="max-w-[190px] text-center px-3">
                <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold leading-tight">
                        {repair.deviceBrand} {repair.deviceModel}
                    </span>
                    {repair.problemDescription && (
                        <span className="mt-1 block max-w-[160px] truncate text-[10px] text-muted-foreground" title={repair.problemDescription}>
                            {repair.problemDescription}
                        </span>
                    )}
                </div>
            </TableCell>

            <TableCell className="w-[100px] text-center px-3">
                {repair.assignedTo ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 text-[10px] py-0">
                        {repair.assignedTo.name?.split(" ")[0]}
                    </Badge>
                ) : (
                    <span className="text-[10px] font-black italic text-amber-500">Sin técnico</span>
                )}
            </TableCell>

            <TableCell className="whitespace-nowrap text-center text-sm font-bold px-3">
                {(repair.estimatedPrice ?? 0) > 0 ? `$${repair.estimatedPrice!.toLocaleString()}` : "-"}
            </TableCell>

            <TableCell className="text-center px-3">
                <div className="flex flex-col items-center gap-1">
                    <Badge className={cn("rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-wider", colorClass)}>
                        {repair.status.name}
                    </Badge>
                    {repair.statusHistory?.[0] && (
                        <div className="mt-1 text-[9px] font-bold uppercase tracking-tighter text-muted-foreground tabular-nums">
                            Prev: <span className="text-blue-500">{repair.statusHistory[0].fromStatus?.name || "Registro"}</span>
                        </div>
                    )}
                </div>
            </TableCell>

            <TableCell className="text-center px-3">
                <div className="flex h-9 items-center justify-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewDetails(repair.id)}
                        disabled={isLoading}
                        className="size-9 rounded-full text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500"
                        title="Ver detalles"
                        aria-label={`Ver detalle de reparación ${repair.ticketNumber}`}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </Button>

                    <RepairImagesActionButton
                        images={repair.deviceImages}
                        ticketNumber={repair.ticketNumber}
                        onClick={() => onViewImages(repair)}
                    />

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onPrint(repair)}
                        className="size-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Imprimir ticket"
                        aria-label={`Imprimir reparación ${repair.ticketNumber}`}
                    >
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
