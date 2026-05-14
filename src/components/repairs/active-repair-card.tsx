"use client";

// Mobile card for a single active repair.
// Shown on screens < sm (640px). Desktop uses the inline TableRow in active-repairs-table.tsx.

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Camera, Printer, Share2, Clock, CalendarCheck, Banknote, User, UserX, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RepairTimer } from "./repair-timer";
import { TechnicianActionButton } from "./technician-action-button";
import { type ActiveRepair, ACTIVE_STATUS_COLOR_MAP, positionBadgeClass, calcRepairDuration, isOverdue } from "./active-repairs-types";

interface ActiveRepairCardProps {
    repair: ActiveRepair;
    position: number;
    enableTakeover: boolean;
    enableManagement: boolean;
    enableImageUpload: boolean;
    currentUserId: string;
    showIssueSummary: boolean;
    onViewDetails: (r: ActiveRepair) => void;
    onTakeover: (r: ActiveRepair) => void;
    onImageUpload: (r: ActiveRepair) => void;
    onAssignment: (r: ActiveRepair) => void;
    onTransfer: (r: ActiveRepair) => void;
    onPrint: (r: ActiveRepair) => void;
}

export function ActiveRepairCard({
    repair, position, enableTakeover, enableManagement, enableImageUpload,
    currentUserId, showIssueSummary,
    onViewDetails, onTakeover, onImageUpload, onAssignment, onTransfer, onPrint,
}: ActiveRepairCardProps) {
    const colorClass = ACTIVE_STATUS_COLOR_MAP[repair.status.color ?? ""] || "bg-gray-100 text-gray-800";
    const duration = calcRepairDuration(repair.startedAt, repair.finishedAt);
    const hasActions = enableTakeover || enableManagement || enableImageUpload;
    const overdue = isOverdue(repair.promisedAt);
    const unassigned = !repair.assignedTo;

    return (
        <li className={cn(
            "p-4 flex flex-col gap-3 transition-colors relative",
            overdue
                ? "bg-red-500/5 hover:bg-red-500/10 border-l-4 border-l-red-500"
                : "hover:bg-muted/30 border-l-4 border-l-transparent"
        )}>
            {/* Overdue banner */}
            {overdue && (
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Entrega vencida</span>
                </div>
            )}

            {/* Row 1: Position + Ticket + Status + Actions */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-full font-bold text-xs shrink-0", positionBadgeClass(position))}>
                        {position}
                    </span>
                    <span className={cn(
                        "font-black font-mono text-sm",
                        repair.isWet ? "text-blue-500" :
                            repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" :
                                "text-foreground"
                    )}>
                        {repair.ticketNumber}
                    </span>
                    <Badge variant="outline" className={`font-bold border text-[10px] py-0 uppercase ${colorClass}`}>
                        {repair.status.name}
                    </Badge>
                </div>
                {/* Quick actions */}
                <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => onViewDetails(repair)} className="h-8 w-8 text-muted-foreground hover:text-blue-500" title="Ver detalles">
                        <Eye className="h-4 w-4" />
                    </Button>
                    {!enableManagement && (
                        <Button size="icon" variant="ghost" onClick={() => onPrint(repair)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Imprimir">
                            <Printer className="h-4 w-4" />
                        </Button>
                    )}
                    {enableImageUpload && (!repair.deviceImages || repair.deviceImages.length < 3) && (
                        <Button size="icon" variant="ghost" onClick={() => onImageUpload(repair)} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Fotos">
                            <Camera className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Row 2: Customer + Device */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-bold text-sm text-foreground">{repair.customer.name}</span>
                    </div>
                    {repair.customer.phone && (
                        <span className="text-xs text-muted-foreground pl-4">{repair.customer.phone}</span>
                    )}
                </div>
                <div className="flex flex-col items-end">
                    <span className="font-semibold text-sm text-right leading-tight">{repair.deviceBrand} {repair.deviceModel}</span>
                    {showIssueSummary && repair.problemDescription && (
                        <span className="text-[10px] text-muted-foreground text-right truncate max-w-[160px]">{repair.problemDescription}</span>
                    )}
                </div>
            </div>

            {/* Row 3: Entrega + Tiempo + Precio + Técnico */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className={cn("flex items-center gap-1.5", overdue && "text-red-500")}>
                    <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                    <span className={cn("text-xs font-bold tabular-nums", overdue ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                        {format(new Date(repair.promisedAt), "dd/MM HH:mm", { locale: es })}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                    {duration ? (
                        <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400 tabular-nums">{duration}</span>
                    ) : (
                        <RepairTimer
                            startedAt={repair.startedAt ?? null}
                            estimatedMinutes={repair.estimatedTime ?? null}
                            statusId={repair.statusId}
                            onAdd={enableManagement ? () => onAssignment(repair) : undefined}
                        />
                    )}
                </div>
                {(repair.estimatedPrice ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-bold text-sm tabular-nums">${repair.estimatedPrice!.toLocaleString()}</span>
                    </div>
                )}
                {/* Técnico asignado o advertencia */}
                {repair.assignedTo ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 text-[10px] py-0">
                        {repair.assignedTo.name?.split(' ')[0]}
                    </Badge>
                ) : unassigned && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <UserX className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Sin técnico</span>
                    </div>
                )}
            </div>

            {/* Row 4: Management actions */}
            {hasActions && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    {enableTakeover && (
                        <Button size="sm" onClick={() => onTakeover(repair)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex-1">
                            Retirar
                        </Button>
                    )}
                    {enableManagement && (
                        <>
                            <TechnicianActionButton repair={repair} currentUserId={currentUserId} />
                            <Button size="icon" variant="ghost" onClick={() => onTransfer(repair)} className="h-8 w-8 text-muted-foreground hover:text-blue-500" title="Transferir">
                                <Share2 className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            )}
        </li>
    );
}
