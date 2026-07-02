"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { AdminRepair } from "@/types/admin-repairs";
import type { RepairDetails } from "../repair-details-dialog";
import {
    AdminRepairRowActions,
    type LoadingRepairAction,
    type RepairActionKind,
} from "./AdminRepairRowActions";

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
    loadingRepairAction: LoadingRepairAction;
    setViewRepair: (repair: RepairDetails | null) => void;
    setImageRepair: (repair: RepairDetails | null) => void;
    setLoadingRepairAction: (action: LoadingRepairAction) => void;
    setDeleteId: (id: string | null) => void;
    getRepairByIdAction: (id: string) => Promise<RepairDetails | null>;
    currencyFormatter: Intl.NumberFormat;
    router: AppRouterInstance;
}

export function AdminRepairsList({
    repairs,
    isPending,
    loadingRepairAction,
    setViewRepair,
    setImageRepair,
    setLoadingRepairAction,
    setDeleteId,
    getRepairByIdAction,
    currencyFormatter,
    router
}: AdminRepairsListProps) {
    const openRepair = async (repairId: string, kind: RepairActionKind) => {
        setLoadingRepairAction({ id: repairId, kind });
        try {
            const full = await getRepairByIdAction(repairId);
            if (!full) {
                toast.error("No se pudo cargar la reparación.");
                return;
            }

            if (kind === "details") {
                setViewRepair(full);
            } else {
                setImageRepair(full);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "No se pudo cargar la reparación.";
            toast.error(message);
        } finally {
            setLoadingRepairAction(null);
        }
    };

    return (
        <TooltipProvider delayDuration={120}>
            <div className={cn(
                "relative overflow-hidden border rounded-xl bg-card shadow-lg backdrop-blur-md transition-opacity duration-300",
                isPending && "opacity-60 pointer-events-none"
            )}>
                {/* Mobile View */}
                <div className="sm:hidden flex flex-col divide-y divide-border/60">
                    {repairs.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-muted-foreground p-4 text-center">
                            No se encontraron resultados para tu búsqueda…
                        </div>
                    ) : (
                        repairs.map((repair) => {
                            const colorClass = statusColorMap[repair.status.color || "gray"] || "bg-gray-100 text-gray-800";
                            return (
                                <div key={repair.id} className="p-4 flex flex-col gap-3 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "font-mono text-xs font-black px-2 py-0.5 rounded bg-muted text-muted-foreground",
                                                    repair.isWet && "bg-blue-500/10 text-blue-600",
                                                    repair.isWarranty && "bg-amber-500/10 text-amber-600"
                                                )}>
                                                    #{repair.ticketNumber}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    {format(new Date(repair.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                            <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-tighter w-fit h-5 border-2", colorClass)}>
                                                {repair.status.name}
                                            </Badge>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-black tabular-nums tracking-tighter text-primary">
                                                {(repair.estimatedPrice || 0) > 0 ? currencyFormatter.format(repair.estimatedPrice || 0) : "—"}
                                            </p>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Est. Total</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-2 px-3 bg-muted/50 rounded-lg border border-border/50">
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cliente</span>
                                            <span className="text-[11px] font-bold truncate">{repair.customer.name}</span>
                                            {repair.customer.phone && <span className="text-[9px] text-muted-foreground tabular-nums">{repair.customer.phone}</span>}
                                        </div>
                                        <div className="flex flex-col gap-0.5 border-l border-border/50 pl-4 text-right min-w-0">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Dispositivo</span>
                                            <span className="text-[11px] font-bold truncate">{repair.deviceBrand}</span>
                                            <span className="text-[10px] text-muted-foreground truncate">{repair.deviceModel}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pt-1">
                                        <div className="flex min-w-0 flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Técnico</span>
                                            <span className="flex items-center gap-1 truncate text-xs font-bold">
                                                {repair.assignedTo?.name || <span className="text-muted-foreground/50 italic">SIN ASIGNAR</span>}
                                            </span>
                                        </div>
                                        <AdminRepairRowActions
                                            repair={repair}
                                            layout="mobile"
                                            loadingAction={loadingRepairAction}
                                            onOpenDetails={(repairId) => void openRepair(repairId, "details")}
                                            onOpenImages={(repairId) => void openRepair(repairId, "images")}
                                            onEdit={(repairId) => router.push(`/admin/repairs/${repairId}/edit`)}
                                            onDelete={setDeleteId}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop View */}
                <div className="hidden sm:block overflow-x-auto">
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
                                <TableHead className="text-center w-[160px] uppercase text-[10px] font-bold tracking-tighter">Acciones</TableHead>
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
                                                    <AdminRepairRowActions
                                                        repair={repair}
                                                        layout="desktop"
                                                        loadingAction={loadingRepairAction}
                                                        onOpenDetails={(repairId) => void openRepair(repairId, "details")}
                                                        onOpenImages={(repairId) => void openRepair(repairId, "images")}
                                                        onEdit={(repairId) => router.push(`/admin/repairs/${repairId}/edit`)}
                                                        onDelete={setDeleteId}
                                                    />
                                                </TableCell>
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </TooltipProvider>
    );
}
