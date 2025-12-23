"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteUser } from "@/actions/user-actions";
import { toast } from "sonner";

interface DeleteUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: {
        id: string;
        name: string;
        email: string;
    } | null;
}

export function DeleteUserDialog({ open, onOpenChange, user }: DeleteUserDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!user) return;

        setLoading(true);

        try {
            const result = await deleteUser(user.id);

            if (result.success) {
                toast.success("Usuario eliminado exitosamente");
                onOpenChange(false);
            } else {
                toast.error(result.error || "Error al eliminar usuario");
            }
        } catch (error) {
            toast.error("Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Eliminar Usuario</DialogTitle>
                    <DialogDescription>
                        ¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm">
                        <span className="font-semibold">Usuario:</span> {user.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Email:</span> {user.email}
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
