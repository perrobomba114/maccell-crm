"use client";

// Orchestrates search, stats banner, chip filters, mobile cards, desktop table,
// pull-to-refresh (mobile), and all dialogs for the active repairs view.

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Camera, Printer, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TechnicianActionButton } from "./technician-action-button";
import { TakeRepairDialog } from "./take-repair-dialog";
import { RepairTimer } from "./repair-timer";
import { AssignmentModal } from "./assignment-modal";
import { AddImagesDialog } from "./add-images-dialog";
import { RepairDetailsDialog } from "./repair-details-dialog";
import { TransferRepairDialog } from "./transfer-repair-dialog";
import { printRepairTicket, printWarrantyTicket, printWetReport } from "@/lib/print-utils";
import { Share2 } from "lucide-react";
import { AddPartDialog } from "./add-part-dialog";
import { ActiveRepairCard } from "./active-repair-card";
import { ActiveRepairsStats } from "./active-repairs-stats";
import { type ActiveRepair, type ActiveRepairsTableProps, ACTIVE_STATUS_COLOR_MAP, positionBadgeClass, calcRepairDuration, isOverdue } from "./active-repairs-types";
import { cn } from "@/lib/utils";

export function ActiveRepairsTable({
    repairs,
    emptyMessage = "No hay reparaciones activas.",
    enableTakeover = false,
    enableManagement = false,
    enableImageUpload = false,
    currentUserId = "",
    showIssueSummary = false
}: ActiveRepairsTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeChip, setActiveChip] = useState(0);
    const [takeoverRepair, setTakeoverRepair] = useState<ActiveRepair | null>(null);
    const [assignmentRepair, setAssignmentRepair] = useState<ActiveRepair | null>(null);
    const [imageUploadRepair, setImageUploadRepair] = useState<ActiveRepair | null>(null);
    const [viewDetailsRepair, setViewDetailsRepair] = useState<ActiveRepair | null>(null);
    const [transferRepair, setTransferRepair] = useState<ActiveRepair | null>(null);
    const [addPartRepair, setAddPartRepair] = useState<ActiveRepair | null>(null);
    const router = useRouter();

    // ── Pull-to-refresh (mobile) ───────────────────────────────────────────
    const listRef = useRef<HTMLUListElement>(null);
    const touchStartY = useRef(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        const delta = e.changedTouches[0].clientY - touchStartY.current;
        const el = listRef.current;
        if (delta > 70 && el && el.scrollTop === 0 && !isRefreshing) {
            setIsRefreshing(true);
            router.refresh();
            setTimeout(() => setIsRefreshing(false), 1500);
        }
    }, [isRefreshing, router]);

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        el.addEventListener("touchstart", handleTouchStart, { passive: true });
        el.addEventListener("touchend", handleTouchEnd, { passive: true });
        return () => {
            el.removeEventListener("touchstart", handleTouchStart);
            el.removeEventListener("touchend", handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchEnd]);

    const handlePrint = (repair: ActiveRepair) => {
        printRepairTicket(repair as Parameters<typeof printRepairTicket>[0]);
        if (repair.statusId === 10 || repair.status?.id === 10 || repair.status?.name === "Entregado") {
            const stub = { ticketNumber: repair.ticketNumber, deviceBrand: repair.deviceBrand, deviceModel: repair.deviceModel, customer: { name: repair.customer.name }, isWet: repair.isWet, branch: repair.branch };
            setTimeout(() => {
                printWarrantyTicket(stub);
                if (repair.isWet) setTimeout(() => printWetReport(stub), 1200);
            }, 1000);
        }
    };

    const sortedRepairs = useMemo(() => [...repairs].sort((a, b) => {
        const dateA = a.promisedAt ? new Date(a.promisedAt).getTime() : Infinity;
        const dateB = b.promisedAt ? new Date(b.promisedAt).getTime() : Infinity;
        return dateA - dateB;
    }), [repairs]);

    const filteredRepairs = useMemo(() => {
        const words = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
        return sortedRepairs.filter(repair => {
            if (activeChip !== 0 && repair.statusId !== activeChip) return false;
            const fields = [repair.ticketNumber, repair.customer.name, repair.customer.phone || "", repair.deviceBrand, repair.deviceModel].map(f => f.toLowerCase());
            return words.length === 0 || words.every(w => fields.some(f => f.includes(w)));
        });
    }, [sortedRepairs, searchTerm, activeChip]);

    const cardProps = {
        enableTakeover, enableManagement, enableImageUpload, currentUserId, showIssueSummary,
        onViewDetails: setViewDetailsRepair,
        onTakeover: setTakeoverRepair,
        onImageUpload: setImageUploadRepair,
        onAssignment: setAssignmentRepair,
        onTransfer: setTransferRepair,
        onPrint: handlePrint,
    };

    if (!repairs || repairs.length === 0) {
        return <div className="text-center p-8 border rounded-lg bg-muted/10"><p className="text-muted-foreground font-medium">{emptyMessage}</p></div>;
    }

    return (
        <div className="space-y-4">
            {/* Stats banner + chip filters */}
            <ActiveRepairsStats repairs={sortedRepairs} activeChip={activeChip} onChipChange={setActiveChip} />

            {/* Search */}
            <div className="flex gap-2">
                <div className="relative flex-1 group">
                    <Label htmlFor="active-repairs-search" className="sr-only">Buscar reparaciones activas</Label>
                    <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 transition-opacity duration-300 blur opacity-0 group-focus-within:opacity-20" />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-blue-500 z-10" />
                    <Input
                        id="active-repairs-search"
                        name="active-repairs-search"
                        aria-label="Buscar por Ticket, Cliente o Dispositivo"
                        placeholder="Buscar por Ticket, Cliente o Dispositivo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="relative z-0 pl-11 h-12 bg-card border-2 border-border shadow-sm transition-all focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/20 rounded-xl"
                    />
                </div>
            </div>

            {/* Mobile: pull-to-refresh hint + cards */}
            <ul ref={listRef} className={cn("sm:hidden border rounded-xl overflow-hidden bg-card shadow-sm divide-y divide-border/60 overflow-y-auto", isRefreshing && "opacity-60 pointer-events-none")}>
                {isRefreshing && (
                    <li className="text-center py-3 text-xs text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Actualizando…</li>
                )}
                {filteredRepairs.length === 0 ? (
                    <li className="text-center p-8 text-muted-foreground">No se encontraron resultados.</li>
                ) : (
                    filteredRepairs.map((repair, index) => (
                        <ActiveRepairCard key={repair.id} repair={repair} position={index + 1} {...cardProps} />
                    ))
                )}
            </ul>

            {/* Desktop: table */}
            <div className="hidden sm:block border rounded-xl overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader className="border-b-2 border-border bg-muted/70 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent border-none">
                            {["Pos.", "Ticket", "Entrega", "Est.", "Cliente", "Dispositivo", "Técnico", "Precio", "Estado"].map(h => (
                                <TableHead key={h} className="text-center px-1 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">{h}</TableHead>
                            ))}
                            {(enableTakeover || enableManagement || enableImageUpload) && (
                                <TableHead className="text-center w-[130px] px-1 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Acciones</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRepairs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={(enableTakeover || enableManagement || enableImageUpload) ? 10 : 9} className="h-24 text-center">No se encontraron resultados.</TableCell>
                            </TableRow>
                        ) : (
                            filteredRepairs.map((repair, index) => {
                                const colorClass = ACTIVE_STATUS_COLOR_MAP[repair.status.color ?? ""] || "bg-gray-100 text-gray-800";
                                const position = index + 1;
                                const duration = calcRepairDuration(repair.startedAt, repair.finishedAt);
                                const overdue = isOverdue(repair.promisedAt);
                                return (
                                    <TableRow key={repair.id} className={cn(
                                        "border-b border-border/60 transition-colors group",
                                        overdue ? "bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-red-500" : "hover:bg-muted/40"
                                    )}>
                                        <TableCell className="text-center px-1">
                                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-bold text-xs ${positionBadgeClass(position)}`}>{position}</span>
                                        </TableCell>
                                        <TableCell className={`text-center font-bold font-mono text-sm px-1 ${repair.isWet ? "text-blue-500" : repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                                            {repair.ticketNumber}
                                        </TableCell>
                                        <TableCell className="text-center px-1">
                                            <span className={cn("text-sm font-bold whitespace-nowrap", overdue ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                                                {format(new Date(repair.promisedAt), "dd/MM HH:mm", { locale: es })}
                                            </span>
                                            {overdue && <div className="text-[9px] font-black text-red-500 uppercase tracking-wider">Vencida</div>}
                                        </TableCell>
                                        <TableCell className="text-center px-1">
                                            <div className="flex items-center justify-center h-7">
                                                {duration ? (
                                                    <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400 tabular-nums">{duration}</span>
                                                ) : (
                                                    <RepairTimer startedAt={repair.startedAt ?? null} estimatedMinutes={repair.estimatedTime ?? null} statusId={repair.statusId} onAdd={enableManagement ? () => setAssignmentRepair(repair) : undefined} />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-2">
                                            <div className="flex flex-col items-center">
                                                <span className="font-semibold text-sm whitespace-nowrap">{repair.customer.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{repair.customer.phone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-2 max-w-[180px]">
                                            <div className="flex flex-col items-center">
                                                <span className="font-semibold text-sm whitespace-normal leading-tight">{repair.deviceBrand} {repair.deviceModel}</span>
                                                {showIssueSummary && repair.problemDescription && (
                                                    <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-[150px] block" title={repair.problemDescription}>{repair.problemDescription}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center w-[100px] px-1">
                                            {repair.assignedTo ? (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 text-[10px] py-0">
                                                    {repair.assignedTo.name?.split(' ')[0]}
                                                </Badge>
                                            ) : (
                                                <span className="text-amber-500 text-[10px] font-black italic">Sin técnico</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-sm px-1 whitespace-nowrap">
                                            {(repair.estimatedPrice ?? 0) > 0 ? `$${repair.estimatedPrice!.toLocaleString()}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-center px-1">
                                            <Badge variant="outline" className={`font-bold border text-[10px] py-0 uppercase ${colorClass}`}>{repair.status.name}</Badge>
                                            {repair.statusHistory?.[0] && (
                                                <div className="text-[9px] text-muted-foreground mt-1 tabular-nums font-bold uppercase tracking-tighter">
                                                    Prev: <span className="text-blue-500/80">{repair.statusHistory[0].fromStatus?.name || 'Registro'}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        {(enableTakeover || enableManagement || enableImageUpload) && (
                                            <TableCell className="text-center px-1">
                                                <div className="flex items-center justify-start gap-1 h-7 pl-6">
                                                    <div className="w-8 flex justify-center shrink-0">
                                                        <Button size="icon-xs" variant="ghost" onClick={() => setViewDetailsRepair(repair)} className="text-muted-foreground hover:text-blue-500" title="Ver Detalles">
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                    {enableTakeover && (
                                                        <Button size="xs" onClick={() => setTakeoverRepair(repair)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-[85px] justify-center px-2">
                                                            <span className="truncate">Retirar</span>
                                                        </Button>
                                                    )}
                                                    {enableImageUpload && (!repair.deviceImages || repair.deviceImages.length < 3) && (
                                                        <Button size="icon-xs" variant="ghost" onClick={() => setImageUploadRepair(repair)} className="text-muted-foreground hover:text-primary" title="Fotos">
                                                            <Camera className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {!enableManagement && (
                                                        <Button size="icon-xs" variant="ghost" onClick={() => handlePrint(repair)} className="text-muted-foreground hover:text-primary" title="Imprimir">
                                                            <Printer className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {enableManagement && (
                                                        <div className="flex gap-1">
                                                            <TechnicianActionButton repair={repair} currentUserId={currentUserId} />
                                                            <Button size="icon-xs" variant="ghost" onClick={() => setTransferRepair(repair)} className="text-muted-foreground hover:text-blue-500" title="Transferir">
                                                                <Share2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialogs */}
            <TakeRepairDialog isOpen={!!takeoverRepair} onClose={() => setTakeoverRepair(null)} repair={takeoverRepair} currentUserId={currentUserId} />
            {assignmentRepair && <AssignmentModal isOpen={!!assignmentRepair} onClose={() => setAssignmentRepair(null)} repair={assignmentRepair} currentUserId={currentUserId} />}
            {imageUploadRepair && <AddImagesDialog isOpen={!!imageUploadRepair} onClose={() => setImageUploadRepair(null)} repair={imageUploadRepair} />}
            {viewDetailsRepair && (
                <RepairDetailsDialog
                    isOpen={!!viewDetailsRepair}
                    onClose={() => setViewDetailsRepair(null)}
                    repair={viewDetailsRepair}
                    currentUserId={currentUserId}
                    onAddPart={() => { setAddPartRepair(viewDetailsRepair); setViewDetailsRepair(null); }}
                />
            )}
            {transferRepair && <TransferRepairDialog isOpen={!!transferRepair} onClose={() => setTransferRepair(null)} repair={transferRepair} currentUserId={currentUserId} />}
            {addPartRepair && <AddPartDialog isOpen={!!addPartRepair} onClose={() => setAddPartRepair(null)} repair={addPartRepair} currentUserId={currentUserId} />}
        </div>
    );
}
