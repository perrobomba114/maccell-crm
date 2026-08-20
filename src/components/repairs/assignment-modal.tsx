"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarClock, AlertTriangle, Clock, Box, Smartphone, CheckCircle2, Plus, Minus, Timer, RefreshCw, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { assignTimeAction } from "@/lib/actions/repairs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SparePartSelector, SparePartItem } from "./spare-part-selector";
import { cn } from "@/lib/utils";

interface AssignmentModalProps {
    repair: any;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

const TIME_PRESETS = [15, 30, 45, 60, 90];

export function AssignmentModal({ repair, currentUserId, isOpen, onClose }: AssignmentModalProps) {
    if (!repair) return null;

    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState<string>("30");
    const [updateDate, setUpdateDate] = useState(false);
    const [selectedParts, setSelectedParts] = useState<SparePartItem[]>([]);

    const promisedDate = repair.promisedAt ? new Date(repair.promisedAt) : null;
    const isOverdue = promisedDate ? promisedDate < new Date() : false;
    const parsedTime = parseInt(estimatedTime) || 0;

    const handleAdjustTime = (delta: number) => {
        const current = parseInt(estimatedTime) || 0;
        const next = Math.max(5, Math.min(480, current + delta));
        setEstimatedTime(String(next));
    };

    const handlePresetSelect = (preset: number) => {
        setEstimatedTime(String(preset));
    };

    const handleAssign = async () => {
        const time = parseInt(estimatedTime);
        if (isNaN(time) || time <= 0) {
            toast.error("Por favor ingrese un tiempo válido en minutos.");
            return;
        }

        setIsLoading(true);
        try {
            const result = await assignTimeAction(repair.id, currentUserId, time, updateDate, selectedParts);

            if (result.success) {
                toast.success("Reparación reactivada/asignada correctamente.");
                router.refresh();
                onClose();
            } else {
                toast.error(result.error);
                if (result.error?.includes("Actualizar Fecha Prometida")) {
                    setUpdateDate(true);
                }
            }
        } catch (error) {
            toast.error("Error inesperado.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[490px] p-0 overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl rounded-2xl custom-scrollbar">
                
                {/* Header: Dark Glassmorphic with Blue Neon Accents */}
                <DialogHeader className="p-5 sm:p-6 bg-gradient-to-b from-blue-500/10 via-slate-900/80 to-slate-950 border-b border-slate-800 relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                            <CalendarClock className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                    Asignación Técnica
                                </span>
                            </div>
                            <DialogTitle className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-1 truncate">
                                Ticket #{repair.ticketNumber}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Configuración de tiempos y repuestos para asignación de reparación.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-5 sm:p-6 space-y-4">
                    
                    {/* Device & Promised Date Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {repair.deviceBrand && (
                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5 shadow-inner">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                    <Smartphone className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                                        Dispositivo
                                    </span>
                                    <p className="text-xs font-black text-white italic uppercase truncate">
                                        {repair.deviceBrand} {repair.deviceModel}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className={cn(
                            "bg-slate-900/90 border rounded-xl p-3 flex items-center justify-between gap-2 shadow-inner",
                            isOverdue ? "border-red-500/30 bg-red-950/20" : "border-slate-800",
                            !repair.deviceBrand && "sm:col-span-2"
                        )}>
                            <div className="min-w-0">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                                    Entrega Prometida
                                </span>
                                <p className={cn(
                                    "text-xs font-black italic tracking-tight",
                                    isOverdue ? "text-red-400 line-through" : "text-emerald-400"
                                )}>
                                    {promisedDate ? format(promisedDate, "dd/MM/yy HH:mm", { locale: es }) + " HS" : "S/F"}
                                </p>
                            </div>
                            {isOverdue && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-wider shrink-0 animate-pulse">
                                    <AlertTriangle className="w-3 h-3" />
                                    Vencida
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Seller Diagnosis / Reported Fault */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-inner">
                        <div className="flex items-center gap-2 text-slate-400">
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Diagnóstico del Vendedor / Falla
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed pl-3 border-l-2 border-blue-500/40">
                            {repair.problemDescription || "Sin diagnóstico inicial registrado."}
                        </p>
                    </div>

                    {/* Time Configurator Card */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 space-y-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-300">
                                <Timer className="w-4 h-4 text-blue-400" />
                                <Label htmlFor="time" className="text-xs font-black uppercase tracking-wider text-slate-300">
                                    Tiempo de Trabajo
                                </Label>
                            </div>
                            <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                                Minutos
                            </span>
                        </div>

                        {/* Quick Presets Pills */}
                        <div className="grid grid-cols-5 gap-1.5">
                            {TIME_PRESETS.map((preset) => {
                                const isSelected = parsedTime === preset;
                                return (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => handlePresetSelect(preset)}
                                        className={cn(
                                            "py-2 rounded-lg text-xs font-black transition-all border",
                                            isSelected
                                                ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.35)] scale-[1.02]"
                                                : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800/50"
                                        )}
                                    >
                                        {preset}m
                                    </button>
                                );
                            })}
                        </div>

                        {/* Stepper + Big Numeric Display */}
                        <div className="flex items-center justify-center gap-3 pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleAdjustTime(-5)}
                                className="h-12 w-12 rounded-xl border-2 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white shrink-0 active:scale-95"
                                title="Restar 5 minutos"
                            >
                                <Minus className="h-5 w-5" />
                            </Button>

                            <div className="relative flex items-center justify-center bg-slate-950 border-2 border-slate-800 focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-xl px-4 h-14 w-36 transition-all">
                                <Input
                                    id="time"
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="00"
                                    className="bg-transparent border-0 h-full text-center text-3xl font-black text-white focus-visible:ring-0 p-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={estimatedTime}
                                    onChange={(e) => setEstimatedTime(e.target.value)}
                                />
                                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider ml-1 select-none">
                                    min
                                </span>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleAdjustTime(5)}
                                className="h-12 w-12 rounded-xl border-2 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white shrink-0 active:scale-95"
                                title="Sumar 5 minutos"
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Checkbox Block: Actualizar Entrega */}
                    <div
                        className={cn(
                            "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group",
                            updateDate
                                ? "bg-blue-600/15 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                        )}
                        onClick={() => setUpdateDate(!updateDate)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                                updateDate ? "bg-blue-500/20 border-blue-400 text-blue-400" : "bg-slate-800 border-slate-700 text-slate-400"
                            )}>
                                <RefreshCw className={cn("w-4 h-4", updateDate && "animate-spin-slow")} />
                            </div>
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-xs font-black uppercase tracking-wider",
                                    updateDate ? "text-blue-300" : "text-slate-300"
                                )}>
                                    Actualizar Fecha de Entrega
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">
                                    Recalcula la fecha estimada según el nuevo tiempo
                                </span>
                            </div>
                        </div>
                        <Checkbox
                            id="updateDate"
                            checked={updateDate}
                            onCheckedChange={(c) => setUpdateDate(c as boolean)}
                            className={cn(
                                "h-5 w-5 rounded-md",
                                updateDate ? "border-blue-400 bg-blue-500 text-white" : "border-slate-700 bg-slate-800"
                            )}
                        />
                    </div>

                    {/* Spare Parts Section */}
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-orange-600/20 flex items-center justify-center border border-orange-500/30">
                                <Box className="w-3 h-3 text-orange-400" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Repuestos Adicionales
                            </h4>
                        </div>
                        <div className="bg-slate-900/90 border border-slate-800/80 p-2.5 rounded-xl overflow-hidden">
                            <SparePartSelector
                                selectedParts={selectedParts}
                                onPartsChange={setSelectedParts}
                                hidePrice={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer: Action Buttons */}
                <DialogFooter className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800/80 flex flex-row gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 h-11 border-2 border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleAssign}
                        disabled={isLoading}
                        className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black uppercase tracking-wider rounded-xl text-xs shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Confirmar Asignación</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

