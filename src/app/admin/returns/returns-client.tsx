"use strict";
"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Calendar, Ticket, Phone } from "lucide-react";
import { resolveReturnRequest } from "@/actions/return-actions";
import { toast } from "sonner";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReturnRequest {
    id: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    technicianNote: string | null;
    adminNote: string | null;
    createdAt: Date;
    technician: {
        name: string;
    };
    repair: {
        ticketNumber: string;
        customer: {
            name: string;
            phone: string;
        };
        status: {
            name: string;
        };
    };
}

export default function AdminReturnsClient({ returns: initialReturns, adminId }: { returns: ReturnRequest[], adminId: string }) {
    // Optimistic UI could be added, but for now we rely on revalidation
    const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
    const [actionType, setActionType] = useState<"ACCEPTED" | "REJECTED" | null>(null);
    const [adminNote, setAdminNote] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const openConfirmDialog = (req: ReturnRequest, type: "ACCEPTED" | "REJECTED") => {
        setSelectedRequest(req);
        setActionType(type);
        setAdminNote("");
    };

    const handleConfirm = async () => {
        if (!selectedRequest || !actionType) return;

        setIsProcessing(true);
        try {
            const result = await resolveReturnRequest(selectedRequest.id, adminId, actionType, adminNote);
            if (result.success) {
                toast.success(`Solicitud ${actionType === "ACCEPTED" ? "aceptada" : "rechazada"} correctamente.`);
                setSelectedRequest(null);
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Error al procesar solicitud.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
                    Gestión de Devoluciones
                </h2>
                <p className="text-muted-foreground">
                    Administra las solicitudes de devolución de repuestos de los técnicos.
                </p>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent border-b border-border/60">
                            <TableHead className="text-center font-semibold text-muted-foreground">TICKET</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">TÉCNICO</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">CLIENTE</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">OBSERVACIÓN</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">ESTADO</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">FECHA</TableHead>
                            <TableHead className="text-center font-semibold text-muted-foreground">ACCIONES</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialReturns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <CheckCircle className="h-8 w-8 opacity-20" />
                                        <p>No hay solicitudes pendientes.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialReturns.map((req) => (
                                <TableRow key={req.id} className="group hover:bg-muted/30 transition-colors border-b border-border/40">
                                    <TableCell className="text-center font-mono font-medium">
                                        <div className="flex items-center justify-center gap-2">
                                            <Ticket className="h-4 w-4 text-muted-foreground" />
                                            #{req.repair.ticketNumber}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                                                {req.technician.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-sm">{req.technician.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                            <span className="font-medium text-sm">{req.repair.customer.name}</span>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Phone className="h-3 w-3" />
                                                {req.repair.customer.phone}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="mx-auto max-w-[180px] px-3 py-1.5 rounded-lg border border-border/40 bg-muted/20 text-xs italic text-muted-foreground truncate cursor-help hover:bg-muted/40 transition-colors">
                                                        {req.technicianNote || "Sin observaciones"}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs text-sm">{req.technicianNote || "Sin observaciones"}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={req.status} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center justify-center text-sm">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                {format(new Date(req.createdAt), "dd/MM", { locale: es })}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(req.createdAt), "HH:mm")}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {req.status === "PENDING" ? (
                                            <div className="flex justify-center gap-2">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                    onClick={() => openConfirmDialog(req, "ACCEPTED")}
                                                    title="Aceptar"
                                                >
                                                    <CheckCircle className="h-5 w-5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                    onClick={() => openConfirmDialog(req, "REJECTED")}
                                                    title="Rechazar"
                                                >
                                                    <XCircle className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                                Resuelto
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {actionType === "ACCEPTED" ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
                            {actionType === "ACCEPTED" ? "Aceptar Devolución" : "Rechazar Devolución"}
                        </DialogTitle>
                        <DialogDescription>
                            Confirmar acción para el ticket <span className="font-mono font-bold text-foreground">#{selectedRequest?.repair.ticketNumber}</span> de {selectedRequest?.technician.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nota Administrativa (Opcional)</Label>
                            <Textarea
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="Ej: Repuestos recibidos correctamente / No corresponde devolución..."
                                className="resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedRequest(null)} disabled={isProcessing}>Cancelar</Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isProcessing}
                            className={actionType === "ACCEPTED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
                        >
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {actionType === "ACCEPTED" ? "Aceptar Solicitud" : "Rechazar Solicitud"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "PENDING":
            return (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 px-2 py-0.5">
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Pendiente
                </Badge>
            );
        case "ACCEPTED":
            return (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 px-2 py-0.5">
                    <CheckCircle className="mr-1.5 h-3 w-3" />
                    Aceptada
                </Badge>
            );
        case "REJECTED":
            return (
                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800 px-2 py-0.5">
                    <XCircle className="mr-1.5 h-3 w-3" />
                    Rechazada
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}
