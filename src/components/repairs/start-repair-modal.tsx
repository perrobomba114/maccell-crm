"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarClock, Play } from "lucide-react";
import { toast } from "sonner";
import { startRepairAction } from "@/actions/repairs/technician-actions";

interface StartRepairModalProps {
    repair: any;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function StartRepairModal({ repair, currentUserId, isOpen, onClose }: StartRepairModalProps) {
    if (!repair) return null;

    const [isLoading, setIsLoading] = useState(false);
    // Allow empty string initially, but default to current estimatedTime if it exists
    const [estimatedTime, setEstimatedTime] = useState<string>(repair.estimatedTime ? String(repair.estimatedTime) : "");

    const handleStart = async () => {
        const time = parseInt(estimatedTime);
        if (isNaN(time) || time <= 0) {
            toast.error("Por favor ingrese un tiempo válido en minutos.");
            return;
        }

        setIsLoading(true);
        try {
            const result = await startRepairAction(repair.id, currentUserId, time);
            if (result.success) {
                toast.success("Reparación iniciada.");
                onClose();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Error al iniciar.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Iniciar Reparación #{repair.ticketNumber}</DialogTitle>
                    <DialogDescription>
                        Confirme el tiempo estimado para esta sesión de trabajo.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="time">Tiempo Estimado (minutos)</Label>
                        <div className="relative">
                            <CalendarClock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="time"
                                type="number"
                                placeholder="Ej: 45"
                                className="pl-9"
                                value={estimatedTime}
                                onChange={(e) => setEstimatedTime(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Este tiempo se reflejará en la mesa de trabajo.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button
                        onClick={handleStart}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Iniciar Reparación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
