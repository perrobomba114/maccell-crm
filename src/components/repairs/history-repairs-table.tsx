"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { printRepairTicket } from "@/lib/print-utils";

interface HistoryRepairsTableProps {
    repairs: any[];
    currentPage: number;
    totalPages: number;
}

const statusColorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
    green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    amber: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    slate: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
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
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por ticket, cliente, dispositivo..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {(!repairs || repairs.length === 0) ? (
                <div className="text-center p-12 border rounded-lg bg-muted/10">
                    <History className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground">
                        {searchTerm ? "No se encontraron resultados" : "Sin historial"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {searchTerm ? "Intenta con otro término de búsqueda." : "No tienes reparaciones finalizadas aún."}
                    </p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="text-center w-[100px]">Ticket</TableHead>
                                <TableHead className="text-center w-[140px]">Finalizado</TableHead>
                                <TableHead className="text-center w-[120px]">Duración</TableHead>
                                <TableHead className="text-center">Cliente</TableHead>
                                <TableHead className="text-center">Dispositivo</TableHead>
                                <TableHead className="text-center w-[100px]">Precio</TableHead>
                                <TableHead className="text-center w-[140px]">Estado</TableHead>
                                <TableHead className="text-center w-[100px]">Acciones</TableHead>
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
                                    <TableRow key={repair.id} className="hover:bg-muted/5">
                                        <TableCell className={`text-center font-bold font-mono text-lg ${repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                                            {repair.ticketNumber}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-medium">
                                                    {repair.updatedAt ? format(new Date(repair.updatedAt), "dd/MM/yyyy", { locale: es }) : "-"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {repair.updatedAt ? format(new Date(repair.updatedAt), "HH:mm", { locale: es }) : ""}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="font-bold text-lg text-yellow-600 dark:text-yellow-400">
                                                {duration}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-semibold text-sm">{repair.customer.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-medium text-sm">{repair.deviceBrand} {repair.deviceModel}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-base">
                                            {repair.estimatedPrice ? `$${repair.estimatedPrice.toLocaleString()}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={`font-bold border ${colorClass}`}>
                                                {repair.status.name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => printRepairTicket(repair)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    title="Imprimir Ticket"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleViewDetails(repair.id)}
                                                    disabled={isPending && loadingId === repair.id}
                                                    title="Ver Detalles"
                                                >
                                                    {isPending && loadingId === repair.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
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
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
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
            )}
            <RepairDetailsDialog
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                repair={selectedRepair}
            />
        </div>
    );
}
