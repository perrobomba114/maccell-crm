"use client";

// Desktop table row for the active repairs list. Mobile uses ActiveRepairCard.

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Camera, Eye, Printer, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RepairTimer } from "./repair-timer";
import { RepairImagesActionButton, getRepairImageCount } from "./repair-images-action-button";
import { TechnicianActionButton } from "./technician-action-button";
import {
    type ActiveRepair,
    ACTIVE_STATUS_COLOR_MAP,
    calcRepairDuration,
    isOverdue,
    positionBadgeClass,
} from "./active-repairs-types";

type ActiveRepairRowProps = {
    repair: ActiveRepair;
    position: number;
    enableTakeover: boolean;
    enableManagement: boolean;
    enableImageUpload: boolean;
    showActionColumn: boolean;
    currentUserId: string;
    showIssueSummary: boolean;
    onViewDetails: (repair: ActiveRepair) => void;
    onViewImages: (repair: ActiveRepair) => void;
    onTakeover: (repair: ActiveRepair) => void;
    onImageUpload: (repair: ActiveRepair) => void;
    onAssignment: (repair: ActiveRepair) => void;
    onTransfer: (repair: ActiveRepair) => void;
    onPrint: (repair: ActiveRepair) => void;
};

export function ActiveRepairRow({
    repair,
    position,
    enableTakeover,
    enableManagement,
    enableImageUpload,
    showActionColumn,
    currentUserId,
    showIssueSummary,
    onViewDetails,
    onViewImages,
    onTakeover,
    onImageUpload,
    onAssignment,
    onTransfer,
    onPrint,
}: ActiveRepairRowProps) {
    const colorClass = ACTIVE_STATUS_COLOR_MAP[repair.status.color ?? ""] || "bg-gray-100 text-gray-800";
    const duration = calcRepairDuration(repair.startedAt, repair.finishedAt);
    const overdue = isOverdue(repair.promisedAt);
    const imageCount = getRepairImageCount(repair.deviceImages);

    return (
        <TableRow
            className={cn(
                "border-b border-border/60 transition-colors group",
                overdue ? "bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-red-500" : "hover:bg-muted/40"
            )}
        >
            <TableCell className="text-center px-1">
                <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", positionBadgeClass(position))}>
                    {position}
                </span>
            </TableCell>

            <TableCell className={cn(
                "text-center font-bold font-mono text-sm px-1",
                repair.isWet ? "text-blue-500" : repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" : ""
            )}>
                <div className="flex flex-col items-center gap-1">
                    <span>{repair.ticketNumber}</span>
                    <div className="flex gap-1">
                        {repair.isWet && (
                            <span className="rounded bg-blue-600 px-1 text-[8px] font-black text-white shadow-sm animate-pulse">MOJADO</span>
                        )}
                        {repair.isWarranty && (
                            <span className="rounded bg-amber-500 px-1 text-[8px] font-black text-white shadow-sm">GARANTÍA</span>
                        )}
                    </div>
                </div>
            </TableCell>

            <TableCell className="text-center px-1">
                <span className={cn("text-sm font-bold whitespace-nowrap", overdue ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                    {format(new Date(repair.promisedAt), "dd/MM HH:mm", { locale: es })}
                </span>
                {overdue && <div className="text-[9px] font-black uppercase tracking-wider text-red-500">Vencida</div>}
            </TableCell>

            <TableCell className="text-center px-1">
                <div className="flex h-7 items-center justify-center">
                    {duration ? (
                        <span className="text-sm font-bold tabular-nums text-yellow-600 dark:text-yellow-400">{duration}</span>
                    ) : (
                        <RepairTimer
                            startedAt={repair.startedAt ?? null}
                            estimatedMinutes={repair.estimatedTime ?? null}
                            statusId={repair.statusId}
                            onAdd={enableManagement ? () => onAssignment(repair) : undefined}
                        />
                    )}
                </div>
            </TableCell>

            <TableCell className="text-center px-2">
                <div className="flex flex-col items-center">
                    <span className="whitespace-nowrap text-sm font-semibold">{repair.customer.name}</span>
                    <span className="text-[10px] text-muted-foreground">{repair.customer.phone}</span>
                </div>
            </TableCell>

            <TableCell className="max-w-[180px] text-center px-2">
                <div className="flex flex-col items-center">
                    <span className="whitespace-normal text-sm font-semibold leading-tight">
                        {repair.deviceBrand} {repair.deviceModel}
                    </span>
                    {showIssueSummary && repair.problemDescription && (
                        <span className="mt-1 block max-w-[150px] truncate text-[10px] text-muted-foreground" title={repair.problemDescription}>
                            {repair.problemDescription}
                        </span>
                    )}
                </div>
            </TableCell>

            <TableCell className="w-[100px] text-center px-1">
                {repair.assignedTo ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 text-[10px] py-0">
                        {repair.assignedTo.name?.split(" ")[0]}
                    </Badge>
                ) : (
                    <span className="text-[10px] font-black italic text-amber-500">Sin técnico</span>
                )}
            </TableCell>

            <TableCell className="whitespace-nowrap text-center text-sm font-bold px-1">
                {(repair.estimatedPrice ?? 0) > 0 ? `$${repair.estimatedPrice!.toLocaleString()}` : "-"}
            </TableCell>

            <TableCell className="text-center px-1">
                <Badge variant="outline" className={cn("border text-[10px] font-bold uppercase py-0", colorClass)}>
                    {repair.status.name}
                </Badge>
                {repair.statusHistory?.[0] && (
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-tighter text-muted-foreground tabular-nums">
                        Prev: <span className="text-blue-500/80">{repair.statusHistory[0].fromStatus?.name || "Registro"}</span>
                    </div>
                )}
            </TableCell>

            {showActionColumn && (
                <TableCell className="text-center px-1">
                    <div className="flex h-9 items-center justify-center gap-1">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => onViewDetails(repair)}
                            className="size-9 rounded-full text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500"
                            title="Ver detalles"
                            aria-label={`Ver detalle de reparación ${repair.ticketNumber}`}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>

                        <RepairImagesActionButton
                            images={repair.deviceImages}
                            ticketNumber={repair.ticketNumber}
                            onClick={() => onViewImages(repair)}
                        />

                        {enableTakeover && (
                            <Button size="xs" onClick={() => onTakeover(repair)} className="w-[85px] justify-center bg-blue-600 px-2 font-bold text-white hover:bg-blue-700">
                                <span className="truncate">Retirar</span>
                            </Button>
                        )}

                        {enableImageUpload && imageCount < 3 && (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => onImageUpload(repair)}
                                className="size-9 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                title="Cargar fotos"
                                aria-label={`Cargar fotos para reparación ${repair.ticketNumber}`}
                            >
                                <Camera className="h-4 w-4" />
                            </Button>
                        )}

                        {!enableManagement && (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => onPrint(repair)}
                                className="size-9 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                title="Imprimir"
                                aria-label={`Imprimir reparación ${repair.ticketNumber}`}
                            >
                                <Printer className="h-4 w-4" />
                            </Button>
                        )}

                        {enableManagement && (
                            <div className="flex items-center gap-1">
                                <TechnicianActionButton repair={repair} currentUserId={currentUserId} />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onTransfer(repair)}
                                    className="size-9 rounded-full text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500"
                                    title="Transferir"
                                    aria-label={`Transferir reparación ${repair.ticketNumber}`}
                                >
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
}
