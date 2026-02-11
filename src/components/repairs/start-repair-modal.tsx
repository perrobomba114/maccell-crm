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
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-2 border-slate-800 bg-slate-950 shadow-2xl">
                {/* Header with Solid Yellow/Amber Background */}
                <DialogHeader className="p-6 bg-yellow-600 border-b-2 border-yellow-700 relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/[0.1] pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3 border border-white/30 backdrop-blur-sm">
                            <Play className="w-6 h-6 text-white" />
                        </div>
                        <DialogTitle className="text-xl sm:text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
                            Iniciar Ticket #{repair.ticketNumber}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-100/80 mt-2">
                            Apertura de Sesión de Trabajo
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-8">
                    {/* Device Short Info Card */}
                    <div className="bg-slate-900 border-2 border-slate-800 p-4 rounded-2xl flex flex-col items-center text-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Equipo en Mesa</span>
                        <p className="text-lg font-black text-white uppercase italic tracking-tight">
                            {repair.deviceBrand} {repair.deviceModel}
                        </p>
                    </div>

                    {/* Time Input Field - Focal Point */}
                    <div className="space-y-4">
                        <div className="flex flex-col items-center text-center space-y-1">
                            <Label htmlFor="time" className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                Tiempo de Reparación
                            </Label>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">(Minutos Estimados)</span>
                        </div>

                        <div className="relative group max-w-[200px] mx-auto">
                            <Input
                                id="time"
                                type="number"
                                inputMode="numeric"
                                placeholder="00"
                                className="bg-slate-900 border-b-4 border-x-0 border-t-0 border-yellow-600 h-20 text-center text-5xl font-black text-white focus:ring-0 rounded-none transition-all placeholder:text-slate-800"
                                value={estimatedTime}
                                onChange={(e) => setEstimatedTime(e.target.value)}
                            />
                        </div>
                        <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                            Este tiempo activará el cronómetro en vivo
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-950 border-t-2 border-slate-900 flex flex-row gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}
                        className="flex-1 h-12 border-2 border-slate-800 hover:bg-slate-900 text-slate-400 font-black uppercase tracking-widest rounded-2xl text-[11px] transition-all">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleStart}
                        disabled={isLoading}
                        className="flex-1 h-12 bg-yellow-600 hover:bg-yellow-700 text-white font-black uppercase tracking-widest rounded-2xl text-[11px] shadow-[0_4px_12px_rgba(202,138,4,0.3)] hover:shadow-[0_8px_20px_rgba(202,138,4,0.5)] transition-all active:scale-95"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iniciar Ahora"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
