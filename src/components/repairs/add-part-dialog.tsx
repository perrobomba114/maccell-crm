"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Box, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { addPartToRepairAction } from "@/actions/repairs/technician-actions";
import { SparePartSelector, SparePartItem } from "./spare-part-selector";

interface AddPartDialogProps {
    repair: any;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function AddPartDialog({ repair, currentUserId, isOpen, onClose }: AddPartDialogProps) {
    if (!repair) return null;

    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedParts, setSelectedParts] = useState<SparePartItem[]>([]);

    const handleConfirm = async () => {
        if (selectedParts.length === 0) {
            toast.error("Seleccione al menos un repuesto.");
            return;
        }

        setIsLoading(true);
        try {
            const result = await addPartToRepairAction(repair.id, currentUserId, selectedParts);

            if (result.success) {
                toast.success("Repuestos agregados correctamente.");
                router.refresh();
                onClose();
                setSelectedParts([]);
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Error inesperado.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-lg flex items-center gap-2">
                        <Box className="w-5 h-5 text-primary" />
                        Agregar Repuestos
                    </DialogTitle>
                    <DialogDescription>
                        Agregue repuestos adicionales a la reparación #{repair.ticketNumber}.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <SparePartSelector
                        selectedParts={selectedParts}
                        onPartsChange={setSelectedParts}
                        hidePrice={true}
                    />
                </div>

                <DialogFooter className="flex flex-row gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading || selectedParts.length === 0}
                        className="flex-1 font-bold"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
