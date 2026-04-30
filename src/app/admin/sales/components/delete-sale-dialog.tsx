import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { SaleWithDetails } from "@/types/sales";

interface DeleteSaleDialogProps {
    sale: SaleWithDetails | null;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export function DeleteSaleDialog({ sale, onClose, onConfirm, isDeleting }: DeleteSaleDialogProps) {
    return (
        <AlertDialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Está seguro de eliminar esta venta?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción es irreversible. Se realizarán las siguientes acciones:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>El stock será devuelto a la sucursal <strong>{sale?.branch?.name}</strong>.</li>
                            <li>Si hay reparaciones vinculadas, volverán al estado <strong>Reparado</strong>.</li>
                            <li>La venta se eliminará permanentemente.</li>
                        </ul>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Eliminando..." : "Eliminar Venta"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
