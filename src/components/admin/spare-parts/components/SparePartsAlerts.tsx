"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { SparePartWithCategory } from "@/types/spare-parts";

type SparePartQuantityAction = {
    part: SparePartWithCategory;
    quantity: number;
};
type SparePartAction = {
    part: SparePartWithCategory;
};

interface SparePartsAlertsProps {
    deletingId: string | null;
    setDeletingId: (id: string | null) => void;
    handleDelete: () => void;
    replenishData: SparePartQuantityAction | null;
    setReplenishData: (data: SparePartQuantityAction | null) => void;
    handleConfirmReplenish: () => void;
    decrementData: SparePartAction | null;
    setDecrementData: (data: SparePartAction | null) => void;
    handleConfirmDecrement: () => void;
}

export function SparePartsAlerts({
    deletingId,
    setDeletingId,
    handleDelete,
    replenishData,
    setReplenishData,
    handleConfirmReplenish,
    decrementData,
    setDecrementData,
    handleConfirmDecrement
}: SparePartsAlertsProps) {
    return (
        <>
            {/* Delete Alert */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el repuesto. Se marcará como &quot;Solo lectura&quot; en el sistema (Soft Delete).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Replenish Alert */}
            <AlertDialog open={!!replenishData} onOpenChange={(open) => !open && setReplenishData(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Reposición del Local</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Desea reponer <strong>{replenishData?.quantity}</strong> unidades de <strong>{replenishData?.part.name}</strong> al Stock Local?
                            <br /><br />
                            Esto restará {replenishData?.quantity} del Depósito y sumará {replenishData?.quantity} al Local.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmReplenish} className="bg-indigo-600 hover:bg-indigo-700">
                            Confirmar Reposición
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Decrement Alert */}
            <AlertDialog open={!!decrementData} onOpenChange={(open) => !open && setDecrementData(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar uso de Repuesto?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se descontará <strong>1 unidad</strong> de <strong>{decrementData?.part.name}</strong> del Stock Local.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDecrement} className="bg-orange-600 hover:bg-orange-700 text-white">
                            Descontar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
