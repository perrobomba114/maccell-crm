"use client";

import { resolveReturnRequest } from "@/actions/return-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock3, Loader2, PackageCheck, Phone, Search, Ticket, UserRound, XCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ReturnRequestForAdmin, ReturnStatus } from "./return-types";
import {
    EmptyReturnsState,
    MetricCard,
    MobileReturnCard,
    NotePreview,
    PartsStack,
    STATUS_OPTIONS,
    StatusBadge,
    formatReturnDate,
    getReturnParts,
} from "./return-ui";

type AdminReturnsClientProps = {
    returns: ReturnRequestForAdmin[];
    adminId: string;
};

export default function AdminReturnsClient({ returns: initialReturns, adminId }: AdminReturnsClientProps) {
    const [selectedRequest, setSelectedRequest] = useState<ReturnRequestForAdmin | null>(null);
    const [actionType, setActionType] = useState<"ACCEPTED" | "REJECTED" | null>(null);
    const [adminNote, setAdminNote] = useState("");
    const [statusFilter, setStatusFilter] = useState<ReturnStatus | "ALL">("PENDING");
    const [searchTerm, setSearchTerm] = useState("");
    const [isPending, startTransition] = useTransition();

    const counts = useMemo(() => ({
        total: initialReturns.length,
        pending: initialReturns.filter((req) => req.status === "PENDING").length,
        accepted: initialReturns.filter((req) => req.status === "ACCEPTED").length,
        rejected: initialReturns.filter((req) => req.status === "REJECTED").length,
    }), [initialReturns]);

    const filteredReturns = useMemo(() => {
        const words = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);

        return initialReturns.filter((req) => {
            if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
            if (words.length === 0) return true;

            const parts = getReturnParts(req).map((part) => `${part.name} ${part.code || ""}`).join(" ");
            const haystack = [
                req.repair.ticketNumber,
                req.repair.customer.name,
                req.repair.customer.phone || "",
                req.technician.name,
                req.technicianNote || "",
                parts,
            ].join(" ").toLowerCase();

            return words.every((word) => haystack.includes(word));
        });
    }, [initialReturns, searchTerm, statusFilter]);

    const openConfirmDialog = (req: ReturnRequestForAdmin, type: "ACCEPTED" | "REJECTED") => {
        setSelectedRequest(req);
        setActionType(type);
        setAdminNote("");
    };

    const handleConfirm = () => {
        if (!selectedRequest || !actionType) return;

        startTransition(async () => {
            try {
                const result = await resolveReturnRequest(selectedRequest.id, adminId, actionType, adminNote);
                if (result.success) {
                    toast.success(`Solicitud ${actionType === "ACCEPTED" ? "aceptada" : "rechazada"} correctamente.`);
                    setSelectedRequest(null);
                } else {
                    toast.error(result.error);
                }
            } catch {
                toast.error("Error al procesar solicitud.");
            }
        });
    };

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
                <div className="border-b bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--muted))_100%)] p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <Badge variant="outline" className="mb-3 rounded-md border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300">
                                Repuestos y stock
                            </Badge>
                            <h2 className="text-3xl font-black tracking-tight text-foreground">Gestión de Devoluciones</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Revisá solicitudes de técnicos, validá repuestos y resolvé el retorno de stock sin perder contexto del ticket.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[560px]">
                            <MetricCard label="Pendientes" value={counts.pending} tone="amber" icon={<Clock3 className="h-5 w-5" />} />
                            <MetricCard label="Aceptadas" value={counts.accepted} tone="emerald" icon={<CheckCircle2 className="h-5 w-5" />} />
                            <MetricCard label="Rechazadas" value={counts.rejected} tone="rose" icon={<XCircle className="h-5 w-5" />} />
                            <MetricCard label="Total" value={counts.total} tone="slate" icon={<PackageCheck className="h-5 w-5" />} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative w-full xl:max-w-md">
                            <Label htmlFor="returns-search" className="sr-only">Buscar devoluciones</Label>
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="returns-search"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Buscar por ticket, técnico, cliente o repuesto"
                                className="h-11 pl-9"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map((option) => (
                                <Button
                                    key={option.value}
                                    type="button"
                                    size="sm"
                                    variant={statusFilter === option.value ? "default" : "outline"}
                                    onClick={() => setStatusFilter(option.value)}
                                    className={cn("h-9 rounded-md font-bold", statusFilter === option.value && "bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950")}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {filteredReturns.length === 0 ? (
                        <EmptyReturnsState />
                    ) : (
                        <>
                            <div className="hidden overflow-hidden rounded-lg border md:block">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[120px]">Ticket</TableHead>
                                            <TableHead>Técnico</TableHead>
                                            <TableHead>Repuestos</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Observación</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredReturns.map((req) => {
                                            const parts = getReturnParts(req);
                                            const date = formatReturnDate(req.createdAt);

                                            return (
                                                <TableRow key={req.id} className="align-top">
                                                    <TableCell className="font-mono font-black">
                                                        <span className="inline-flex items-center gap-2">
                                                            <Ticket className="h-4 w-4 text-orange-600" />
                                                            #{req.repair.ticketNumber}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 font-semibold">
                                                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                                {req.technician.name.charAt(0)}
                                                            </span>
                                                            {req.technician.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><PartsStack parts={parts} /></TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <p className="font-semibold">{req.repair.customer.name}</p>
                                                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <Phone className="h-3.5 w-3.5" />
                                                                {req.repair.customer.phone || "Sin teléfono"}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><NotePreview note={req.technicianNote} /></TableCell>
                                                    <TableCell><StatusBadge status={req.status} /></TableCell>
                                                    <TableCell>
                                                        <div className="text-sm font-semibold">{date.day}</div>
                                                        <div className="text-xs text-muted-foreground">{date.time} hs</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {req.status === "PENDING" ? (
                                                            <div className="inline-flex gap-2">
                                                                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => openConfirmDialog(req, "ACCEPTED")}>
                                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                    Aceptar
                                                                </Button>
                                                                <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => openConfirmDialog(req, "REJECTED")}>
                                                                    <XCircle className="mr-2 h-4 w-4" />
                                                                    Rechazar
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-bold text-muted-foreground">Resuelta</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="grid gap-3 md:hidden">
                                {filteredReturns.map((req) => (
                                    <MobileReturnCard key={req.id} req={req} onResolve={openConfirmDialog} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </section>

            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {actionType === "ACCEPTED" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-600" />}
                            {actionType === "ACCEPTED" ? "Aceptar devolución" : "Rechazar devolución"}
                        </DialogTitle>
                        <DialogDescription>
                            Ticket <span className="font-mono font-bold text-foreground">#{selectedRequest?.repair.ticketNumber}</span> solicitado por {selectedRequest?.technician.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <Label htmlFor="admin-note">Nota administrativa</Label>
                        <Textarea
                            id="admin-note"
                            value={adminNote}
                            onChange={(event) => setAdminNote(event.target.value)}
                            placeholder="Ej: Repuestos recibidos correctamente / No corresponde devolución..."
                            className="min-h-28 resize-none"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedRequest(null)} disabled={isPending}>Cancelar</Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isPending}
                            className={actionType === "ACCEPTED" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-rose-600 text-white hover:bg-rose-700"}
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {actionType === "ACCEPTED" ? "Aceptar solicitud" : "Rechazar solicitud"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
