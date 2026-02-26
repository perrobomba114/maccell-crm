"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, History, Eye, Loader2, Printer } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RepairDetailsDialog } from "@/components/repairs/repair-details-dialog";
import { getRepairByIdAction } from "@/lib/actions/repairs";
import { toast } from "sonner";
import { printRepairTicket, printWarrantyTicket, printWetReport } from "@/lib/print-utils";
import { cn } from "@/lib/utils";

interface HistoryRepairsTableProps {
    repairs: any[];
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

export function HistoryRepairsTable({ repairs, currentPage, totalPages }: HistoryRepairsTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const debouncedSearch = useDebounce(searchTerm, 500);

    const [selectedRepair, setSelectedRepair] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handlePrint = (repair: any) => {
        // Always print the repair ticket
        printRepairTicket(repair);

        // If status is "Entregado" (ID 10), also print warranty and wet report (if applicable)
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
                console.log("Printing extra docs for delivered repair:", repair.ticketNumber);
                printWarrantyTicket(repairStub);

                if (repair.isWet) {
                    setTimeout(() => {
                        printWetReport(repairStub);
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
                    setSelectedRepair(data);
                    setIsDetailsOpen(true);
                } else {
                    toast.error("No se pudieron cargar los detalles.");
                }
            } catch (error) {
                toast.error("Error al cargar detalles.");
            } finally {
                setLoadingId(null);
            }
        });
    };

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (debouncedSearch) {
            params.set("q", debouncedSearch);
        } else {
            params.delete("q");
        }
        params.set("page", "1"); // Reset to page 1 on search
        router.push(`?${params.toString()}`);
    }, [debouncedSearch]);

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", page.toString());
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Label htmlFor="history-repairs-search" className="sr-only">Buscar en historial</Label>
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="history-repairs-search"
                        name="history-repairs-search"
                        aria-label="Buscar por ticket, cliente, dispositivo"
                        placeholder="Buscar por ticket, cliente, dispositivo…"
                        className="pl-9 bg-slate-900/50 border-slate-800 focus:ring-2 focus:ring-blue-500/50 transition-[border-color,box-shadow] duration-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
            </div>

            {(!repairs || repairs.length === 0) ? (
                <div className="text-center p-12 border rounded-lg bg-muted/10">
                    <History className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest italic">
                        {searchTerm ? "Sin resultados" : "Historial Vacío"}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">
                        {searchTerm ? "Intenta con otro término de búsqueda…" : "No hay reparaciones finalizadas todavía…"}
                    </p>
                </div>
            ) : (
                <div className="border-2 border-slate-800/60 rounded-[2rem] overflow-hidden bg-slate-950/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <Table>
                        <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="text-center w-[130px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14 text-pretty">Protocolo</TableHead>
                                <TableHead className="text-center w-[140px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14 text-pretty">Sincronización</TableHead>
                                <TableHead className="text-center w-[120px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14 text-pretty">Ciclo</TableHead>
                                <TableHead className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14 text-pretty">Cliente</TableHead>
                                <TableHead className="text-center w-[120px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14 text-pretty">Contacto</TableHead>
                                <TableHead className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14 text-pretty">Unidad Hardware</TableHead>
                                <TableHead className="text-center w-[140px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14 text-pretty">Estado Global</TableHead>
                                <TableHead className="text-center w-[100px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {repairs.map((repair) => {
                                const colorClass = statusColorMap[repair.status.color] || "bg-gray-100 text-gray-800";

                                // Calculate Real Duration
                                let duration = "-";
                                if (repair.startedAt && repair.finishedAt) {
                                    const start = new Date(repair.startedAt).getTime();
                                    const end = new Date(repair.finishedAt).getTime();
                                    const diff = end - start;

                                    if (diff > 0) {
                                        const hours = Math.floor(diff / (1000 * 60 * 60));
                                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                        duration = `${hours}h ${minutes}m`;
                                        if (hours === 0) duration = `${minutes} min`;
                                    }
                                }

                                return (
                                    <TableRow key={repair.id} className="hover:bg-white/[0.02] border-b border-white/[0.03] group transition-[background-color] duration-300">
                                        <TableCell className="text-center py-5">
                                            <div className={cn(
                                                "inline-flex flex-col items-center justify-center min-w-[95px] p-2.5 rounded-2xl border-2 transition-[transform,box-shadow,background-color] duration-300 group-hover:scale-105 tabular-nums",
                                                repair.isWet ? "bg-blue-600/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]" :
                                                    repair.isWarranty ? "bg-amber-600/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]" :
                                                        "bg-slate-900 border-slate-800 shadow-xl"
                                            )}>
                                                <span className={cn(
                                                    "text-[9px] font-black tracking-[0.2em] leading-none mb-1.5 uppercase",
                                                    repair.isWet ? "text-blue-400" : repair.isWarranty ? "text-amber-500" : "text-slate-500"
                                                )}>
                                                    {repair.ticketNumber.split("-")[0]}
                                                </span>
                                                <span className={cn(
                                                    "text-base font-black font-mono leading-none tracking-tighter",
                                                    repair.isWet ? "text-white" : repair.isWarranty ? "text-white" : "text-slate-100"
                                                )}>
                                                    {repair.ticketNumber.split("-").pop()}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center tabular-nums">
                                                <span className="text-sm font-black text-emerald-400 tracking-tight leading-none">
                                                    {repair.updatedAt ? format(new Date(repair.updatedAt), "dd/MM/yy", { locale: es }) : "–"}
                                                </span>
                                                <div className="flex items-center gap-1.5 mt-2 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                                    <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">
                                                        {repair.updatedAt ? format(new Date(repair.updatedAt), "HH:mm", { locale: es }) : ""} HS
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            {(() => {
                                                let dColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
                                                if (duration.includes("h")) dColor = "text-purple-400 bg-purple-500/10 border-purple-500/20";
                                                if (duration.includes("min") && parseInt(duration) < 30) dColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

                                                return (
                                                    <div className={cn("inline-flex items-center justify-center px-4 py-1 rounded-full border border-white/5 font-black text-[11px] italic tracking-tight tabular-nums", dColor)}>
                                                        {duration}
                                                    </div>
                                                );
                                            })()}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <span className="font-black text-[13px] text-white uppercase tracking-tight leading-tight group-hover:text-blue-400 transition-colors duration-300">
                                                {repair.customer.name}
                                            </span>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <div className="inline-flex items-center justify-center bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-800/50 tabular-nums shadow-sm group-hover:border-blue-500/30 transition-colors duration-300">
                                                <span className="text-sm font-black text-slate-300 uppercase tracking-tight">
                                                    {repair.customer.phone || "———"}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <div className="inline-flex flex-col items-center justify-center bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl shadow-lg group-hover:border-blue-500/30 transition-colors duration-300">
                                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5 italic">
                                                    {repair.deviceBrand}
                                                </span>
                                                <span className="text-[11px] font-black text-white uppercase tracking-tight leading-none">
                                                    {repair.deviceModel}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <Badge className={`font-black rounded-lg px-3 py-1 text-[10px] uppercase tracking-wider border-2 ${colorClass}`}>
                                                    {repair.status.name}
                                                </Badge>

                                                {repair.statusHistory && repair.statusHistory[0] && (
                                                    <div className="text-[9px] text-muted-foreground mt-1 tabular-nums font-bold uppercase tracking-tighter">
                                                        Prev: <span className="text-blue-500/80">{repair.statusHistory[0].fromStatus?.name || 'Registro'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1.5 h-7">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => handlePrint(repair)}
                                                    className="text-slate-500 hover:text-white hover:bg-white/10 transition-[color,background-color] duration-200"
                                                    title="Imprimir Ticket"
                                                >
                                                    <Printer className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={() => handleViewDetails(repair.id)}
                                                    disabled={isPending && loadingId === repair.id}
                                                    className="text-slate-500 hover:text-blue-400 hover:bg-white/10 transition-[color,background-color] duration-200"
                                                    title="Ver Detalles"
                                                >
                                                    {isPending && loadingId === repair.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                                                    ) : (
                                                        <Eye className="h-3.5 w-3.5" />
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
            )
            }

            {/* Pagination Controls */}
            {
                totalPages > 1 && (
                    <div className="flex items-center justify-end space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            Página {currentPage} de {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )
            }
            <RepairDetailsDialog
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                repair={selectedRepair}
            />
        </div >
    );
}
