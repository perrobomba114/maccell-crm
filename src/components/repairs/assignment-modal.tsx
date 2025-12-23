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
    // Check if overdue
    const promisedDate = new Date(repair.promisedAt);
    const isOverdue = promisedDate < new Date();

    // Default extendTime to true if overdue
    const [extendTime, setExtendTime] = useState(isOverdue);

    const handleAssign = async () => {
        const time = parseInt(estimatedTime);
        if (isNaN(time) || time <= 0) {
            toast.error("Por favor ingrese un tiempo válido en minutos.");
            return;
        }

        setIsLoading(true);
        try {
            // Pass extendMinutes if overdue and checked
            const extendMinutes = (isOverdue && extendTime) ? 60 : undefined;
            const result = await assignTimeAction(repair.id, currentUserId, time, extendMinutes);

            if (result.success) {
                toast.success("Reparación asignada correctamente.");
                onClose();
            } else {
                toast.error(result.error);
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
                    <DialogTitle>Asignarme Reparación #{repair.ticketNumber}</DialogTitle>

                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-muted p-3 rounded-md text-sm">
                        <p className="flex justify-between">
                            <span className="text-muted-foreground">Fecha Prometida:</span>
                            <span className="font-semibold text-green-600">
                                {format(new Date(repair.promisedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                            </span>
                        </p>
                    </div>

                    {isOverdue && (
                        <div className="border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 rounded-md space-y-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-red-700 dark:text-red-400">¡Retraso detectado!</h4>
                                    <p className="text-sm text-red-600/90 dark:text-red-400/90">
                                        La fecha prometida ya ha pasado (Disponibilidad: 0 min).
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pl-8">
                                <Checkbox
                                    id="extendTimeAssign"
                                    checked={extendTime}
                                    onCheckedChange={(c) => setExtendTime(c as boolean)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="extendTimeAssign"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        Notificar
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Se notificará al vendedor sobre el cambio de fecha.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="time">Tiempo Estimado (minutos)</Label>
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

                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button
                        onClick={handleAssign}
                        disabled={isLoading || (isOverdue && !extendTime)} // Enforce extension if overdue
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Asignación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
