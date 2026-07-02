"use client";

// Orchestrates search, stats banner, chip filters, mobile cards, desktop table,
// pull-to-refresh (mobile), and all dialogs for the active repairs view.

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { TakeRepairDialog } from "./take-repair-dialog";
import { AssignmentModal } from "./assignment-modal";
import { AddImagesDialog } from "./add-images-dialog";
import { RepairDetailsDialog } from "./repair-details-dialog";
import { TransferRepairDialog } from "./transfer-repair-dialog";
import { RepairImagesDialog } from "./repair-images-dialog";
import { AddPartDialog } from "./add-part-dialog";
import { ActiveRepairCard } from "./active-repair-card";
import { ActiveRepairRow } from "./active-repair-row";
import { ActiveRepairsStats } from "./active-repairs-stats";
import { type ActiveRepair, type ActiveRepairsTableProps } from "./active-repairs-types";
import { getRepairImageCount } from "./repair-images-action-button";
import { printRepairTicketSequence } from "@/lib/repair-print-sequence";
import { cn } from "@/lib/utils";

export function ActiveRepairsTable({
    repairs,
    emptyMessage = "No hay reparaciones activas.",
    enableTakeover = false,
    enableManagement = false,
    enableImageUpload = false,
    currentUserId = "",
    showIssueSummary = false,
    completedToday = 0,
    globalPendingCount = 0
}: ActiveRepairsTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeChip, setActiveChip] = useState(0);
    const [takeoverRepair, setTakeoverRepair] = useState<ActiveRepair | null>(null);
    const [assignmentRepair, setAssignmentRepair] = useState<ActiveRepair | null>(null);
    const [imageUploadRepair, setImageUploadRepair] = useState<ActiveRepair | null>(null);
    const [imageViewRepair, setImageViewRepair] = useState<ActiveRepair | null>(null);
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
            setIsRefreshing(false);
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
        printRepairTicketSequence(repair);
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
        onViewImages: setImageViewRepair,
        onTakeover: setTakeoverRepair,
        onImageUpload: setImageUploadRepair,
        onAssignment: setAssignmentRepair,
        onTransfer: setTransferRepair,
        onPrint: handlePrint,
    };

    const showActionColumn = enableTakeover || enableManagement || enableImageUpload || sortedRepairs.some((repair) => getRepairImageCount(repair.deviceImages) > 0);

    if (!repairs || repairs.length === 0) {
        return <div className="text-center p-8 border rounded-lg bg-muted/10"><p className="text-muted-foreground font-medium">{emptyMessage}</p></div>;
    }

    return (
        <div className="space-y-4">
            {/* Stats banner + chip filters */}
            <ActiveRepairsStats 
                repairs={sortedRepairs} 
                activeChip={activeChip} 
                onChipChange={setActiveChip} 
                completedToday={completedToday}
                globalPendingCount={globalPendingCount}
            />

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
                            {showActionColumn && (
                                <TableHead className="text-center w-[190px] px-1 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Acciones</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRepairs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={showActionColumn ? 10 : 9} className="h-24 text-center">No se encontraron resultados.</TableCell>
                            </TableRow>
                        ) : (
                            filteredRepairs.map((repair, index) => (
                                <ActiveRepairRow
                                    key={repair.id}
                                    repair={repair}
                                    position={index + 1}
                                    showActionColumn={showActionColumn}
                                    {...cardProps}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialogs */}
            <TakeRepairDialog isOpen={!!takeoverRepair} onClose={() => setTakeoverRepair(null)} repair={takeoverRepair} currentUserId={currentUserId} />
            {assignmentRepair && <AssignmentModal isOpen={!!assignmentRepair} onClose={() => setAssignmentRepair(null)} repair={assignmentRepair} currentUserId={currentUserId} />}
            {imageUploadRepair && <AddImagesDialog isOpen={!!imageUploadRepair} onClose={() => setImageUploadRepair(null)} repair={imageUploadRepair} />}
            <RepairImagesDialog isOpen={!!imageViewRepair} onClose={() => setImageViewRepair(null)} repair={imageViewRepair} />
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
