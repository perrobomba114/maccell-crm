"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TransferStatus } from "@prisma/client";
import { format } from "date-fns";
import { ArrowLeftRight, CheckCircle2, Clock3, Edit2, Search, Trash2, XCircle } from "lucide-react";
import { getAllTransfersAdmin, updateTransferAdmin, deleteTransferAdmin } from "@/actions/transfer-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TransferDeleteDialog, TransferEditDialog } from "./transfer-dialogs";
import type { AdminStockTransfer } from "@/actions/transfers/admin";

const statusLabels: Record<TransferStatus, string> = {
    PENDING: "Pendiente",
    COMPLETED: "Completada",
    CANCELLED: "Cancelada",
};

const statusStyles: Record<TransferStatus, string> = {
    PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    CANCELLED: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export function AdminTransfersClient() {
    const [transfers, setTransfers] = useState<AdminStockTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | TransferStatus>("ALL");
    const [selectedTransfer, setSelectedTransfer] = useState<AdminStockTransfer | null>(null);
    const [transferToDelete, setTransferToDelete] = useState<AdminStockTransfer | null>(null);
    const [editQuantity, setEditQuantity] = useState(0);
    const [editNotes, setEditNotes] = useState("");
    const [editStatus, setEditStatus] = useState<TransferStatus>(TransferStatus.PENDING);

    const loadTransfers = async () => {
        setLoading(true);
        const res = await getAllTransfersAdmin();
        if (res.success && res.transfers) {
            setTransfers(res.transfers);
        } else {
            toast.error(res.error || "Error al cargar transferencias");
        }
        setLoading(false);
    };

    useEffect(() => {
        void loadTransfers();
    }, []);

    const filteredTransfers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return transfers.filter((transfer) => {
            const matchesStatus = statusFilter === "ALL" || transfer.status === statusFilter;
            const matchesSearch = !query || [
                transfer.product.name,
                transfer.product.sku,
                transfer.sourceBranch.name,
                transfer.targetBranch.name,
                transfer.createdBy.name,
                transfer.notes || "",
            ].some((value) => value.toLowerCase().includes(query));
            return matchesStatus && matchesSearch;
        });
    }, [searchTerm, statusFilter, transfers]);

    const stats = useMemo(() => ({
        total: transfers.length,
        pending: transfers.filter((transfer) => transfer.status === TransferStatus.PENDING).length,
        completed: transfers.filter((transfer) => transfer.status === TransferStatus.COMPLETED).length,
        cancelled: transfers.filter((transfer) => transfer.status === TransferStatus.CANCELLED).length,
    }), [transfers]);

    const handleEditClick = (transfer: AdminStockTransfer) => {
        setSelectedTransfer(transfer);
        setEditQuantity(transfer.quantity);
        setEditNotes(transfer.notes || "");
        setEditStatus(transfer.status);
    };

    const handleSave = async () => {
        if (!selectedTransfer || editQuantity < 1) {
            toast.error("La cantidad debe ser mayor a cero");
            return;
        }

        const res = await updateTransferAdmin({
            id: selectedTransfer.id,
            quantity: editQuantity,
            notes: editNotes.trim() || undefined,
            status: editStatus,
        });

        if (res.success) {
            toast.success("Transferencia actualizada");
            setSelectedTransfer(null);
            await loadTransfers();
        } else {
            toast.error(res.error || "Error al actualizar");
        }
    };

    const confirmDelete = async () => {
        if (!transferToDelete) return;

        const res = await deleteTransferAdmin(transferToDelete.id);
        if (res.success) {
            toast.success("Transferencia eliminada y stock revertido");
            setTransferToDelete(null);
            await loadTransfers();
        } else {
            toast.error(res.error || "Error al eliminar transferencia");
        }
    };

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <ArrowLeftRight className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Transferencias de Stock</h1>
                            <p className="text-sm text-muted-foreground">Supervisá movimientos entre sucursales y revertí operaciones cuando corresponda.</p>
                        </div>
                    </div>
                    <Badge variant="secondary">{filteredTransfers.length} transferencias</Badge>
                </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total" value={stats.total} meta="Movimientos registrados" gradient="from-blue-500 to-indigo-600" text="text-blue-100" icon={<ArrowLeftRight className="h-6 w-6 text-white" />} />
                <StatCard label="Pendientes" value={stats.pending} meta="Esperando respuesta" gradient="from-amber-400 to-orange-600" text="text-amber-100" icon={<Clock3 className="h-6 w-6 text-white" />} />
                <StatCard label="Completadas" value={stats.completed} meta="Stock recibido" gradient="from-emerald-500 to-emerald-700" text="text-emerald-100" icon={<CheckCircle2 className="h-6 w-6 text-white" />} />
                <StatCard label="Canceladas" value={stats.cancelled} meta="Operaciones anuladas" gradient="from-rose-500 to-red-700" text="text-rose-100" icon={<XCircle className="h-6 w-6 text-white" />} />
            </div>

            <Card className="overflow-hidden border-border/50 shadow-sm">
                <CardHeader className="space-y-4 border-b bg-gradient-to-r from-blue-500/5 via-emerald-500/5 to-amber-500/5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <CardTitle>Historial de Transferencias</CardTitle>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "ALL" | TransferStatus)}>
                                <SelectTrigger className="h-10 w-full sm:w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos los estados</SelectItem>
                                    <SelectItem value={TransferStatus.PENDING}>Pendientes</SelectItem>
                                    <SelectItem value={TransferStatus.COMPLETED}>Completadas</SelectItem>
                                    <SelectItem value={TransferStatus.CANCELLED}>Canceladas</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar producto, SKU o sucursal..." className="h-10 pl-9" />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Ruta</TableHead>
                                    <TableHead className="text-center">Cant.</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead>Notas</TableHead>
                                    <TableHead className="text-center">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center">Cargando...</TableCell></TableRow>
                                ) : filteredTransfers.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No hay transferencias para los filtros seleccionados.</TableCell></TableRow>
                                ) : (
                                    filteredTransfers.map((transfer) => (
                                        <TableRow key={transfer.id}>
                                            <TableCell className="whitespace-nowrap">{format(new Date(transfer.createdAt), "dd/MM/yy HH:mm")}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{transfer.product.name}</div>
                                                <div className="font-mono text-xs text-muted-foreground">{transfer.product.sku}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{transfer.sourceBranch.name} → {transfer.targetBranch.name}</div>
                                                <div className="text-xs text-muted-foreground">Creada por {transfer.createdBy.name}</div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold tabular-nums">{transfer.quantity}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={statusStyles[transfer.status]}>{statusLabels[transfer.status]}</Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[220px] truncate text-muted-foreground" title={transfer.notes || ""}>{transfer.notes || "-"}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-center gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(transfer)} aria-label="Editar transferencia">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setTransferToDelete(transfer)} className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700" aria-label="Eliminar transferencia">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <TransferEditDialog transfer={selectedTransfer} editQuantity={editQuantity} editNotes={editNotes} editStatus={editStatus} setEditQuantity={setEditQuantity} setEditNotes={setEditNotes} setEditStatus={setEditStatus} onClose={() => setSelectedTransfer(null)} onSave={handleSave} />
            <TransferDeleteDialog transfer={transferToDelete} onClose={() => setTransferToDelete(null)} onConfirm={confirmDelete} />
        </div>
    );
}

function StatCard({ label, value, meta, gradient, text, icon }: { label: string; value: number; meta: string; gradient: string; text: string; icon: ReactNode }) {
    return (
        <Card className={cn("relative overflow-hidden border-none bg-gradient-to-br text-white shadow-lg", gradient)}>
            <CardContent className="flex min-h-[180px] flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                    <p className={cn("line-clamp-2 min-h-[2.5rem] text-sm font-medium", text)}>{label}</p>
                    <div className="shrink-0 rounded-xl bg-white/20 p-3 backdrop-blur-sm">{icon}</div>
                </div>
                <h3 className="mt-3 whitespace-nowrap text-3xl font-bold leading-none tracking-tight tabular-nums">{value}</h3>
                <div className={cn("mt-auto pt-4 text-sm", text)}>{meta}</div>
            </CardContent>
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </Card>
    );
}
