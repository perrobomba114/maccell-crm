"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Image, Camera, X, AlertCircle, Droplets } from "lucide-react";
import { toast } from "sonner";
import { finishRepairAction } from "@/actions/repairs/technician-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { ImagePreviewModal } from "./image-preview-modal";
import { getImgUrl, isValidImg } from "@/lib/utils";

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

const statusColors: Record<number, string> = {
    4: "from-orange-500 to-orange-600",
    5: "from-emerald-500 to-emerald-600",
    6: "from-red-500 to-red-600",
    7: "from-blue-500 to-blue-600",
    8: "from-amber-400 to-amber-500",
    9: "from-violet-500 to-violet-600",
};

import { SafeImageThumbnail } from "./safe-image-thumbnail";

export function FinishRepairModal({ repair, currentUserId, isOpen, onClose }: FinishRepairModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [statusId, setStatusId] = useState<string>(""); // No default selection
    const [diagnosis, setDiagnosis] = useState("");
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [newImages, setNewImages] = useState<File[]>([]); // New state for tech images
    const images = (repair.deviceImages || []).filter(isValidImg);
    const [partsToReturn, setPartsToReturn] = useState<Set<string>>(new Set());

    // Initialize with existing value, allows tech to toggle ON if they find it wet
    const [isWet, setIsWet] = useState<boolean>(!!repair.isWet);

    const togglePartReturn = (partId: string) => {
        setPartsToReturn(prev => {
            const next = new Set(prev);
            if (next.has(partId)) next.delete(partId);
            else next.add(partId);
            return next;
        });
    };

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

    const submitRepair = async () => {
        if (!statusId) {
            toast.error("Debes seleccionar un estado.");
            return;
        }
        if (!diagnosis.trim()) {
            toast.error("El diagnóstico es obligatorio.");
            return;
        }

        // WARNING: If status is not 5 (OK), and there are parts not returned
        const isFinishedOk = statusId === "5";
        const hasAssignedParts = repair.parts && repair.parts.length > 0;
        const allPartsMarkedForReturn = hasAssignedParts && repair.parts.every((p: any) => partsToReturn.has(p.id));

        // Status 6 is handled automatically (forced return)
        // Status 4, 7, 8, 9 should WARN the technician
        const shouldWarnAboutParts = ["4", "7", "8", "9"].includes(statusId);

        if (!isFinishedOk && hasAssignedParts && !allPartsMarkedForReturn && shouldWarnAboutParts) {
            const confirm = window.confirm("La reparación no salió OK. ¿Quiere devolver los repuestos?\n\n(Si no los devuelve ahora, quedarán descontados del stock)");
            if (!confirm) {
                // User chose not to return, but we warned them.
            } else {
                return; // Let user check the boxes
            }
        }

        setIsLoading(true);

        try {
            // New FormData approach
            const formData = new FormData();
            formData.append("repairId", repair.id);
            formData.append("technicianId", currentUserId);
            formData.append("statusId", statusId);
            formData.append("diagnosis", diagnosis);
            formData.append("isWet", isWet.toString());

            // Pass the IDs of parts to return as a JSON string
            formData.append("returnPartIds", JSON.stringify(Array.from(partsToReturn)));

            newImages.forEach((file) => {
                formData.append("images", file);
            });

            const result = await finishRepairAction(formData);

            if (result.success) {
                const returnCount = partsToReturn.size;
                const msg = returnCount > 0
                    ? `Reparación finalizada. Se generó solicitud de devolución para ${returnCount} repuesto(s).`
                    : "Reparación actualizada correctamente.";
                toast.success(msg);
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

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[700px] h-[95dvh] sm:h-auto flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl">
                    <DialogHeader className="p-4 pb-2 border-b bg-muted/10 shrink-0">
                        <div className="flex flex-col w-full text-left">
                            <DialogTitle className="text-lg font-bold tracking-tight">Finalizar Reparación</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">

                        {/* 1. Status Selection */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {finishStatuses.map((s) => {
                                    const isSelected = statusId === s.id.toString();

                                    // Solid colors for selected state
                                    const selectedColors: Record<number, string> = {
                                        4: "bg-orange-500 border-orange-600",
                                        5: "bg-emerald-600 border-emerald-700",
                                        6: "bg-red-600 border-red-700",
                                        7: "bg-blue-600 border-blue-700",
                                        8: "bg-amber-500 border-amber-600",
                                        9: "bg-violet-600 border-violet-700"
                                    };

                                    const baseClasses = "relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 text-center gap-1.5 h-20 cursor-pointer active:scale-95";

                                    const selectedClass = selectedColors[s.id] || "bg-zinc-900 border-zinc-900";
                                    const finalClasses = isSelected
                                        ? `${selectedClass} text-white shadow-md`
                                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300";

                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setStatusId(s.id.toString())}
                                            className={`${baseClasses} ${finalClasses}`}
                                        >
                                            {/* Simple Icons */}
                                            {s.id === 5 && <CheckCircle className={isSelected ? "w-5 h-5" : "w-5 h-5 opacity-50"} />}
                                            {s.id === 6 && <X className={isSelected ? "w-5 h-5" : "w-5 h-5 opacity-50"} />}
                                            {s.id === 4 && <Loader2 className={isSelected ? "w-5 h-5" : "w-5 h-5 opacity-50"} />}
                                            {![4, 5, 6].includes(s.id) && <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-white' : 'bg-zinc-300'}`} />}

                                            <span className="text-[10px] font-bold uppercase tracking-wide leading-tight px-1">
                                                {s.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Diagnosis */}
                        <div className="space-y-1 relative">
                            <Textarea
                                placeholder="Detalla el trabajo realizado..."
                                className="min-h-[100px] resize-none text-base p-4 rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white transition-colors"
                                value={diagnosis}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setDiagnosis(val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
                                }}
                            />
                            <div className="flex justify-end px-1">
                                <span className="text-[10px] text-zinc-400 font-medium">
                                    {diagnosis.length} caracteres
                                </span>
                            </div>
                        </div>

                        {/* 2.5 Wet Checkbox - Simplified */}
                        <div className="flex items-center space-x-3 px-1">
                            <Checkbox
                                id="is_wet_finish"
                                checked={isWet}
                                onCheckedChange={(checked) => setIsWet(checked === true)}
                                className="h-5 w-5 rounded-md border-2 border-zinc-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                            />
                            <label
                                htmlFor="is_wet_finish"
                                className="text-sm font-medium text-zinc-700 cursor-pointer select-none leading-none"
                            >
                                Marcar si encontraste rastros de humedad.
                            </label>
                        </div>

                        {/* 2.8 Parts Management (Preserved) */}
                        {repair.parts && repair.parts.length > 0 && (
                            <div className="space-y-3 pt-2 border-t border-dashed">
                                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Repuestos</Label>
                                {statusId === "6" && (
                                    <div className="bg-red-50 p-2 rounded text-[10px] text-red-600 font-bold uppercase mb-2">
                                        Se devolverán automáticamente.
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {repair.parts.map((part: any) => {
                                        if (!part.sparePart) return null;
                                        const isIrreparable = statusId === "6";
                                        const isReturned = partsToReturn.has(part.id) || isIrreparable;
                                        return (
                                            <div key={part.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-zinc-700">{part.sparePart.name}</span>
                                                    <span className="text-[10px] text-zinc-400">Qty: {part.quantity}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`return-${part.id}`}
                                                        checked={isReturned}
                                                        onCheckedChange={() => !isIrreparable && togglePartReturn(part.id)}
                                                        disabled={isIrreparable}
                                                    />
                                                    <label htmlFor={`return-${part.id}`} className="text-[10px] uppercase font-bold text-zinc-500 cursor-pointer">
                                                        Devolver
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. Evidence Images */}
                        <div className="space-y-2 pt-2">
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Máx. 3 fotos</p>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {/* New Images */}
                                {newImages.map((file, idx) => (
                                    <div key={`new-${idx}`} className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border border-zinc-200 group">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="Nueva evidencia"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeNewImage(idx); }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            type="button"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}

                                {/* Add Button */}
                                {newImages.length < 3 && (
                                    <label className="h-20 w-20 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-50 hover:border-blue-400 transition-colors gap-1">
                                        <Camera className="h-5 w-5 text-zinc-400" />
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase">Agregar</span>
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

                    <DialogFooter className="p-4 bg-zinc-50/50 border-t border-zinc-100 flex gap-3">
                        <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1 border-zinc-200 font-bold text-zinc-600 hover:bg-zinc-100">
                            Cancelar
                        </Button>
                        <Button
                            onClick={submitRepair}
                            disabled={isLoading}
                            className="flex-1 bg-black hover:bg-zinc-800 text-white font-bold"
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
        </>
    );
}


