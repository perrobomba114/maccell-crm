"use client";

import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getAllTransfersAdmin, updateTransferAdmin, deleteTransferAdmin } from "@/actions/transfer-actions";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, CheckCircle, XCircle, Search, Trash2, AlertTriangle } from "lucide-react";
import { getUserData } from "@/actions/get-user";

export default function AdminTransfersPage() {
    const [user, setUser] = useState<any>(null);
    const [transfers, setTransfers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Edit State
    const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editQuantity, setEditQuantity] = useState(0);
    const [editNotes, setEditNotes] = useState("");
    const [editStatus, setEditStatus] = useState<string>("PENDING");

    // Delete State
    const [transferToDelete, setTransferToDelete] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            const u = await getUserData();
            setUser(u);
        };
        fetchUser();
        loadTransfers();
    }, []);

    const loadTransfers = async () => {
        setLoading(true);
        const res = await getAllTransfersAdmin();
        if (res.success && res.transfers) {
            setTransfers(res.transfers);
        } else {
            toast.error("Error al cargar transferencias");
        }
        setLoading(false);
    };

    const handleEditClick = (transfer: any) => {
        setSelectedTransfer(transfer);
        setEditQuantity(transfer.quantity);
        setEditNotes(transfer.notes || "");
        setEditStatus(transfer.status);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (transfer: any) => {
        setTransferToDelete(transfer);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!transferToDelete) return;

        const res = await deleteTransferAdmin(transferToDelete.id);
        if (res.success) {
            toast.success("Transferencia eliminada y stock revertido.");
            setIsDeleteDialogOpen(false);
            setTransferToDelete(null);
            loadTransfers();
        } else {
            toast.error(res.error || "Error al eliminar transferencia");
        }
    };

    const handleSave = async () => {
        if (!selectedTransfer || !user?.id) return;

        const res = await updateTransferAdmin({
            id: selectedTransfer.id,
            quantity: editQuantity,
            notes: editNotes,
            status: editStatus as any,
            adminId: user.id
        });

        if (res.success) {
            toast.success("Transferencia actualizada");
            setIsDialogOpen(false);
            loadTransfers();
        } else {
            toast.error(res.error || "Error al actualizar");
        }
    };

    const filteredTransfers = transfers.filter(t =>
        t.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sourceBranch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.targetBranch.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            case "COMPLETED": return "bg-green-500/10 text-green-500 border-green-500/20";
            case "CANCELLED": return "bg-red-500/10 text-red-500 border-red-500/20";
            default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
                        Transferencias de Stock
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Gestiona y supervisa los movimientos entre sucursales.
                    </p>
                </div>
            </div>

            <Card className="border-border/50 shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Historial de Transferencias</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">Fecha</TableHead>
                                <TableHead className="text-center">Producto</TableHead>
                                <TableHead className="text-center">Origen</TableHead>
                                <TableHead className="text-center">Destino</TableHead>
                                <TableHead className="text-center">Cant.</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead className="text-center">Notas</TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">Cargando...</TableCell>
                                </TableRow>
                            ) : filteredTransfers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">No hay transferencias registradas</TableCell>
                                </TableRow>
                            ) : (
                                filteredTransfers.map((transfer) => (
                                    <TableRow key={transfer.id}>
                                        <TableCell className="text-center">
                                            {format(new Date(transfer.createdAt), "dd/MM/yy HH:mm")}
                                        </TableCell>
                                        <TableCell className="font-medium text-center">{transfer.product.name}</TableCell>
                                        <TableCell className="text-center">{transfer.sourceBranch.name}</TableCell>
                                        <TableCell className="text-center">{transfer.targetBranch.name}</TableCell>
                                        <TableCell className="text-center">{transfer.quantity}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={getStatusColor(transfer.status)}>
                                                {transfer.status === "PENDING" ? "Pendiente" :
                                                    transfer.status === "COMPLETED" ? "Completada" : "Cancelada"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[150px] truncate text-center mx-auto" title={transfer.notes}>
                                            {transfer.notes || "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditClick(transfer)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteClick(transfer)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Edit2 className="h-5 w-5 text-primary" />
                            Editar Transferencia
                        </DialogTitle>
                        <DialogDescription>
                            Modifica los detalles de la transferencia o actualiza su estado.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTransfer && (
                        <div className="grid gap-6 py-4">
                            {/* Read-only info card */}
                            <div className="bg-muted/40 p-3 rounded-lg border flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                    <Edit2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{selectedTransfer.product.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedTransfer.sourceBranch.name} ➔ {selectedTransfer.targetBranch.name}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Cantidad</Label>
                                        <Input
                                            type="number"
                                            value={editQuantity}
                                            onChange={(e) => setEditQuantity(Number(e.target.value))}
                                            disabled={selectedTransfer.status !== "PENDING"}
                                            className="font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Estado</Label>
                                        <Select
                                            value={editStatus}
                                            onValueChange={setEditStatus}
                                            disabled={selectedTransfer.status !== "PENDING"}
                                        >
                                            <SelectTrigger >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PENDING">Pendiente</SelectItem>
                                                <SelectItem value="COMPLETED">Completada</SelectItem>
                                                <SelectItem value="CANCELLED">Cancelada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Notas</Label>
                                    <Input
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                        placeholder="Añadir notas..."
                                    />
                                </div>
                            </div>

                            {selectedTransfer.status !== "PENDING" && (
                                <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs">
                                    <span className="font-semibold">Nota:</span> Solo se pueden editar notas en transferencias finalizadas.
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="h-5 w-5" />
                            ¿Estás seguro?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente la transferencia.
                            <br /><br />
                            <strong>Importante:</strong> Se intentará revertir el movimiento de stock.
                            {transferToDelete && transferToDelete.status === "PENDING" && (
                                <span className="block mt-2 text-foreground font-medium">
                                    • Se devolverán {transferToDelete.quantity} unidades a {transferToDelete.sourceBranch.name}.
                                </span>
                            )}
                            {transferToDelete && transferToDelete.status === "COMPLETED" && (
                                <span className="block mt-2 text-foreground font-medium">
                                    • Se retirarán {transferToDelete.quantity} unidades de {transferToDelete.targetBranch.name} y se devolverán a {transferToDelete.sourceBranch.name}.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
                            Eliminar y Revertir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
