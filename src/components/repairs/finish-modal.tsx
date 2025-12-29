"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Image, Camera, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { finishRepairAction } from "@/actions/repairs/technician-actions";
import { ImagePreviewModal } from "./image-preview-modal";
import { getImgUrl } from "@/lib/utils";

interface FinishRepairModalProps {
    repair: any;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

const finishStatuses = [
    { id: 4, name: "Pausado (No terminado)" },
    { id: 5, name: "Finalizado OK" },
    { id: 6, name: "No Reparado / Irreparable" },
    { id: 7, name: "Diagnosticado (Esperando Cliente)" },
    { id: 8, name: "Esperando Confirmación" },
    { id: 9, name: "Esperando Repuestos" },
];
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const statusColors: Record<number, string> = {
    4: "from-orange-500 to-orange-600",
    5: "from-emerald-500 to-emerald-600",
    6: "from-red-500 to-red-600",
    7: "from-blue-500 to-blue-600",
    8: "from-amber-400 to-amber-500",
    9: "from-violet-500 to-violet-600",
};

export function FinishRepairModal({ repair, currentUserId, isOpen, onClose }: FinishRepairModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [statusId, setStatusId] = useState<string>(""); // No default selection
    const [diagnosis, setDiagnosis] = useState("");
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [newImages, setNewImages] = useState<File[]>([]); // New state for tech images
    const images = (repair.deviceImages || []).filter((url: string) => url && url.includes('/'));
    const [showReturnAlert, setShowReturnAlert] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            // Limit to 3 new images
            const totalNew = newImages.length + files.length;
            if (totalNew > 3) {
                toast.error("Máximo 3 imágenes por técnico.");
                return;
            }
            setNewImages(prev => [...prev, ...files]);
        }
    };

    const removeNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
    };

    const submitRepair = async (createReturnRequest: boolean) => {
        setIsLoading(true);
        setShowReturnAlert(false); // Close alert if open

        try {
            // New FormData approach
            const formData = new FormData();
            formData.append("repairId", repair.id);
            formData.append("technicianId", currentUserId);
            formData.append("statusId", statusId);
            formData.append("diagnosis", diagnosis);
            formData.append("createReturnRequest", createReturnRequest.toString());

            newImages.forEach((file) => {
                formData.append("images", file);
            });

            const result = await finishRepairAction(formData);

            if (result.success) {
                toast.success(createReturnRequest ? "Reparación finalizada y solicitud de devolución creada." : "Reparación actualizada correctamente.");
                onClose();
            } else {
                toast.error(result.error || "Error al actualizar la reparación.");
            }
        } catch (error: any) {
            console.error("Submit Error:", error);
            toast.error(error.message || "Error inesperado de conexión.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinish = async () => {
        if (!statusId) {
            toast.error("Debes seleccionar un estado.");
            return;
        }
        if (!diagnosis.trim()) {
            toast.error("El diagnóstico es obligatorio.");
            return;
        }

        // Logic check for Returns
        const targetStatusIds = [4, 6, 7, 8, 9];
        // Check if repair has parts. We need to respect the data structure passed.
        // Usually repair.parts is an array.
        const hasParts = repair.parts && Array.isArray(repair.parts) && repair.parts.length > 0;

        if (targetStatusIds.includes(parseInt(statusId)) && hasParts) {
            setShowReturnAlert(true);
            return;
        }

        // Normal flow
        await submitRepair(false);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl">
                    <DialogHeader className="p-6 pb-4 border-b bg-muted/10 sticky top-0 z-10 flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold tracking-tight">Finalizar Reparación</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Selecciona el resultado y añade los detalles finales del servicio.
                            </DialogDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.preventDefault();
                                onClose();
                            }}
                            className="h-8 w-8 rounded-full hover:bg-muted/20"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* 1. Status Selection */}
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado del Servicio</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {finishStatuses.map((s) => {
                                    const isSelected = statusId === s.id.toString();

                                    const gradientColors = statusColors[s.id] || "from-primary to-primary";

                                    // Map for border/text colors when unselected (Modern Hover)
                                    const solidColors: Record<number, string> = {
                                        4: "hover:border-orange-500 hover:text-orange-600",
                                        5: "hover:border-emerald-500 hover:text-emerald-600",
                                        6: "hover:border-red-500 hover:text-red-600",
                                        7: "hover:border-blue-500 hover:text-blue-600",
                                        8: "hover:border-amber-500 hover:text-amber-600",
                                        9: "hover:border-violet-500 hover:text-violet-600"
                                    };

                                    const hoverClass = solidColors[s.id] || "hover:border-primary hover:text-primary";

                                    const baseClasses = "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 text-center gap-2 h-28 overflow-hidden group cursor-pointer";

                                    // If selected: Gradient Background, White Text.
                                    // If unselected: Clean White/Dark Card. No Gray.

                                    const finalClasses = isSelected
                                        ? `bg-gradient-to-br ${gradientColors} border-transparent text-white shadow-lg scale-[1.02] ring-0`
                                        : `bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md ${hoverClass} text-muted-foreground transition-all`;

                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setStatusId(s.id.toString())}
                                            className={`${baseClasses} ${finalClasses}`}
                                        >
                                            {/* Icons */}
                                            <div className={`transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                {s.id === 5 && <CheckCircle className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-emerald-500 group-hover:text-emerald-600'}`} />}
                                                {s.id === 6 && <X className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-red-500 group-hover:text-red-600'}`} />}
                                                {s.id === 4 && <Loader2 className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-orange-500 group-hover:text-orange-600'}`} />}
                                                {![4, 5, 6].includes(s.id) && <div className={`w-8 h-8 rounded-full border-2 border-dashed ${isSelected ? 'border-white/80' : 'border-muted-foreground/40 group-hover:border-current'}`} />}
                                            </div>

                                            <span className={`text-xs font-bold leading-tight w-full px-1 ${isSelected ? 'text-white' : 'group-hover:text-current'}`}>
                                                {s.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Diagnosis */}
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informe Técnico</Label>
                            <div className="relative group">
                                <Textarea
                                    placeholder="Detalla el trabajo realizado, repuestos cambiados o motivo de fallo..."
                                    className="min-h-[120px] resize-none border-muted-foreground/20 bg-muted/5 p-4 text-sm leading-relaxed transition-all focus:ring-0 focus:border-primary/50 group-hover:bg-muted/10"
                                    value={diagnosis}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setDiagnosis(val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
                                    }}
                                />
                                <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground opacity-50">
                                    {diagnosis.length} caracteres
                                </div>
                            </div>
                        </div>

                        {/* 3. Evidence */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evidencia visual</Label>
                                <span className="text-[10px] text-muted-foreground">Máx. 3 fotos</span>
                            </div>

                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                {/* Existing Images */}
                                {repair.deviceImages?.filter((url: string) => url && url.includes('/')).map((url: string, idx: number) => (
                                    <div
                                        key={`old-${idx}`}
                                        className="relative aspect-square rounded-lg overflow-hidden border border-border cursor-zoom-in group"
                                        onClick={() => {
                                            setViewerIndex(idx);
                                            setViewerOpen(true);
                                        }}
                                    >
                                        <img src={getImgUrl(url)} alt="Evidencia previa" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </div>
                                ))}

                                {/* New Images */}
                                {newImages.map((file, idx) => (
                                    <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-primary/50 shadow-sm group">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="Nueva evidencia"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeNewImage(idx); }}
                                            className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                            type="button"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}

                                {/* Add Button */}
                                {newImages.length < 3 && (
                                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all group">
                                        <Camera className="h-5 w-5 text-muted-foreground/70 group-hover:text-primary transition-colors mb-1" />
                                        <span className="text-[9px] font-medium text-muted-foreground/70 group-hover:text-primary uppercase">Agregar</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                    </div>

                    <DialogFooter className="p-6 pt-2 border-t bg-muted/5">
                        <Button variant="ghost" onClick={onClose} disabled={isLoading} className="text-muted-foreground hover:text-foreground">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleFinish}
                            disabled={isLoading}
                            className={`
                                min-w-[140px] shadow-lg transition-all
                                ${statusId === '5' ? 'bg-green-600 hover:bg-green-700 hover:ring-2 hover:ring-green-600/50' : ''}
                                ${statusId === '6' ? 'bg-red-600 hover:bg-red-700 hover:ring-2 hover:ring-red-600/50' : ''}
                                ${!['5', '6'].includes(statusId) ? 'bg-primary hover:bg-primary/90' : ''}
                            `}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ImagePreviewModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={images}
                currentIndex={viewerIndex}
                onIndexChange={setViewerIndex}
            />

            <AlertDialog open={showReturnAlert} onOpenChange={setShowReturnAlert}>
                <AlertDialogContent className="border-l-4 border-l-blue-500">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            ¿Devolver Repuestos?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Esta reparación tiene repuestos asignados. Al seleccionar este estado, puedes generar automáticamente una solicitud para devolver <strong>TODOS</strong> los repuestos al inventario.
                            <br /><br />
                            Si confirmas, se creará una solicitud de devolución pendiente de aprobación.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel onClick={() => submitRepair(false)} className="border-0 hover:bg-muted font-medium">
                            No, conservarlos
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => submitRepair(true)} className="bg-blue-600 text-white hover:bg-blue-700 px-6 font-bold shadow-blue-200 shadow-md">
                            Sí, Devolver al Stock
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


