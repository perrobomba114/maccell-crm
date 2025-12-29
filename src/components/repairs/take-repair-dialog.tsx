"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Box, Wrench, AlertTriangle, Image } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SparePartSelector, SparePartItem } from "./spare-part-selector";
import { toast } from "sonner";
import { takeRepairAction } from "@/lib/actions/repairs";
import { ImagePreviewModal } from "./image-preview-modal";
import { getImgUrl } from "@/lib/utils";

interface TakeRepairDialogProps {
    repair: any; // Using any for simplicity in quick implementation, ideally full Repair type
    isOpen: boolean;
    onClose: () => void;
    currentUserId: string; // The technician
}

export function TakeRepairDialog({ repair, isOpen, onClose, currentUserId }: TakeRepairDialogProps) {
    if (!repair) return null;

    const [isLoading, setIsLoading] = useState(false);
    const [selectedParts, setSelectedParts] = useState<SparePartItem[]>([]);
    // Check if overdue
    const promisedDate = new Date(repair.promisedAt);
    const isOverdue = promisedDate < new Date();

    const [extendTime, setExtendTime] = useState(isOverdue); // Added new state, default true if overdue
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const images = (repair.deviceImages || []).filter((url: string) => url && url.includes('/'));

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            const result = await takeRepairAction(
                repair.id,
                currentUserId,
                selectedParts,
                (isOverdue && extendTime) ? 60 : undefined // Pass extension time if overdue and checked
            );

            if (result.success) {
                toast.success("Reparación asignada correctamente.");
                onClose();
            } else {
                toast.error(result.error || "Error al asignar.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error inesperado.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-primary" />
                        Retirar Reparación #{repair.ticketNumber}
                    </DialogTitle>
                    <DialogDescription>
                        Asignar esta reparación a tu lista de trabajo.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="border p-3 rounded-md">
                            <p className="text-muted-foreground font-semibold">Cliente</p>
                            <p className="font-medium text-lg">{repair.customer.name}</p>
                            <p>{repair.customer.phone}</p>
                        </div>
                        <div className="border p-3 rounded-md">
                            <p className="text-muted-foreground font-semibold">Dispositivo</p>
                            <p className="font-medium text-lg">{repair.deviceBrand} {repair.deviceModel}</p>
                        </div>
                    </div>

                    <div className="bg-muted p-3 rounded-md">
                        <p className="text-muted-foreground font-semibold text-xs mb-1">PROBLEMA / FALLA</p>
                        <p className="font-medium">{repair.problemDescription}</p>
                    </div>

                    {/* IMAGES SECTION */}
                    {images.length > 0 && (
                        <div className="bg-muted/30 p-3 rounded-md border border-dashed">
                            <div className="flex items-center gap-2 mb-2">
                                <Image className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground">EVIDENCIA FOTOGRÁFICA</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto py-1">
                                {images.map((url: string, idx: number) => (
                                    <div
                                        key={idx}
                                        className="relative h-24 w-24 flex-shrink-0 cursor-pointer rounded-md overflow-hidden border bg-white hover:opacity-90 transition-opacity"
                                        title="Ver imagen completa"
                                        onClick={() => {
                                            setViewerIndex(idx);
                                            setViewerOpen(true);
                                        }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={getImgUrl(url)}
                                            alt={`Foto ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                const parent = target.parentElement;
                                                if (parent) parent.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Image Preview Modal */}
                    <ImagePreviewModal
                        isOpen={viewerOpen}
                        onClose={() => setViewerOpen(false)}
                        images={images}
                        currentIndex={viewerIndex}
                        onIndexChange={setViewerIndex}
                    />

                    {isOverdue && (
                        <div className="border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 rounded-md space-y-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-red-700 dark:text-red-400">¡Retraso detectado!</h4>
                                    <p className="text-sm text-red-600/90 dark:text-red-400/90">
                                        La fecha prometida ({new Date(repair.promisedAt).toLocaleString()}) ya ha pasado.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pl-8">
                                <Checkbox
                                    id="extendTime"
                                    checked={extendTime}
                                    onCheckedChange={(c) => setExtendTime(c as boolean)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="extendTime"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        Agregar 60 minutos y notificar al vendedor
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Se actualizará la fecha prometida.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Box className="h-4 w-4" />
                            <h4 className="font-semibold">Solicitar Repuestos (Opcional)</h4>
                        </div>
                        <SparePartSelector
                            selectedParts={selectedParts}
                            onPartsChange={setSelectedParts}
                            hidePrice={true}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading || (isOverdue && !extendTime)} // Disable if overdue and extension not checked
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar y Retirar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
