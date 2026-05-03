"use client";

import { TransferStatus } from "@prisma/client";
import { CheckCircle2, Edit2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { AdminStockTransfer } from "@/actions/transfers/admin";

interface TransferEditDialogProps {
    transfer: AdminStockTransfer | null;
    editQuantity: number;
    editNotes: string;
    editStatus: TransferStatus;
    setEditQuantity: (value: number) => void;
    setEditNotes: (value: string) => void;
    setEditStatus: (value: TransferStatus) => void;
    onClose: () => void;
    onSave: () => void;
}

export function TransferEditDialog({
    transfer,
    editQuantity,
    editNotes,
    editStatus,
    setEditQuantity,
    setEditNotes,
    setEditStatus,
    onClose,
    onSave,
}: TransferEditDialogProps) {
    const isPending = transfer?.status === TransferStatus.PENDING;

    return (
        <Dialog open={!!transfer} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Edit2 className="h-5 w-5 text-primary" />Editar Transferencia
                    </DialogTitle>
                    <DialogDescription>Modificá datos permitidos según el estado actual de la operación.</DialogDescription>
                </DialogHeader>
                {transfer && (
                    <div className="grid gap-5 py-4">
                        <div className="rounded-lg border bg-muted/40 p-3">
                            <p className="text-sm font-medium">{transfer.product.name}</p>
                            <p className="text-xs text-muted-foreground">{transfer.sourceBranch.name} → {transfer.targetBranch.name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cantidad</Label>
                                <Input type="number" min={1} value={editQuantity} onChange={(event) => setEditQuantity(Number(event.target.value))} disabled={!isPending} className="font-mono" />
                            </div>
                            <div className="space-y-2">
                                <Label>Estado</Label>
                                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as TransferStatus)} disabled={!isPending}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={TransferStatus.PENDING}>Pendiente</SelectItem>
                                        <SelectItem value={TransferStatus.COMPLETED}>Completada</SelectItem>
                                        <SelectItem value={TransferStatus.CANCELLED}>Cancelada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Input value={editNotes} onChange={(event) => setEditNotes(event.target.value)} placeholder="Añadir notas..." />
                        </div>
                        {!isPending && (
                            <div className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                                Solo se pueden editar notas en transferencias finalizadas.
                            </div>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={onSave}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function TransferDeleteDialog({ transfer, onClose, onConfirm }: { transfer: AdminStockTransfer | null; onClose: () => void; onConfirm: () => void }) {
    return (
        <AlertDialog open={!!transfer} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                        <XCircle className="h-5 w-5" />Eliminar transferencia
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción elimina la transferencia y revierte el stock cuando el estado lo permite.
                        {transfer?.status === TransferStatus.PENDING && <span className="mt-2 block font-medium text-foreground">Se devolverán {transfer.quantity} unidades a {transfer.sourceBranch.name}.</span>}
                        {transfer?.status === TransferStatus.COMPLETED && <span className="mt-2 block font-medium text-foreground">Se retirarán {transfer.quantity} unidades de {transfer.targetBranch.name} y volverán a {transfer.sourceBranch.name}.</span>}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-rose-600 hover:bg-rose-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" />Eliminar y revertir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
