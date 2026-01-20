"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { getImgUrl, isValidImg } from "@/lib/utils";
import { addRepairImagesAction } from "@/lib/actions/repairs";
import { RepairImages } from "./repair-images";

interface AddImagesDialogProps {
    isOpen: boolean;
    onClose: () => void;
    repair: any;
}

export function AddImagesDialog({ isOpen, onClose, repair }: AddImagesDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const formData = new FormData(e.currentTarget);
            // Append repairId if not present (it should be if we add a hidden input, or just append here)
            formData.append("repairId", repair.id);

            // Debug: Check if files are present
            const files = formData.getAll("images");
            console.log("Submitting images:", files.length);

            const result = await addRepairImagesAction(formData);

            if (result.success) {
                toast.success("Imágenes agregadas correctamente.");
                onClose();
            } else {
                toast.error(result.error || "Error al subir imágenes.");
            }
        } catch (error: any) {
            console.error("Submission error:", error);
            toast.error(`Error: ${error.message || "Ocurrió un error inesperado"}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!repair) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImagePlus className="h-5 w-5 text-primary" />
                        Agregar Fotos - #{repair.ticketNumber}
                    </DialogTitle>
                    <DialogDescription>
                        Sube las fotos faltantes del dispositivo. Podrás agregar hasta completar 3 fotos en total.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="p-4 border rounded-md bg-muted/10">
                        {/* Show existing count */}
                        {(() => {
                            const validCount = (repair.deviceImages || []).filter(isValidImg).length;
                            return (
                                <p className="text-sm text-muted-foreground mb-4">
                                    Imágenes actuales: <span className="font-semibold text-foreground">{validCount}</span>
                                </p>
                            );
                        })()}

                        <RepairImages />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Subir Imágenes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
