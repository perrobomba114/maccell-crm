"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarClock, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { assignTimeAction } from "@/actions/repairs/technician-actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SparePartSelector, SparePartItem } from "./spare-part-selector";
import { Box } from "lucide-react";

interface AssignmentModalProps {
    repair: any;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function AssignmentModal({ repair, currentUserId, isOpen, onClose }: AssignmentModalProps) {
    if (!repair) return null;

    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState("");
    const [updateDate, setUpdateDate] = useState(false);
    const [selectedParts, setSelectedParts] = useState<SparePartItem[]>([]);

    // Check if overdue just for visual warning
    const promisedDate = new Date(repair.promisedAt);
    const isOverdue = promisedDate < new Date();

    const handleAssign = async () => {
        const time = parseInt(estimatedTime);
        if (isNaN(time) || time <= 0) {
            toast.error("Por favor ingrese un tiempo válido en minutos.");
            return;
        }

        setIsLoading(true);
        try {
            // Pass updateDate flag
            const result = await assignTimeAction(repair.id, currentUserId, time, updateDate, selectedParts);

            if (result.success) {
                toast.success("Reparación reactivada/asignada correctamente.");
                router.refresh();
                onClose();
            } else {
                toast.error(result.error);
                // If error mentions updating date, highlight the checkbox
                if (result.error?.includes("Actualizar Fecha Prometida")) {
                    setUpdateDate(true); // Auto-enable or just suggest
                }
            }
        } catch (error) {
            toast.error("Error inesperado.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] h-auto max-h-[96dvh]">
                <DialogHeader>
                    <DialogTitle className="text-lg">Asignar Reparación #{repair.ticketNumber}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2 sm:py-4">
                    <div className="bg-muted p-3 rounded-md text-xs sm:text-sm">
                        <p className="flex justify-between items-center">
                            <span className="text-muted-foreground">Fecha Prometida:</span>
                            <span className={`font-semibold ${isOverdue ? "text-red-500 line-through" : "text-green-600"}`}>
                                {format(new Date(repair.promisedAt), "dd/MM/yy HH:mm", { locale: es })}
                            </span>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="time" className="text-xs sm:text-sm font-semibold">Nuevo Tiempo Estimado (minutos)</Label>
                        <div className="relative">
                            <CalendarClock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="time"
                                type="number"
                                inputMode="numeric"
                                placeholder="Ej: 60"
                                className="pl-9 h-11"
                                value={estimatedTime}
                                onChange={(e) => setEstimatedTime(e.target.value)}
                            />
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground italic">
                            Tiempo total de trabajo necesario.
                        </p>
                    </div>

                    <div className="border border-blue-200 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl space-y-2">
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="updateDate"
                                checked={updateDate}
                                onCheckedChange={(c) => setUpdateDate(c as boolean)}
                                className="mt-1 h-5 w-5"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="updateDate"
                                    className="text-sm font-bold cursor-pointer text-blue-800 dark:text-blue-300"
                                >
                                    Actualizar Fecha Prometida
                                </label>
                                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                                    Recalcula la entrega y notifica al cliente/vendedor.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center gap-2 mb-1">
                        <Box className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Agregar Repuestos</h4>
                    </div>
                    <SparePartSelector
                        selectedParts={selectedParts}
                        onPartsChange={setSelectedParts}
                        hidePrice={true}
                    />
                </div>

                <DialogFooter className="flex flex-row gap-2 mt-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1 h-11">Cancelar</Button>
                    <Button
                        onClick={handleAssign}
                        disabled={isLoading}
                        className="flex-1 h-11 font-bold shadow-lg"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
