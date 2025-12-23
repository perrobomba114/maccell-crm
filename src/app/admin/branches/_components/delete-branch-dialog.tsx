"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteBranch } from "@/actions/branch-actions";
import { toast } from "sonner";

interface DeleteBranchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    branch: {
        id: string;
        name: string;
        code: string;
    } | null;
}

export function DeleteBranchDialog({ open, onOpenChange, branch }: DeleteBranchDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!branch) return;

        setLoading(true);

        try {
            const result = await deleteBranch(branch.id);

            if (result.success) {
                toast.success("Sucursal eliminada exitosamente");
                onOpenChange(false);
            } else {
                toast.error(result.error || "Error al eliminar sucursal");
            }
        } catch (error) {
            toast.error("Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    if (!branch) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Eliminar Sucursal</DialogTitle>
                    <DialogDescription>
                        ¿Estás seguro de que deseas eliminar esta sucursal? Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm">
                        <span className="font-semibold">Sucursal:</span> {branch.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Código:</span> {branch.code}
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-500 mt-2">
                        ⚠️ No podrás eliminar esta sucursal si tiene usuarios asociados.
                    </p>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? "Eliminando..." : "Eliminar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
