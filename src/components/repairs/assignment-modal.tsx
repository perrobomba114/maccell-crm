"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarClock, AlertTriangle, Clock } from "lucide-react";
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
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-2 border-slate-800 bg-slate-950 shadow-2xl">
                {/* Header with Solid Background */}
                <DialogHeader className="p-6 bg-slate-900 border-b-2 border-slate-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/[0.03] pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center mb-3 border border-blue-500/30">
                            <CalendarClock className="w-6 h-6 text-blue-400" />
                        </div>
                        <DialogTitle className="text-xl sm:text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
                            Asignar Ticket #{repair.ticketNumber}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-2">
                            Configuración de Tiempos y Repuestos
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Time Indicator Card */}
                    <div className="bg-slate-900 border-2 border-slate-800 p-4 rounded-2xl flex flex-col items-center text-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Fecha Prometida Actual</span>
                        <p className={`text-lg font-black italic tracking-tight ${isOverdue ? "text-red-500 line-through" : "text-emerald-400"}`}>
                            {format(new Date(repair.promisedAt), "dd/MM/yy HH:mm", { locale: es })} HS
                        </p>
                        {isOverdue && (
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black text-red-400 uppercase tracking-widest animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Entrega Vencida</span>
                            </div>
                        )}
                    </div>

                    {/* Time Input Field */}
                    <div className="space-y-3">
                        <Label htmlFor="time" className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                            Tiempo de Trabajo (Minutos)
                        </Label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Clock className="h-5 w-5 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <Input
                                id="time"
                                type="number"
                                inputMode="numeric"
                                placeholder="Minutos"
                                className="bg-slate-900 border-2 border-slate-800 h-14 pl-12 text-xl font-black text-white focus:border-blue-500 focus:ring-0 rounded-2xl transition-all placeholder:text-slate-700"
                                value={estimatedTime}
                                onChange={(e) => setEstimatedTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Checkbox Block Modernized */}
                    <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${updateDate ? "bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "bg-slate-900 border-slate-800 hover:border-slate-700"}`}
                        onClick={() => setUpdateDate(!updateDate)}>
                        <div className="flex flex-col">
                            <span className={`text-xs font-black uppercase tracking-widest ${updateDate ? "text-white" : "text-slate-400"}`}>
                                Actualizar Entrega
                            </span>
                            <span className={`text-[10px] font-bold ${updateDate ? "text-blue-100" : "text-slate-600"}`}>
                                Recalcula fecha y avisa al cliente
                            </span>
                        </div>
                        <Checkbox
                            id="updateDate"
                            checked={updateDate}
                            onCheckedChange={(c) => setUpdateDate(c as boolean)}
                            className={`h-6 w-6 rounded-lg ${updateDate ? "border-white bg-white text-blue-600" : "border-slate-700 bg-slate-800"}`}
                        />
                    </div>

                    {/* Spare Parts Section */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-orange-600/20 flex items-center justify-center border border-orange-500/30">
                                <Box className="w-3.5 h-3.5 text-orange-400" />
                            </div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Repuestos Adicionales</h4>
                        </div>
                        <div className="bg-slate-900 border-2 border-slate-800 p-2 rounded-2xl overflow-hidden">
                            <SparePartSelector
                                selectedParts={selectedParts}
                                onPartsChange={setSelectedParts}
                                hidePrice={true}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-950/80 backdrop-blur-md border-t-2 border-slate-900 flex flex-row gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}
                        className="flex-1 h-12 border-2 border-slate-800 hover:bg-slate-900 text-slate-400 font-black uppercase tracking-widest rounded-2xl text-[11px] transition-all">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={isLoading}
                        className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl text-[11px] shadow-[0_4px_12px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.6)] transition-all active:scale-95"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
