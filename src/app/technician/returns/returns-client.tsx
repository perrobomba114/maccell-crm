"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ClipboardList, Droplets, ShieldCheck } from "lucide-react";

interface ReturnRequest {
    id: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    technicianNote: string | null;
    createdAt: Date;
    repair: {
        ticketNumber: string;
        isWet: boolean;
        isWarranty: boolean;
        customer: {
            name: string;
            phone: string;
        };
        status: {
            name: string;
            color: string;
        };
    };
}

export default function TechnicianReturnsClient({ returns }: { returns: ReturnRequest[] }) {
    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-orange-400 to-rose-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-500">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Mis Solicitudes de Devolución</h2>
                            <p className="text-sm text-muted-foreground">
                                Historial y estado de los repuestos que devolviste al inventario.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    {/* Mobile View */}
                    <div className="sm:hidden flex flex-col divide-y divide-border/50">
                        {returns.length === 0 ? (
                            <div className="p-8 flex flex-col items-center justify-center gap-2 bg-muted/10">
                                <ClipboardList className="w-10 h-10 text-muted-foreground/50 mb-2" />
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">No hay solicitudes</p>
                            </div>
                        ) : (
                            returns.map((req) => (
                                <div key={req.id} className="p-4 flex flex-col gap-3 bg-card hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "font-black font-mono text-sm",
                                                req.repair.isWet ? "text-blue-500" : req.repair.isWarranty ? "text-amber-600 dark:text-amber-500" : "text-foreground"
                                            )}>
                                                {req.repair.ticketNumber}
                                            </span>
                                        </div>
                                        <StatusBadge status={req.status} />
                                    </div>
                                    
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-foreground">{req.repair.customer.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{req.repair.customer.phone || "Sin teléfono"}</span>
                                    </div>

                                    {req.technicianNote && (
                                        <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900 border border-border/50 rounded-lg">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Nota del Técnico</p>
                                            <p className="text-xs font-medium italic">"{req.technicianNote}"</p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{req.repair.status.name}</span>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                            {format(new Date(req.createdAt), "dd/MM HH:mm", { locale: es })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden sm:block overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b-2 border-border bg-muted/70 backdrop-blur-sm">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-center w-[130px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Protocolo</TableHead>
                                    <TableHead className="text-center px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Cliente</TableHead>
                                    <TableHead className="text-center w-[120px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Contacto</TableHead>
                                    <TableHead className="text-center w-[140px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Estado Reparación</TableHead>
                                    <TableHead className="text-left px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Observación Técnica</TableHead>
                                    <TableHead className="text-center w-[120px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Resolución</TableHead>
                                    <TableHead className="text-center w-[140px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Sincronización</TableHead>
                                </TableRow>
                            </TableHeader>
                    <TableBody>
                        {returns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-60 text-center bg-muted/10">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <ClipboardList className="w-12 h-12 text-muted-foreground/50 mb-4" />
                                        <h3 className="text-lg font-black text-muted-foreground uppercase tracking-widest italic">Historial Vacío</h3>
                                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.2em]">No hay solicitudes pendientes…</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            returns.map((req) => (
                                <TableRow key={req.id} className="border-b border-border/60 transition-colors hover:bg-muted/40 group">
                                    <TableCell className="text-center py-5 px-3">
                                        <div className={cn(
                                            "inline-flex flex-col items-center justify-center min-w-[95px] p-2.5 rounded-2xl border-2 transition-[transform,box-shadow,background-color] duration-300 group-hover:scale-105 tabular-nums",
                                            req.repair.isWet ? "bg-blue-600/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]" :
                                                req.repair.isWarranty ? "bg-amber-600/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]" :
                                                    "bg-card border-border shadow-sm"
                                        )}>
                                            <span className={cn(
                                                "text-[9px] font-black tracking-[0.2em] leading-none mb-1.5 uppercase",
                                                req.repair.isWet ? "text-blue-500" : req.repair.isWarranty ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                                            )}>
                                                {req.repair.ticketNumber?.split("-")[0] || "MAC"}
                                            </span>
                                            <span className={cn(
                                                "text-base font-black font-mono leading-none tracking-tighter text-foreground"
                                            )}>
                                                {req.repair.ticketNumber?.split("-").pop()}
                                            </span>
                                            {req.repair.isWet && <Droplets className="w-3 h-3 text-blue-500 mt-1 animate-pulse" />}
                                            {req.repair.isWarranty && !req.repair.isWet && <ShieldCheck className="w-3 h-3 text-amber-500 mt-1" />}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center px-3">
                                        <span className="font-black text-[13px] text-foreground uppercase tracking-tight leading-tight group-hover:text-blue-500 transition-colors duration-300">
                                            {req.repair.customer.name}
                                        </span>
                                    </TableCell>

                                    <TableCell className="text-center px-3">
                                        <div className="inline-flex items-center justify-center bg-muted/50 px-3 py-1.5 rounded-xl border border-border tabular-nums shadow-sm group-hover:border-blue-500/30 transition-colors duration-300">
                                            <span className="text-sm font-black text-foreground uppercase tracking-tight">
                                                {req.repair.customer.phone || "———"}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center px-3">
                                        <Badge variant="outline" className="font-black border-border bg-card text-muted-foreground px-3 py-1 text-[10px] uppercase tracking-widest rounded-lg">
                                            {req.repair.status.name}
                                        </Badge>
                                    </TableCell>

                                    <TableCell className="text-left py-5 px-3">
                                        <div className="max-w-[250px] space-y-1">
                                            <p className="text-xs font-bold text-muted-foreground leading-relaxed italic line-clamp-2">
                                                “{req.technicianNote || "Sin observaciones adicionales…"}”
                                            </p>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center px-3">
                                        <StatusBadge status={req.status} />
                                    </TableCell>

                                    <TableCell className="text-center px-3">
                                        <div className="flex flex-col items-center tabular-nums">
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
                                                {format(new Date(req.createdAt), "dd/MM/yy", { locale: es })}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-2 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                                    {format(new Date(req.createdAt), "HH:mm", { locale: es })} HS
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                </div>
                </div>
            </section>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, { label: string, classes: string }> = {
        PENDING: {
            label: "Pendiente",
            classes: "bg-amber-500 text-white border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
        },
        ACCEPTED: {
            label: "Aceptada",
            classes: "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
        },
        REJECTED: {
            label: "Rechazada",
            classes: "bg-rose-600 text-white border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.4)]"
        }
    };

    const config = configs[status] || { label: status, classes: "bg-slate-800 text-slate-400 border-slate-700" };

    return (
        <Badge className={cn(
            "font-black rounded-lg px-3 py-1 text-[10px] uppercase tracking-wider border-2 transition-all duration-300",
            config.classes
        )}>
            {config.label}
        </Badge>
    );
}
