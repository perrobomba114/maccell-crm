"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Trash2, Edit, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { deleteRepairAction } from "@/lib/actions/repairs";
import { toast } from "sonner";
import { RepairDetailsDialog } from "./repair-details-dialog";
import { checkLatestRepairUpdate } from "@/actions/repair-check-actions";

interface AdminRepairsTableProps {
    repairs: any[];
    branches?: any[];
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

export function AdminRepairsTable({ repairs, branches = [] }: AdminRepairsTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Sync state with URL query parameters
    const searchTerm = searchParams.get("q") || "";
    const selectedBranchId = searchParams.get("branch") || "ALL";
    const currentPage = parseInt(searchParams.get("page") || "1");

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [viewRepair, setViewRepair] = useState<any | null>(null);
    const ITEMS_PER_PAGE = 25;

    const [isPending, startTransition] = useTransition();

    // Local state for debounced input
    const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

    // Sync local state when URL params change (e.g. navigation)
    useEffect(() => {
        setLocalSearchTerm(searchTerm);
    }, [searchTerm]);

    // Helper to update URL params - Memoized to use in effects
    const updateParams = useMemo(() => (updates: Record<string, string | null>) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            Object.entries(updates).forEach(([key, value]) => {
                if (value === null || value === "ALL" || value === "") {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            });
            // Always reset to page 1 on filter change unless explicitly setting page
            if (!updates.page) params.delete("page");
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
    }, [searchParams, pathname, router]);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchTerm !== searchTerm) {
                updateParams({ q: localSearchTerm });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [localSearchTerm, searchTerm, updateParams]);

    const filteredRepairs = useMemo(() => {
        return repairs.filter(repair => {
            // Use localSearchTerm for immediate feedback if desired, or searchTerm for consistent URL state.
            // Using searchTerm (URL) ensures filtering happens only after debounce, which is the goal for performance.
            const term = searchTerm.toLowerCase();
            const matchesSearch = (
                repair.ticketNumber.toLowerCase().includes(term) ||
                repair.customer.name.toLowerCase().includes(term) ||
                (repair.customer.phone && repair.customer.phone.includes(term)) ||
                repair.deviceModel.toLowerCase().includes(term) ||
                repair.deviceBrand.toLowerCase().includes(term) ||
                (repair.branch?.name && repair.branch.name.toLowerCase().includes(term))
            );

            const matchesBranch = selectedBranchId === "ALL" || repair.branchId === selectedBranchId;

            return matchesSearch && matchesBranch;
        });
    }, [repairs, searchTerm, selectedBranchId]); // Depend on searchTerm (debounced via URL), not localSearchTerm

    const totalPages = Math.ceil(filteredRepairs.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedRepairs = filteredRepairs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleDelete = async () => {
        if (!deleteId) return;

        const result = await deleteRepairAction(deleteId);
        if (result.success) {
            toast.success("Reparación eliminada correctamente");
        } else {
            toast.error(result.error || "Error al eliminar la reparación");
        }
        setDeleteId(null);
        router.refresh();
    };

    // Currency Formatter
    const currencyFormatter = useMemo(() => new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
    }), []);

    // Polling Logic
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                const latestUpdate = await checkLatestRepairUpdate();
                if (latestUpdate && new Date(latestUpdate) > lastRefreshed) {
                    router.refresh();
                    setLastRefreshed(new Date());
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 15000);
        return () => clearInterval(intervalId);
    }, [router, lastRefreshed]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-5">
                {/* Search Bar - Moved to Top & Constrained Width */}
                <div className="relative group w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <Input
                        placeholder="Buscar por ticket, cliente, dispositivo…"
                        value={localSearchTerm}
                        onChange={(e) => setLocalSearchTerm(e.target.value)}
                        className="pl-10 h-12 text-lg shadow-sm border-muted-foreground/20 focus-visible:ring-offset-2 transition-all duration-200 bg-background/50 backdrop-blur-sm"
                    />
                </div>

                {/* Branch Badges */}
                <div className="flex flex-col gap-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        Filtrar por Sucursal
                    </Label>
                    <div className="flex flex-wrap gap-2.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateParams({ branch: "ALL" })}
                            className={cn(
                                "h-9 px-4 transition-all duration-300 font-bold border",
                                selectedBranchId === "ALL"
                                    ? "bg-slate-900 text-white border-slate-900 shadow-md hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:border-slate-50 dark:hover:bg-slate-200"
                                    : "text-muted-foreground border-dashed hover:border-solid hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                        >
                            Todas
                        </Button>
                        {branches
                            .slice()
                            .sort((a, b) => {
                                // Custom sort: MACCELL first, then others (like 8 BIT)
                                const isAMaccell = a.name.toUpperCase().includes("MACCELL");
                                const isBMaccell = b.name.toUpperCase().includes("MACCELL");
                                if (isAMaccell && !isBMaccell) return -1;
                                if (!isAMaccell && isBMaccell) return 1;
                                return a.name.localeCompare(b.name, undefined, { numeric: true });
                            })
                            .map((b, index) => {
                                const colors = [
                                    { selected: "bg-orange-600 border-orange-600 text-white shadow-orange-500/20", hover: "text-orange-600 border-orange-200 hover:bg-orange-50" },
                                    { selected: "bg-blue-600 border-blue-600 text-white shadow-blue-500/20", hover: "text-blue-600 border-blue-200 hover:bg-blue-50" },
                                    { selected: "bg-green-600 border-green-600 text-white shadow-green-500/20", hover: "text-green-600 border-green-200 hover:bg-green-50" },
                                    { selected: "bg-purple-600 border-purple-600 text-white shadow-purple-500/20", hover: "text-purple-600 border-purple-200 hover:bg-purple-50" },
                                    { selected: "bg-pink-600 border-pink-600 text-white shadow-pink-500/20", hover: "text-pink-600 border-pink-200 hover:bg-pink-50" },
                                    { selected: "bg-cyan-600 border-cyan-600 text-white shadow-cyan-500/20", hover: "text-cyan-600 border-cyan-200 hover:bg-cyan-50" },
                                    { selected: "bg-red-600 border-red-600 text-white shadow-red-500/20", hover: "text-red-600 border-red-200 hover:bg-red-50" },
                                    { selected: "bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/20", hover: "text-indigo-600 border-indigo-200 hover:bg-indigo-50" },
                                ];
                                const style = colors[index % colors.length];
                                const isSelected = selectedBranchId === b.id;

                                return (
                                    <Button
                                        key={b.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateParams({ branch: b.id })}
                                        className={cn(
                                            "h-9 px-4 transition-all duration-300 font-bold border",
                                            isSelected
                                                ? cn(style.selected, "shadow-md hover:opacity-90")
                                                : style.hover
                                        )}
                                    >
                                        {b.name}
                                    </Button>
                                );
                            })}
                    </div>
                </div>
            </div>

            <div className={cn(
                "relative overflow-hidden border rounded-xl bg-card shadow-lg backdrop-blur-md transition-opacity duration-300",
                isPending && "opacity-60 pointer-events-none"
            )}>
                <Table>
                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent border-b">
                            <TableHead className="text-center w-[110px] uppercase text-[10px] font-bold tracking-tighter">Ticket</TableHead>
                            <TableHead className="text-center uppercase text-[10px] font-bold tracking-tighter">Técnico</TableHead>
                            <TableHead className="text-center w-[140px] uppercase text-[10px] font-bold tracking-tighter">Fecha</TableHead>
                            <TableHead className="text-center w-[120px] uppercase text-[10px] font-bold tracking-tighter">Duración</TableHead>
                            <TableHead className="text-center uppercase text-[10px] font-bold tracking-tighter">Cliente</TableHead>
                            <TableHead className="text-center uppercase text-[10px] font-bold tracking-tighter">Dispositivo</TableHead>
                            <TableHead className="text-center w-[130px] uppercase text-[10px] font-bold tracking-tighter">Estado</TableHead>
                            <TableHead className="text-right w-[110px] uppercase text-[10px] font-bold tracking-tighter pr-6">Precio</TableHead>
                            <TableHead className="text-center w-[130px] uppercase text-[10px] font-bold tracking-tighter">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AnimatePresence>
                            {paginatedRepairs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-40 text-center text-muted-foreground animate-pulse">
                                        No se encontraron resultados para tu búsqueda…
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRepairs.map((repair) => {
                                    const colorClass = statusColorMap[repair.status.color] || "bg-gray-100 text-gray-800";
                                    return (
                                        <motion.tr
                                            key={repair.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="group hover:bg-muted/30 border-b last:border-0 transition-colors duration-200"
                                        >
                                            <TableCell className={cn(
                                                "text-center font-bold font-mono text-sm tabular-nums",
                                                repair.isWet ? "text-blue-500 font-extrabold" :
                                                    repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" : ""
                                            )}>
                                                {repair.ticketNumber}
                                            </TableCell>
                                            <TableCell className="text-center text-sm font-medium">
                                                {repair.assignedTo?.name || <span className="text-muted-foreground/50 italic text-[11px]">SIN ASIGNAR</span>}
                                            </TableCell>
                                            <TableCell className="text-center tabular-nums">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-sm font-semibold">
                                                        {format(new Date(repair.createdAt), "dd/MM/yy", { locale: es })}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                                        {format(new Date(repair.createdAt), "HH:mm 'hs'", { locale: es })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center tabular-nums">
                                                {(() => {
                                                    let duration = "—";
                                                    if (repair.startedAt && repair.finishedAt) {
                                                        const start = new Date(repair.startedAt).getTime();
                                                        const end = new Date(repair.finishedAt).getTime();
                                                        const diff = end - start;
                                                        if (diff > 0) {
                                                            const hours = Math.floor(diff / (1000 * 60 * 60));
                                                            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                            duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
                                                        }
                                                    }
                                                    return (
                                                        <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400/90 whitespace-nowrap">
                                                            {duration}
                                                        </span>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-base tracking-tight">{repair.customer.name}</span>
                                                    {repair.customer.phone && <span className="text-[10px] text-muted-foreground tabular-nums">{repair.customer.phone}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-sm text-foreground/80">{repair.deviceBrand}</span>
                                                    <span className="text-xs text-muted-foreground">{repair.deviceModel}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={cn("font-extrabold border-2 shadow-sm px-3 uppercase text-[10px]", colorClass)}>
                                                    {repair.status.name}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-base tabular-nums pr-6">
                                                {repair.estimatedPrice > 0 ? currencyFormatter.format(repair.estimatedPrice) : "—"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setViewRepair(repair)}
                                                        title="Ver detalles"
                                                        className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all rounded-full"
                                                    >
                                                        <Eye className="h-4.5 w-4.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.push(`/admin/repairs/${repair.id}/edit`)}
                                                        title="Editar"
                                                        className="h-9 w-9 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 transition-all rounded-full"
                                                    >
                                                        <Edit className="h-4.5 w-4.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteId(repair.id)}
                                                        title="Eliminar"
                                                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all rounded-full"
                                                    >
                                                        <Trash2 className="h-4.5 w-4.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
                    <div className="text-sm text-muted-foreground font-medium tabular-nums shadow-sm border px-3 py-1 rounded-full bg-muted/20">
                        Mostrando <span className="text-foreground font-bold">{startIndex + 1}</span> a <span className="text-foreground font-bold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredRepairs.length)}</span> de <span className="text-foreground font-bold">{filteredRepairs.length}</span> reparaciones
                    </div>
                    <div className="flex items-center space-x-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateParams({ page: "1" })}
                            disabled={currentPage === 1}
                            className="h-10 w-10 hover:border-primary/50 transition-colors"
                        >
                            <ChevronsLeft className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateParams({ page: (currentPage - 1).toString() })}
                            disabled={currentPage === 1}
                            className="h-10 w-10 hover:border-primary/50 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-1 bg-background/50 border rounded-lg px-3 py-2 shadow-inner h-10">
                            <span className="text-xs text-muted-foreground uppercase font-bold pr-2">Página</span>
                            <span className="text-sm font-extrabold tabular-nums w-4 text-center">{currentPage}</span>
                            <span className="text-xs text-muted-foreground/50 px-1 font-bold">/</span>
                            <span className="text-sm font-extrabold tabular-nums w-4 text-center">{totalPages}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateParams({ page: (currentPage + 1).toString() })}
                            disabled={currentPage === totalPages}
                            className="h-10 w-10 hover:border-primary/50 transition-colors"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateParams({ page: totalPages.toString() })}
                            disabled={currentPage === totalPages}
                            className="h-10 w-10 hover:border-primary/50 transition-colors"
                        >
                            <ChevronsRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}

            <RepairDetailsDialog
                isOpen={!!viewRepair}
                onClose={() => setViewRepair(null)}
                repair={viewRepair}
            />

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent className="max-w-[400px] border-2">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold text-red-600">¿Confirmar Eliminación?</AlertDialogTitle>
                        <AlertDialogDescription className="text-base font-medium">
                            Esta acción no se puede deshacer. Se eliminará permanentemente la reparación y todos sus registros históricos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4">
                        <AlertDialogCancel className="font-bold border-2">Cancelar Operación</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 transition-transform active:scale-95 shadow-lg shadow-red-500/20 border-red-700">
                            Eliminar Definitivamente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
