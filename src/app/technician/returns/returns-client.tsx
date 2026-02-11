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
import { Ticket, User, Phone, ClipboardList, Clock, ShieldCheck, Droplets } from "lucide-react";

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
        <div className="space-y-8 animate-in fade-in duration-700">
            <h1 className="text-2xl font-bold">Mis Solicitudes de Devolución</h1>

            <div className="border-2 border-slate-800/60 rounded-[2rem] overflow-hidden bg-slate-950/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <Table>
                    <TableHeader className="bg-slate-900/80 border-b border-slate-800">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="text-center w-[140px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14">Protocolo</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14">Cliente</TableHead>
                            <TableHead className="text-center w-[140px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14">Contacto</TableHead>
                            <TableHead className="text-center w-[160px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14">Estado Reparación</TableHead>
                            <TableHead className="text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14">Observación Técnica</TableHead>
                            <TableHead className="text-center w-[140px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14">Resolución</TableHead>
                            <TableHead className="text-center w-[140px] text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 h-14">Sincronización</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {returns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-60 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 mb-2">
                                            <ClipboardList className="w-6 h-6 text-slate-700" />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest italic">Historial Vacío</h3>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">No hay solicitudes pendientes…</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            returns.map((req) => (
                                <TableRow key={req.id} className="hover:bg-white/[0.02] border-b border-white/[0.03] group transition-[background-color] duration-300">
                                    <TableCell className="text-center py-5">
                                        <div className={cn(
                                            "inline-flex flex-col items-center justify-center min-w-[95px] p-2.5 rounded-2xl border-2 transition-[transform,box-shadow,background-color] duration-300 group-hover:scale-105 tabular-nums",
                                            req.repair.isWet ? "bg-blue-600/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]" :
                                                req.repair.isWarranty ? "bg-amber-600/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]" :
                                                    "bg-slate-900 border-slate-800 shadow-xl"
                                        )}>
                                            <span className={cn(
                                                "text-[9px] font-black tracking-[0.2em] leading-none mb-1.5 uppercase",
                                                req.repair.isWet ? "text-blue-400" : req.repair.isWarranty ? "text-amber-500" : "text-slate-500"
                                            )}>
                                                {req.repair.ticketNumber?.split("-")[0] || "MAC"}
                                            </span>
                                            <span className={cn(
                                                "text-base font-black font-mono leading-none tracking-tighter",
                                                req.repair.isWet ? "text-white" : req.repair.isWarranty ? "text-white" : "text-slate-100"
                                            )}>
                                                {req.repair.ticketNumber?.split("-").pop()}
                                            </span>
                                            {req.repair.isWet && <Droplets className="w-3 h-3 text-blue-500 mt-1 animate-pulse" />}
                                            {req.repair.isWarranty && !req.repair.isWet && <ShieldCheck className="w-3 h-3 text-amber-500 mt-1" />}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <span className="font-black text-[13px] text-white uppercase tracking-tight leading-tight group-hover:text-blue-500 transition-colors duration-300">
                                            {req.repair.customer.name}
                                        </span>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <div className="inline-flex items-center justify-center bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-800/50 tabular-nums shadow-sm group-hover:border-blue-500/30 transition-colors duration-300">
                                            <span className="text-sm font-black text-slate-300 uppercase tracking-tight">
                                                {req.repair.customer.phone || "———"}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="font-black border-slate-800 bg-slate-900/50 text-slate-400 px-3 py-1 text-[10px] uppercase tracking-widest rounded-lg">
                                            {req.repair.status.name}
                                        </Badge>
                                    </TableCell>

                                    <TableCell className="text-left py-5">
                                        <div className="max-w-[250px] space-y-1">
                                            <p className="text-xs font-bold text-slate-300 leading-relaxed italic line-clamp-2">
                                                “{req.technicianNote || "Sin observaciones adicionales…"}”
                                            </p>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <StatusBadge status={req.status} />
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center tabular-nums">
                                            <span className="text-sm font-black text-emerald-400 tracking-tight leading-none">
                                                {format(new Date(req.createdAt), "dd/MM/yy", { locale: es })}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-2 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                                <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">
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
