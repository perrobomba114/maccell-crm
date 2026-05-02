"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateExpenseAction } from "@/actions/admin-expenses";
import { Loader2, PencilLine } from "lucide-react";
import type { AdminExpense } from "@/types/admin-expenses";

interface EditExpenseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    expense: AdminExpense;
}

export function EditExpenseDialog({ isOpen, onClose, expense }: EditExpenseDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    if (!expense) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const description = formData.get("description") as string;
        const amount = parseFloat(formData.get("amount") as string);

        if (!description || isNaN(amount)) {
            toast.error("Datos inválidos");
            setIsLoading(false);
            return;
        }

        try {
            const result = await updateExpenseAction(expense.id, { description, amount });

            if (result.success) {
                toast.success("Gasto actualizado");
                onClose();
            } else {
                toast.error(result.error || "Error al actualizar");
            }
        } catch {
            toast.error("Error inesperado");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PencilLine className="h-5 w-5 text-rose-600" />
                        Editar gasto
                    </DialogTitle>
                    <DialogDescription>
                        Ajustá el monto o la descripción registrada por el vendedor.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Input
                            id="description"
                            name="description"
                            defaultValue={expense.description}
                            placeholder="Descripción del gasto"
                            className="h-11"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto</Label>
                        <Input
                            id="amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            defaultValue={expense.amount}
                            placeholder="0.00"
                            className="h-11 font-mono"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
