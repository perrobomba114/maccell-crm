"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Edit, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { AdminRepair } from "@/types/admin-repairs";
import type { RepairDetails } from "../repair-details-dialog";

const statusColorMap: Record<string, string> = {
    "red": "bg-red-600 text-white border-red-700 shadow-red-500/20",
    "yellow": "bg-amber-500 text-black border-amber-600 shadow-amber-500/20",
    "green": "bg-green-600 text-white border-green-700 shadow-green-500/20",
    "blue": "bg-blue-600 text-white border-blue-700 shadow-blue-500/20",
    "gray": "bg-zinc-600 text-white border-zinc-700 shadow-zinc-500/20",
    "purple": "bg-purple-600 text-white border-purple-700 shadow-zinc-500/20",
    "indigo": "bg-indigo-600 text-white border-indigo-700 shadow-blue-500/20",
    "slate": "bg-slate-800 text-white border-slate-900 shadow-zinc-500/20",
    "orange": "bg-orange-600 text-white border-orange-700 shadow-orange-500/20",
    "amber": "bg-amber-600 text-white border-amber-700 shadow-amber-500/20",
};

interface AdminRepairsListProps {
    repairs: AdminRepair[];
    isPending: boolean;
    loadingRepairId: string | null;
    setViewRepair: (repair: RepairDetails | null) => void;
    setLoadingRepairId: (id: string | null) => void;
    setDeleteId: (id: string | null) => void;
    getRepairByIdAction: (id: string) => Promise<RepairDetails | null>;
    currencyFormatter: Intl.NumberFormat;
    router: AppRouterInstance;
}

export function AdminRepairsList({
    repairs,
    isPending,
    loadingRepairId,
    setViewRepair,
    setLoadingRepairId,
    setDeleteId,
    getRepairByIdAction,
    currencyFormatter,
    router
}: AdminRepairsListProps) {
    return (
        <div className={cn(
            "relative overflow-hidden border rounded-xl bg-card shadow-lg backdrop-blur-md transition-opacity duration-300",
            isPending && "opacity-60 pointer-events-none"
        )}>
            <Table>
                <TableHeader className="sticky top-0 z-10">
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
                        {repairs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-40 text-center text-muted-foreground animate-pulse">
                                    No se encontraron resultados para tu búsqueda…
                                </TableCell>
                            </TableRow>
                        ) : (
                            repairs.map((repair) => {
                                const colorClass = statusColorMap[repair.status.color || "gray"] || "bg-gray-100 text-gray-800";
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
                                            {repair.statusHistory && repair.statusHistory[0] && (
                                                <div className="text-[9px] text-muted-foreground mt-1 tabular-nums font-bold uppercase tracking-tighter">
                                                    Prev: <span className="text-blue-500/80">{repair.statusHistory[0].fromStatus?.name || 'Registro'}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-base tabular-nums pr-6">
                                            {(repair.estimatedPrice || 0) > 0 ? currencyFormatter.format(repair.estimatedPrice || 0) : "—"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={async () => {
                                                        setLoadingRepairId(repair.id);
                                                        const full = await getRepairByIdAction(repair.id);
                                                        if (full) setViewRepair(full);
                                                        setLoadingRepairId(null);
                                                    }}
                                                    title="Ver detalles"
                                                    disabled={loadingRepairId === repair.id}
                                                    className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all rounded-full"
                                                >
                                                    {loadingRepairId === repair.id
                                                        ? <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                                                        : <Eye className="h-4.5 w-4.5" />
                                                    }
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
    );
}
