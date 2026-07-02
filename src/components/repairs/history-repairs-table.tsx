"use client";

// Orchestrates search, mobile cards, desktop table, pagination and detail dialog
// for the vendor repair history page.

import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, History } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RepairDetailsDialog } from "@/components/repairs/repair-details-dialog";
import { RepairImagesDialog } from "@/components/repairs/repair-images-dialog";
import { getRepairByIdAction } from "@/lib/actions/repairs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RepairDetails } from "./repair-details-dialog";
import { type RepairData } from "./repair-history-types";
import { RepairHistoryCard } from "./repair-history-card";
import { RepairHistoryRow } from "./repair-history-row";
import { getRepairImageCount } from "./repair-images-action-button";
import { printRepairTicketSequence } from "@/lib/repair-print-sequence";

export interface HistoryRepairsTableProps {
    repairs: RepairData[];
    currentPage: number;
    totalPages: number;
}

export function HistoryRepairsTable({ repairs, currentPage, totalPages }: HistoryRepairsTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const isMounted = useRef(false);

    const [selectedRepair, setSelectedRepair] = useState<RepairDetails | null>(null);
    const [imageRepair, setImageRepair] = useState<RepairData | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handlePrint = (repair: RepairData) => {
        printRepairTicketSequence(repair);
    };

    const handleViewDetails = (repairId: string) => {
        setLoadingId(repairId);
        startTransition(async () => {
            try {
                const data = await getRepairByIdAction(repairId);
                if (data) { setSelectedRepair(data as unknown as RepairDetails); setIsDetailsOpen(true); }
                else toast.error("No se pudieron cargar los detalles.");
            } catch { toast.error("Error al cargar detalles."); }
            finally { setLoadingId(null); }
        });
    };

    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        const params = new URLSearchParams(searchParams);
        if (debouncedSearch) {
            params.set("q", debouncedSearch);
        } else {
            params.delete("q");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", page.toString());
        router.push(`?${params.toString()}`);
    };

    const summary = repairs.reduce(
        (acc, repair) => {
            const statusName = repair.status.name.toLowerCase();
            if (statusName.includes("entregado")) acc.delivered += 1;
            if (statusName.includes("finalizado")) acc.finished += 1;
            if (statusName.includes("irreparable") || statusName.includes("sin solución")) acc.irreparable += 1;
            if (getRepairImageCount(repair.deviceImages) > 0) acc.withImages += 1;
            return acc;
        },
        { delivered: 0, finished: 0, irreparable: 0, withImages: 0 }
    );

    const sharedProps = { isPending, loadingId, onPrint: handlePrint, onViewDetails: handleViewDetails, onViewImages: setImageRepair };

    return (
        <div className="space-y-0">
            {/* Summary + search */}
            <div className="border-b bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 p-4 sm:p-5">
                <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
                    <div className="relative flex-1 group max-w-2xl">
                        <Label htmlFor="history-repairs-search" className="sr-only">Buscar en historial</Label>
                        <div className={cn("pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 transition-opacity duration-300 blur", searchTerm ? "opacity-25" : "opacity-0 group-focus-within:opacity-20")} />
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground z-20" />
                        <Input
                            id="history-repairs-search"
                            aria-label="Buscar por ticket, cliente, dispositivo"
                            placeholder="Buscar por ticket, cliente, dispositivo..."
                            className={cn("h-12 rounded-xl border-2 pl-12 pr-10 text-base font-medium transition-all relative z-10 bg-background", searchTerm ? "border-blue-500 bg-blue-500/5" : "border-border")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:min-w-[640px]">
                        {[
                            { label: "Vista", value: repairs.length, className: "text-blue-500" },
                            { label: "OK", value: summary.finished, className: "text-emerald-500" },
                            { label: "Entregadas", value: summary.delivered, className: "text-slate-300" },
                            { label: "Irrepares", value: summary.irreparable, className: "text-amber-400" },
                            { label: "Con imágenes", value: summary.withImages, className: "text-cyan-400" },
                        ].map((item) => (
                            <div key={item.label} className="rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-center shadow-sm">
                                <div className={cn("text-lg font-black leading-none tabular-nums", item.className)}>{item.value}</div>
                                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {(!repairs || repairs.length === 0) ? (
                <div className="text-center p-12 bg-muted/10">
                    <History className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-black text-muted-foreground uppercase tracking-widest italic">
                        {searchTerm ? "Sin resultados" : "Historial Vacío"}
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.2em] mt-2">
                        {searchTerm ? "Intenta con otro término de búsqueda…" : "No hay reparaciones finalizadas todavía…"}
                    </p>
                </div>
            ) : (
                <>
                    {/* Mobile: cards */}
                    <ul className="sm:hidden divide-y divide-border/60">
                        {repairs.map((r) => <RepairHistoryCard key={r.id} repair={r} {...sharedProps} />)}
                    </ul>

                    {/* Desktop: table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b-2 border-border bg-muted/70 backdrop-blur-sm">
                                <TableRow className="hover:bg-transparent border-none">
                                    {["Ticket", "Fecha", "Duración", "Cliente", "Dispositivo", "Técnico", "Precio", "Estado", "Acciones"].map((h) => (
                                        <TableHead key={h} className="text-center px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">{h}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {repairs.map((r) => <RepairHistoryRow key={r.id} repair={r} {...sharedProps} />)}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-xs text-muted-foreground font-semibold">
                        Página <span className="text-foreground font-black">{currentPage}</span> de <span className="text-foreground font-black">{totalPages}</span>
                    </span>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="h-8 px-3">
                            <ChevronLeft className="h-4 w-4 mr-1" />Anterior
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="h-8 px-3">
                            Siguiente<ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            <RepairDetailsDialog isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} repair={selectedRepair} />
            <RepairImagesDialog isOpen={!!imageRepair} onClose={() => setImageRepair(null)} repair={imageRepair} />
        </div>
    );
}
