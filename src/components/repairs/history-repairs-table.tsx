"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, History, Eye, Loader2, Printer, Droplets, ShieldCheck, Phone, Clock } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RepairDetailsDialog } from "@/components/repairs/repair-details-dialog";
import { getRepairByIdAction } from "@/lib/actions/repairs";
import { toast } from "sonner";
import { printRepairTicket, printWarrantyTicket, printWetReport } from "@/lib/print-utils";
import { cn } from "@/lib/utils";
import { RepairDetails } from "./repair-details-dialog";

type RepairData = {
    id: string;
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    isWet: boolean;
    isWarranty: boolean;
    startedAt: Date | string | null;
    finishedAt: Date | string | null;
    updatedAt: Date | string | null;
    customer: { name: string; phone?: string | null };
    status: { id: number; name: string; color: string | null };
    statusId?: number;
    statusHistory?: Array<{ fromStatus?: { name: string } | null }>;
    branch?: { name?: string | null; address?: string | null; phone?: string | null; imageUrl?: string | null } | null;
};

interface HistoryRepairsTableProps {
    repairs: RepairData[];
    currentPage: number;
    totalPages: number;
}

const statusColorMap: Record<string, string> = {
    blue: "bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.4)]",
    indigo: "bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.4)]",
    yellow: "bg-amber-500 text-white border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]",
    gray: "bg-slate-600 text-white border-slate-400 shadow-[0_0_10px_rgba(71,85,105,0.4)]",
    green: "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_10px_rgba(5,150,105,0.4)]",
    red: "bg-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.4)]",
    purple: "bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.4)]",
    orange: "bg-orange-600 text-white border-orange-400 shadow-[0_0_10px_rgba(234,88,12,0.4)]",
    amber: "bg-amber-600 text-white border-amber-400 shadow-[0_0_10_rgba(217,119,6,0.4)]",
    slate: "bg-slate-800 text-white border-slate-600",
};

function calcDuration(startedAt: Date | string | null, finishedAt: Date | string | null): string {
    if (!startedAt || !finishedAt) return "-";
    const diff = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    if (diff <= 0) return "-";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours === 0 ? `${minutes} min` : `${hours}h ${minutes}m`;
}

function durationColorClass(duration: string): string {
    if (duration === "-") return "text-muted-foreground bg-muted/50 border-border";
    if (duration.includes("h")) return "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20";
    if (duration.includes("min") && parseInt(duration) < 30) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
}

export function HistoryRepairsTable({ repairs, currentPage, totalPages }: HistoryRepairsTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const debouncedSearch = useDebounce(searchTerm, 500);
    const isMounted = useRef(false);

    const [selectedRepair, setSelectedRepair] = useState<RepairDetails | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handlePrint = (repair: RepairData) => {
        printRepairTicket(repair as unknown as NonNullable<Parameters<typeof printRepairTicket>[0]>);
        if (repair.statusId === 10 || repair.status?.id === 10 || repair.status?.name === "Entregado") {
            const repairStub = {
                ticketNumber: repair.ticketNumber,
                deviceBrand: repair.deviceBrand,
                deviceModel: repair.deviceModel,
                customer: { name: repair.customer.name },
                isWet: repair.isWet,
                branch: repair.branch
            };
            setTimeout(() => {
                printWarrantyTicket(repairStub as unknown as NonNullable<Parameters<typeof printWarrantyTicket>[0]>);
                if (repair.isWet) {
                    setTimeout(() => {
                        printWetReport(repairStub as unknown as NonNullable<Parameters<typeof printWetReport>[0]>);
                    }, 1200);
                }
            }, 1000);
        }
    };

    const handleViewDetails = async (repairId: string) => {
        setLoadingId(repairId);
        startTransition(async () => {
            try {
                const data = await getRepairByIdAction(repairId);
                if (data) {
                    setSelectedRepair(data as unknown as RepairDetails);
                    setIsDetailsOpen(true);
                } else {
                    toast.error("No se pudieron cargar los detalles.");
                }
            } catch (error) {
                console.error("Error al cargar detalles:", error);
                toast.error("Error al cargar detalles.");
            } finally {
                setLoadingId(null);
            }
        });
    };

    useEffect(() => {
        // Guard: skip the initial mount — only trigger on actual user searches
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }
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

    return (
        <div className="space-y-0">
            {/* Search Bar */}
            <div className="bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 p-4 sm:p-5 border-b">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 group max-w-lg">
                        <Label htmlFor="history-repairs-search" className="sr-only">Buscar en historial</Label>
                        <div className={cn("pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 transition-opacity duration-300 blur", searchTerm ? "opacity-25" : "opacity-0 group-focus-within:opacity-20")} />
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground z-20" />
                        <Input
                            id="history-repairs-search"
                            name="history-repairs-search"
                            aria-label="Buscar por ticket, cliente, dispositivo"
                            placeholder="Buscar por ticket, cliente, dispositivo…"
                            className={cn("h-12 rounded-xl border-2 pl-12 pr-10 text-base font-medium transition-all relative z-10 bg-background", searchTerm ? "border-blue-500 bg-blue-500/5" : "border-border")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>

            {/* Empty State */}
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
                    {/* ── MOBILE: Card list (hidden on sm+) ── */}
                    <ul className="sm:hidden divide-y divide-border/60">
                        {repairs.map((repair) => {
                            const colorClass = statusColorMap[repair.status.color ?? ""] || "bg-slate-600 text-white border-slate-400";
                            const duration = calcDuration(repair.startedAt, repair.finishedAt);
                            const dColor = durationColorClass(duration);
                            const isLoading = isPending && loadingId === repair.id;

                            return (
                                <li key={repair.id} className="p-4 flex flex-col gap-3 hover:bg-muted/30 transition-colors">
                                    {/* Row 1: Ticket + Status badge + Actions */}
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
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handlePrint(repair)}
                                                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                                title="Imprimir"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleViewDetails(repair.id)}
                                                disabled={isLoading}
                                                className="h-9 w-9 text-muted-foreground hover:text-blue-500"
                                                title="Ver detalles"
                                            >
                                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Eye className="h-4 w-4" />}
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
                                </li>
                            );
                        })}
                    </ul>

                    {/* ── DESKTOP: Full table (hidden below sm) ── */}
                    <div className="hidden sm:block overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b-2 border-border bg-muted/70 backdrop-blur-sm">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-center w-[130px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Protocolo</TableHead>
                                    <TableHead className="text-center w-[140px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Sincronización</TableHead>
                                    <TableHead className="text-center w-[120px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Ciclo</TableHead>
                                    <TableHead className="text-center px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Cliente</TableHead>
                                    <TableHead className="text-center w-[120px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Contacto</TableHead>
                                    <TableHead className="text-center px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Unidad Hardware</TableHead>
                                    <TableHead className="text-center w-[140px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Estado Global</TableHead>
                                    <TableHead className="text-center w-[100px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {repairs.map((repair) => {
                                    const colorClass = statusColorMap[repair.status.color ?? ""] || "bg-gray-100 text-gray-800";
                                    const duration = calcDuration(repair.startedAt, repair.finishedAt);
                                    const dColor = durationColorClass(duration);

                                    return (
                                        <TableRow key={repair.id} className="border-b border-border/60 transition-colors hover:bg-muted/40 group">
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
                                                    {repair.statusHistory && repair.statusHistory[0] && (
                                                        <div className="text-[9px] text-muted-foreground mt-1 tabular-nums font-bold uppercase tracking-tighter">
                                                            Prev: <span className="text-blue-500">{repair.statusHistory[0].fromStatus?.name || 'Registro'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-center px-3">
                                                <div className="flex items-center justify-center gap-1.5 h-7">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        onClick={() => handlePrint(repair)}
                                                        className="text-muted-foreground hover:text-foreground hover:bg-muted transition-[color,background-color] duration-200"
                                                        title="Imprimir Ticket"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        onClick={() => handleViewDetails(repair.id)}
                                                        disabled={isPending && loadingId === repair.id}
                                                        className="text-muted-foreground hover:text-blue-500 hover:bg-muted transition-[color,background-color] duration-200"
                                                        title="Ver Detalles"
                                                    >
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
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-xs text-muted-foreground font-semibold">
                        Página <span className="text-foreground font-black">{currentPage}</span> de <span className="text-foreground font-black">{totalPages}</span>
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="h-8 px-3"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="h-8 px-3"
                        >
                            Siguiente
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            <RepairDetailsDialog
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                repair={selectedRepair}
            />
        </div>
    );
}
