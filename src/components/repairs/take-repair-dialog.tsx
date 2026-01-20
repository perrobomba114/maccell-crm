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
            <DialogContent className="sm:max-w-[600px] p-0 flex flex-col overflow-hidden">
                <div className="p-6 border-b bg-background shrink-0">
                    <DialogHeader className="text-left">
                        <DialogTitle className="flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-primary" />
                            Retirar Reparación #{repair.ticketNumber}
                        </DialogTitle>
                        <DialogDescription>
                            Asignar esta reparación a tu lista de trabajo.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="border p-3 rounded-md bg-muted/20">
                            <p className="text-muted-foreground font-semibold text-xs mb-1">CLIENTE</p>
                            <p className="font-bold text-lg leading-tight">{repair.customer.name}</p>
                            <p className="text-muted-foreground">{repair.customer.phone}</p>
                        </div>
                        <div className="border p-3 rounded-md bg-muted/20">
                            <p className="text-muted-foreground font-semibold text-xs mb-1">DISPOSITIVO</p>
                            <p className="font-bold text-lg leading-tight">{repair.deviceBrand} {repair.deviceModel}</p>
                        </div>
                    </div>

                    <div className="bg-muted p-4 rounded-md">
                        <p className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider mb-1">PROBLEMA / FALLA</p>
                        <p className="font-medium text-sm leading-relaxed">{repair.problemDescription}</p>
                    </div>

                    {/* IMAGES SECTION */}
                    {images.length > 0 && (
                        <div className="bg-muted/30 p-3 rounded-md border border-dashed">
                            <div className="flex items-center gap-2 mb-2">
                                <Image className="h-4 w-4 text-muted-foreground" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">EVIDENCIA FOTOGRÁFICA</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
                                {images.map((url: string, idx: number) => (
                                    <div
                                        key={idx}
                                        className="relative h-20 w-20 flex-shrink-0 cursor-pointer rounded-md overflow-hidden border bg-white hover:opacity-90 transition-opacity"
                                        title="Ver imagen completa"
                                        onClick={() => {
                                            setViewerIndex(idx);
                                            setViewerOpen(true);
                                        }}
                                    >
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

                    {isOverdue && (
                        <div className="border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 rounded-md space-y-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">¡Aviso de Retraso!</h4>
                                    <p className="text-xs text-red-600/90 dark:text-red-400/90">
                                        Fecha prometida vencida: {new Date(repair.promisedAt).toLocaleString('es-AR')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pl-8">
                                <Checkbox
                                    id="extendTime"
                                    checked={extendTime}
                                    onCheckedChange={(c) => setExtendTime(c as boolean)}
                                />
                                <div className="grid gap-1 leading-none">
                                    <label
                                        htmlFor="extendTime"
                                        className="text-xs font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        Agregar 60 min y notificar a vendedor
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PRE-ASSIGNED PARTS SECTION */}
                    {repair.parts && repair.parts.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 rounded-md">
                            <div className="flex items-center gap-2 mb-2">
                                <Box className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">REPUESTOS YA ASIGNADOS</span>
                            </div>
                            <div className="space-y-1">
                                {repair.parts.map((rp: any) => (
                                    <div key={rp.id} className="flex justify-between text-sm items-center bg-background/50 p-2 rounded border border-blue-100 dark:border-blue-800/50">
                                        <span className="font-medium text-foreground">{rp.sparePart.name}</span>
                                        <span className="text-muted-foreground text-xs font-mono bg-muted px-1.5 py-0.5 rounded">x{rp.quantity}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-blue-500/80 mt-2 italic">
                                * Estos repuestos ya fueron cargados por el administrador.
                            </p>
                        </div>
                    )}

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 mb-1">
                            <Box className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Solicitar Repuestos</h4>
                        </div>
                        <SparePartSelector
                            selectedParts={selectedParts}
                            onPartsChange={setSelectedParts}
                            hidePrice={true}
                        />
                    </div>
                </div>

                <div className="p-4 sm:p-6 border-t bg-muted/10 shrink-0">
                    <DialogFooter className="flex-row gap-2 sm:justify-end">
                        <Button variant="ghost" onClick={onClose} disabled={isLoading} className="flex-1 sm:flex-none h-12 sm:h-10">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isLoading || (isOverdue && !extendTime)}
                            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 sm:h-10"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            CONFIRMAR RETIRO
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>

            <ImagePreviewModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={images}
                currentIndex={viewerIndex}
                onIndexChange={setViewerIndex}
            />
        </Dialog>
    );
}
