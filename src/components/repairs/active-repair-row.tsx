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
            {/* 1. Posición */}
            <TableCell className="w-10 text-center px-1 py-2.5">
                <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black", positionBadgeClass(position))}>
                    {position}
                </span>
            </TableCell>

            {/* 2. Ticket */}
            <TableCell className={cn(
                "text-center font-bold font-mono text-xs sm:text-sm px-1.5 py-2.5 whitespace-nowrap",
                repair.isWet ? "text-blue-500" : repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" : ""
            )}>
                <div className="flex flex-col items-center gap-0.5">
                    <span className="tracking-tight">{repair.ticketNumber}</span>
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

            {/* 3. Entrega Prometida */}
            <TableCell className="text-center px-1.5 py-2.5 whitespace-nowrap">
                <span className={cn("text-xs sm:text-sm font-bold tracking-tight", overdue ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                    {format(new Date(repair.promisedAt), "dd/MM HH:mm", { locale: es })}
                </span>
                {overdue && <div className="text-[8px] font-black uppercase tracking-wider text-red-500 leading-tight">Vencida</div>}
            </TableCell>

            {/* 4. Tiempo / Estimado */}
            <TableCell className="text-center px-1 py-2.5 whitespace-nowrap">
                <div className="flex h-7 items-center justify-center">
                    {duration ? (
                        <span className="text-xs sm:text-sm font-bold tabular-nums text-yellow-600 dark:text-yellow-400">{duration}</span>
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

            {/* 5. Cliente */}
            <TableCell className="text-left px-2 py-2.5 max-w-[130px]">
                <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs sm:text-sm font-bold text-slate-100" title={repair.customer.name}>
                        {repair.customer.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">{repair.customer.phone}</span>
                </div>
            </TableCell>

            {/* 6. Dispositivo */}
            <TableCell className="text-left px-2 py-2.5 max-w-[160px]">
                <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs sm:text-sm font-bold text-white uppercase italic" title={`${repair.deviceBrand} ${repair.deviceModel}`}>
                        {repair.deviceBrand} {repair.deviceModel}
                    </span>
                    {showIssueSummary && repair.problemDescription && (
                        <span className="mt-0.5 block max-w-[150px] truncate text-[9px] text-muted-foreground" title={repair.problemDescription}>
                            {repair.problemDescription}
                        </span>
                    )}
                </div>
            </TableCell>

            {/* 7. Técnico */}
            <TableCell className="text-center px-1 py-2.5 whitespace-nowrap">
                {repair.assignedTo ? (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-bold py-0.5 px-2">
                        {repair.assignedTo.name?.split(" ")[0]}
                    </Badge>
                ) : (
                    <span className="text-[10px] font-black italic text-amber-500">Sin técnico</span>
                )}
            </TableCell>

            {/* 8. Precio */}
            <TableCell className="whitespace-nowrap text-center text-xs sm:text-sm font-bold px-1.5 py-2.5">
                {(repair.estimatedPrice ?? 0) > 0 ? `$${repair.estimatedPrice!.toLocaleString()}` : "-"}
            </TableCell>

            {/* 9. Estado */}
            <TableCell className="text-center px-1.5 py-2.5 whitespace-nowrap">
                <Badge variant="outline" className={cn("border text-[9px] font-black uppercase py-0.5 px-2", colorClass)}>
                    {repair.status.name}
                </Badge>
                {repair.statusHistory?.[0] && (
                    <div className="mt-0.5 text-[8px] font-bold uppercase tracking-tight text-muted-foreground">
                        Prev: <span className="text-blue-400">{repair.statusHistory[0].fromStatus?.name || "Registro"}</span>
                    </div>
                )}
            </TableCell>

            {/* 10. Acciones unificadas en el orden exacto */}
            {showActionColumn && (
                <TableCell className="px-2 py-2.5 text-center whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1.5">
                        {/* 1. Botón Principal de Acción (Asignarme, Iniciar, Terminar, Reactivar, Retirar) */}
                        {enableTakeover ? (
                            <Button size="xs" onClick={() => onTakeover(repair)} className="h-8 w-[84px] justify-center bg-blue-600 px-2 font-black uppercase text-[10px] text-white hover:bg-blue-700 rounded-lg shadow-sm">
                                <span className="truncate">Retirar</span>
                            </Button>
                        ) : null}
                        {enableManagement ? (
                            <TechnicianActionButton repair={repair} currentUserId={currentUserId} />
                        ) : null}

                        {/* 2. Ver Detalle (Ojito) */}
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => onViewDetails(repair)}
                            className="size-8 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-blue-400 transition-colors"
                            title="Ver detalles"
                            aria-label={`Ver detalle de reparación ${repair.ticketNumber}`}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>

                        {/* 3. Ver Imágenes (si tiene) */}
                        {imageCount > 0 && (
                            <RepairImagesActionButton
                                images={repair.deviceImages}
                                ticketNumber={repair.ticketNumber}
                                onClick={() => onViewImages(repair)}
                                className="size-8 rounded-lg"
                            />
                        )}

                        {/* Cargar Fotos o Imprimir */}
                        {enableImageUpload && imageCount < 3 ? (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => onImageUpload(repair)}
                                className="size-8 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-cyan-400 transition-colors"
                                title="Cargar fotos"
                                aria-label={`Cargar fotos para reparación ${repair.ticketNumber}`}
                            >
                                <Camera className="h-4 w-4" />
                            </Button>
                        ) : !enableManagement ? (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => onPrint(repair)}
                                className="size-8 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-primary transition-colors"
                                title="Imprimir"
                                aria-label={`Imprimir reparación ${repair.ticketNumber}`}
                            >
                                <Printer className="h-4 w-4" />
                            </Button>
                        ) : null}

                        {/* 4. Compartir / Transferir Reparación */}
                        {enableManagement ? (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => onTransfer(repair)}
                                className="size-8 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-blue-400 transition-colors"
                                title="Transferir"
                                aria-label={`Transferir reparación ${repair.ticketNumber}`}
                            >
                                <Share2 className="h-4 w-4" />
                            </Button>
                        ) : null}
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
}
