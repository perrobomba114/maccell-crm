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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
    const [showReturnAlert, setShowReturnAlert] = useState(false);

    // Initialize with existing value, allows tech to toggle ON if they find it wet
    const [isWet, setIsWet] = useState<boolean>(!!repair.isWet);

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
            formData.append("isWet", isWet.toString());

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
                <DialogContent className="sm:max-w-[700px] h-[95dvh] sm:h-auto flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl">
                    <DialogHeader className="p-4 pb-2 border-b bg-muted/10 shrink-0">
                        <div className="flex flex-col w-full text-left">
                            <DialogTitle className="text-lg font-bold tracking-tight">Finalizar Reparación</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">

                        {/* 1. Status Selection */}
                        <div className="space-y-2">
                            <Label className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado (Selecciona uno)</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {finishStatuses.map((s) => {
                                    const isSelected = statusId === s.id.toString();
                                    const gradientColors = statusColors[s.id] || "from-primary to-primary";

                                    // Solid colors for clearer visibility as requested
                                    const unselectedStyles: Record<number, string> = {
                                        4: "bg-orange-500 hover:bg-orange-600 text-white border-transparent",
                                        5: "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent",
                                        6: "bg-red-600 hover:bg-red-700 text-white border-transparent",
                                        7: "bg-blue-600 hover:bg-blue-700 text-white border-transparent",
                                        8: "bg-amber-500 hover:bg-amber-600 text-white border-transparent",
                                        9: "bg-violet-600 hover:bg-violet-700 text-white border-transparent"
                                    };

                                    const styleClass = unselectedStyles[s.id] || "bg-muted text-muted-foreground";
                                    // COMPACT: Reduced height (h-16/h-24), padding, and gap
                                    const baseClasses = "relative flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-300 text-center gap-1 h-16 sm:h-20 overflow-hidden group cursor-pointer shadow-sm hover:shadow-md active:scale-95";

                                    const finalClasses = isSelected
                                        ? `bg-gradient-to-br ${gradientColors} border-white/20 text-white shadow-lg scale-[1.02] ring-2 ring-offset-1 ring-primary/50`
                                        : `${styleClass} border-transparent opacity-90 hover:opacity-100`;

                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setStatusId(s.id.toString())}
                                            className={`${baseClasses} ${finalClasses}`}
                                        >
                                            <div className={`transition-transform duration-300 flex-1 flex items-center justify-center ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                {/* COMPACT: Smaller icons */}
                                                {s.id === 5 && <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-sm" />}
                                                {s.id === 6 && <X className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-sm" />}
                                                {s.id === 4 && <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-sm" />}
                                                {![4, 5, 6].includes(s.id) && <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-dashed border-white/80" />}
                                            </div>
                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide leading-none w-full px-1 drop-shadow-sm">
                                                {s.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Diagnosis */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informe Técnico</Label>
                            <div className="relative group">
                                <Textarea
                                    placeholder="Detalla el trabajo realizado..."
                                    className="min-h-[80px] resize-none border-muted-foreground/20 bg-muted/5 p-3 text-sm leading-relaxed transition-all focus:ring-0 focus:border-primary/50 group-hover:bg-muted/10"
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

                        {/* 2.5 Wet Equipment Flag (New) */}
                        <div className="flex items-center space-x-2 bg-blue-50/50 dark:bg-blue-900/10 p-2.5 rounded-lg border border-blue-100 dark:border-blue-800">
                            <Checkbox
                                id="is_wet_finish"
                                checked={isWet}
                                onCheckedChange={(checked) => setIsWet(checked === true)}
                                className="h-4 w-4 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                            />
                            <div className="grid gap-0.5 leading-none">
                                <Label
                                    htmlFor="is_wet_finish"
                                    className="text-xs font-bold text-blue-700 dark:text-blue-400 cursor-pointer flex items-center gap-1.5"
                                >
                                    <Droplets className="w-3.5 h-3.5" />
                                    EQUIPO MOJADO / CON HUMEDAD
                                </Label>
                                <p className="text-[10px] text-muted-foreground">
                                    Marcar si encontraste rastros de humedad.
                                </p>
                            </div>
                        </div>

                        {/* 3. Evidence */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evidencia visual</Label>
                                <span className="text-[10px] text-muted-foreground">Máx. 3 fotos</span>
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                                {/* Existing Images */}
                                {repair.deviceImages?.filter(isValidImg).map((url: string, idx: number) => {
                                    const imgUrl = getImgUrl(url);
                                    if (!imgUrl) return null;
                                    return (
                                    return (
                                        <SafeImageThumbnail
                                            key={`old-${idx}`}
                                            src={imgUrl}
                                            alt="Evidencia previa"
                                            onClick={() => {
                                                setViewerIndex(idx);
                                                setViewerOpen(true);
                                            }}
                                            onDelete={() => { }} // Read-only in finish modal? Or strictly no-op.
                                        />
                                    );
                                    );
                                })}

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

                    <DialogFooter className="p-4 sm:p-6 pt-2 border-t bg-muted/5 flex flex-row gap-2 shrink-0">
                        <Button variant="ghost" onClick={onClose} disabled={isLoading} className="flex-1 sm:flex-none text-muted-foreground hover:text-foreground h-11 sm:h-10">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleFinish}
                            disabled={isLoading}
                            className={`
                                flex-1 sm:min-w-[140px] shadow-lg transition-all h-11 sm:h-10
                                ${statusId === '5' ? 'bg-green-600 hover:bg-green-700' : ''}
                                ${statusId === '6' ? 'bg-red-600 hover:bg-red-700' : ''}
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


