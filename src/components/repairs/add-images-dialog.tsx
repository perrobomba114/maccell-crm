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
                        {/* Show existing images and allow deletion */}
                        {(() => {
                            const validImages = (repair.deviceImages || []).filter(isValidImg);
                            return (
                                <div className="mb-4">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Imágenes actuales: <span className="font-semibold text-foreground">{validImages.length}</span> / 3
                                    </p>

                                    {validImages.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            {validImages.map((url: string, idx: number) => (
                                                <div key={idx} className="relative aspect-square rounded-md overflow-hidden border group">
                                                    <img src={getImgUrl(url)} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={async () => {
                                                            if (confirm("¿Eliminar esta imagen?")) {
                                                                const res = await import("@/lib/actions/repairs").then(mod => mod.removeRepairImageAction(repair.id, url));
                                                                if (res.success) {
                                                                    toast.success("Imagen eliminada");
                                                                    onClose(); // Close to refresh status of parent or just to reset
                                                                } else {
                                                                    toast.error(res.error || "Error al eliminar");
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <span className="sr-only">Eliminar</span>
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="12"
                                                            height="12"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        >
                                                            <path d="M3 6h18" />
                                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                        </svg>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
