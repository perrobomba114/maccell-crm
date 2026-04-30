"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AdminRepairsDeleteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function AdminRepairsDeleteDialog({
    isOpen,
    onClose,
    onConfirm
}: AdminRepairsDeleteDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-[400px] border-2">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold text-red-600">¿Confirmar Eliminación?</AlertDialogTitle>
                    <AlertDialogDescription className="text-base font-medium">
                        Esta acción no se puede deshacer. Se eliminará permanentemente la reparación y todos sus registros históricos.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="pt-4">
                    <AlertDialogCancel className="font-bold border-2">Cancelar Operación</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 transition-transform active:scale-95 shadow-lg shadow-red-500/20 border-red-700">
                        Eliminar Definitivamente
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
