"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Trash2, Edit, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useRouter } from "next/navigation";
import { deleteRepairAction } from "@/lib/actions/repairs";
import { toast } from "sonner";
import { RepairDetailsDialog } from "./repair-details-dialog";
import { checkLatestRepairUpdate } from "@/actions/repair-check-actions";

interface AdminRepairsTableProps {
    repairs: any[];
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

export function AdminRepairsTable({ repairs }: AdminRepairsTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [viewRepair, setViewRepair] = useState<any | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;
    const router = useRouter();

    const filteredRepairs = repairs.filter(repair => {
        const term = searchTerm.toLowerCase();
        return (
            repair.ticketNumber.toLowerCase().includes(term) ||
            repair.customer.name.toLowerCase().includes(term) ||
            (repair.customer.phone && repair.customer.phone.includes(term)) ||
            repair.deviceModel.toLowerCase().includes(term) ||
            repair.deviceBrand.toLowerCase().includes(term) ||
            (repair.branch?.name && repair.branch.name.toLowerCase().includes(term))
        );
    });

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

    // Smart Polling Implementation
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                const latestUpdate = await checkLatestRepairUpdate();

                if (latestUpdate && new Date(latestUpdate) > lastRefreshed) {
                    console.log("New repair data detected, refreshing...");
                    router.refresh();
                    setLastRefreshed(new Date());
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(intervalId);
    }, [router, lastRefreshed]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por Ticket, Cliente, Dispositivo o Sucursal..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="pl-9 h-12 text-lg"
                />
            </div>

            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="text-center w-[100px]">Ticket</TableHead>
                            <TableHead className="text-center">Técnico</TableHead>
                            <TableHead className="text-center w-[140px]">Fecha</TableHead>
                            <TableHead className="text-center w-[120px]">Duración</TableHead>
                            <TableHead className="text-center">Cliente</TableHead>
                            <TableHead className="text-center">Dispositivo</TableHead>
                            <TableHead className="text-center w-[120px]">Estado</TableHead>
                            <TableHead className="text-center w-[100px]">Precio</TableHead>
                            <TableHead className="text-center w-[120px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedRepairs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    No se encontraron resultados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRepairs.map((repair) => {
                                const colorClass = statusColorMap[repair.status.color] || "bg-gray-100 text-gray-800";
                                return (
                                    <TableRow key={repair.id} className="hover:bg-muted/10">
                                        <TableCell className={`text-center font-bold font-mono text-sm ${repair.isWet ? "text-blue-500 font-extrabold" : repair.isWarranty ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                                            {repair.ticketNumber}
                                        </TableCell>
                                        <TableCell className="text-center text-sm">
                                            {repair.assignedTo?.name || <span className="text-muted-foreground italic">Sin asignar</span>}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-medium">
                                                    {format(new Date(repair.createdAt), "dd/MM/yy", { locale: es })}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(repair.createdAt), "HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {(() => {
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
                                                    <span className="font-bold text-lg text-yellow-600 dark:text-yellow-400">
                                                        {duration}
                                                    </span>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-semibold text-base">{repair.customer.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-medium text-sm">{repair.deviceBrand} {repair.deviceModel}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={`font-bold border ${colorClass}`}>
                                                {repair.status.name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-base">
                                            {repair.estimatedPrice > 0 ? `$${repair.estimatedPrice.toLocaleString()}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setViewRepair(repair)}
                                                    title="Ver detalles"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => router.push(`/admin/repairs/${repair.id}/edit`)}
                                                    title="Editar"
                                                    className="h-8 w-8 text-blue-500"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteId(repair.id)}
                                                    title="Eliminar"
                                                    className="h-8 w-8 text-red-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-sm text-muted-foreground">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredRepairs.length)} de {filteredRepairs.length} reparaciones
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm font-medium">
                            Página {currentPage} de {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronsRight className="h-4 w-4" />
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
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la reparación y todos sus datos asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
