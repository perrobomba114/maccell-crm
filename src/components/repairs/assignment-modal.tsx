"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarClock, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { assignTimeAction } from "@/actions/repairs/technician-actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AssignmentModalProps {
    repair: any;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function AssignmentModal({ repair, currentUserId, isOpen, onClose }: AssignmentModalProps) {
    if (!repair) return null;

    const [isLoading, setIsLoading] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState("");
    const [updateDate, setUpdateDate] = useState(false);

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
            const result = await assignTimeAction(repair.id, currentUserId, time, updateDate);

            if (result.success) {
                toast.success("Reparación reactivada/asignada correctamente.");
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reactivar / Asignar Reparación #{repair.ticketNumber}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-muted p-3 rounded-md text-sm">
                        <p className="flex justify-between">
                            <span className="text-muted-foreground">Fecha Prometida Actual:</span>
                            <span className={`font-semibold ${isOverdue ? "text-red-500 line-through" : "text-green-600"}`}>
                                {format(new Date(repair.promisedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                            </span>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="time">Nuevo Tiempo Estimado (minutos)</Label>
                        <div className="relative">
                            <CalendarClock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="time"
                                type="number"
                                placeholder="Ej: 60"
                                className="pl-9"
                                value={estimatedTime}
                                onChange={(e) => setEstimatedTime(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Tiempo total de trabajo que necesitará para finalizar.
                        </p>
                    </div>

                    <div className="border border-blue-200 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md space-y-2">
                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="updateDate"
                                checked={updateDate}
                                onCheckedChange={(c) => setUpdateDate(c as boolean)}
                            />
                            <div className="grid gap-1.5 leading-none pt-0.5">
                                <label
                                    htmlFor="updateDate"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-blue-800 dark:text-blue-300"
                                >
                                    Actualizar Fecha Prometida
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Recalcular fecha de entrega basada en este nuevo tiempo y notificar al vendedor.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button
                        onClick={handleAssign}
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
