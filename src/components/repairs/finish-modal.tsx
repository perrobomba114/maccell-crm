"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Image, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { finishRepairAction } from "@/actions/repairs/technician-actions";
import { ImagePreviewModal } from "./image-preview-modal";

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

export function FinishRepairModal({ repair, currentUserId, isOpen, onClose }: FinishRepairModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [statusId, setStatusId] = useState<string>(""); // No default selection
    const [diagnosis, setDiagnosis] = useState("");
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [newImages, setNewImages] = useState<File[]>([]); // New state for tech images
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
                toast.error(result.error || "Error al actualizar.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error inesperado.");
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
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-6">
                    <DialogHeader>
                        <DialogTitle>Terminar / Actualizar Reparación</DialogTitle>
                        <DialogDescription>
                            Registra el resultado final o el nuevo estado de la reparación.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* EXISTING IMAGES SECTION */}
                        {repair.deviceImages && repair.deviceImages.filter((img: string) => img && img.includes('/')).length > 0 && (
                            <div className="bg-muted/30 p-3 rounded-md border border-dashed">
                                <div className="flex items-center gap-2 mb-2">
                                    <Image className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground">EVIDENCIA FOTOGRÁFICA (Existente)</span>
                                </div>
                                <div className="flex gap-2 overflow-x-auto py-1">
                                    {repair.deviceImages
                                        .filter((url: string) => url && url.includes('/'))
                                        .map((url: string, idx: number) => (
                                            <div
                                                key={idx}
                                                className="relative h-24 w-24 flex-shrink-0 cursor-pointer rounded-md overflow-hidden border bg-white hover:opacity-90 transition-opacity"
                                                onClick={() => setPreviewImage(url)}
                                            >
                                                <img
                                                    src={url}
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

                        {/* NEW TECH IMAGES SECTION */}
                        <div className="space-y-2">
                            <Label>Agregar Evidencia (Técnico)</Label>
                            <div className="flex flex-wrap gap-2">
                                {newImages.map((file, idx) => (
                                    <div key={idx} className="relative h-20 w-20 rounded-md overflow-hidden border">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={() => removeNewImage(idx)}
                                            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-md hover:bg-red-600"
                                            type="button"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                {newImages.length < 3 && (
                                    <label className="h-20 w-20 flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                                        <Camera className="h-6 w-6 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground mt-1">Agregar</span>
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
                            <p className="text-xs text-muted-foreground">Máximo 3 fotos adicionales.</p>
                        </div>

                        {/* Image Preview Modal */}
                        <ImagePreviewModal
                            isOpen={!!previewImage}
                            onClose={() => setPreviewImage(null)}
                            imageUrl={previewImage}
                        />

                        {/* New Status Selection UI */}
                        <div className="space-y-3">
                            <Label>Nuevo Estado</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {finishStatuses.map((s) => {
                                    const isSelected = statusId === s.id.toString();
                                    let selectedStyle = "";
                                    let icon = null;

                                    // Customize colors/icons based on ID
                                    switch (s.id) {
                                        case 4: // Pausado
                                            selectedStyle = "bg-orange-100 border-orange-500 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200";
                                            icon = <Loader2 className={`w-4 h-4 ${isSelected ? "text-current" : "text-muted-foreground"}`} />;
                                            break;
                                        case 5: // Finalizado OK
                                            selectedStyle = "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:text-green-200";
                                            icon = <CheckCircle className={`w-4 h-4 ${isSelected ? "text-current" : "text-muted-foreground"}`} />;
                                            break;
                                        case 6: // No Reparado
                                            selectedStyle = "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-200";
                                            icon = <X className={`w-4 h-4 ${isSelected ? "text-current" : "text-muted-foreground"}`} />;
                                            break;
                                        case 7: // Diagnosticado
                                            selectedStyle = "bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
                                            icon = <div className={`w-4 h-4 rounded-full border-2 ${isSelected ? "border-current" : "border-muted-foreground"}`} />;
                                            break;
                                        case 8: // Esperando Confirmación
                                            selectedStyle = "bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200";
                                            icon = <div className={`w-4 h-4 rounded-full border-2 border-dashed ${isSelected ? "border-current" : "border-muted-foreground"}`} />;
                                            break;
                                        case 9: // Esperando Repuestos
                                            selectedStyle = "bg-purple-100 border-purple-500 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200";
                                            icon = <div className={`w-4 h-4 rounded-sm border-2 ${isSelected ? "border-current" : "border-muted-foreground"}`} />;
                                            break;
                                    }

                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setStatusId(s.id.toString())}
                                            className={`
                                            relative flex flex-col items-start p-3 rounded-xl border-2 transition-all duration-200 text-left h-full
                                            ${isSelected
                                                    ? `shadow-sm ring-1 ring-offset-1 ring-offset-background ${selectedStyle}`
                                                    : "bg-muted/10 border-transparent hover:bg-muted/30 text-muted-foreground"
                                                }
                                        `}
                                        >
                                            <div className="flex items-center justify-between w-full mb-2">
                                                {icon}
                                                {isSelected && <div className="w-2 h-2 rounded-full bg-current shrink-0" />}
                                            </div>
                                            <span className="text-xs font-bold leading-tight w-full break-words">
                                                {s.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Diagnóstico / Observaciones Técnicas</Label>
                            <Textarea
                                placeholder="Describe qué trabajo se realizó o por qué no se pudo reparar..."
                                className="min-h-[100px]"
                                value={diagnosis}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setDiagnosis(val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
                                }}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                        <Button onClick={handleFinish} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showReturnAlert} onOpenChange={setShowReturnAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Devolución de Repuestos</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta reparación tiene repuestos asignados. ¿Deseas devolverlos al administrador?
                            <br /><br />
                            Si aceptas, se creará una <b>solicitud de devolución</b> que el administrador deberá aprobar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => submitRepair(false)}>No Devolver</AlertDialogCancel>
                        <AlertDialogAction onClick={() => submitRepair(true)} className="bg-blue-600 hover:bg-blue-700">
                            Si, Devolver
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


