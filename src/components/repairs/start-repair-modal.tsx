"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Play, Smartphone, Clock, Sparkles, Plus, Minus, Timer, FileText } from "lucide-react";
import { toast } from "sonner";
import { startRepairAction } from "@/lib/actions/repairs";
import { RepairIntakeSummary } from "./repair-intake-summary";
import type { RepairAccessType } from "@/lib/repairs/intake";
import { cn } from "@/lib/utils";

type StartRepair = {
    id: string;
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    estimatedTime?: number | null;
    accessType?: RepairAccessType | null;
    accessCredential?: string | null;
    hasSimCard?: boolean | null;
    hasMemoryCard?: boolean | null;
    problemDescription?: string | null;
    diagnosis?: string | null;
};

interface StartRepairModalProps {
    repair: StartRepair | null;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

const TIME_PRESETS = [15, 30, 45, 60, 90];

export function StartRepairModal({ repair, currentUserId, isOpen, onClose }: StartRepairModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState<string>(
        repair?.estimatedTime ? String(repair.estimatedTime) : "30"
    );

    if (!repair) return null;

    const parsedTime = parseInt(estimatedTime) || 0;

    const handleAdjustTime = (delta: number) => {
        const current = parseInt(estimatedTime) || 0;
        const next = Math.max(5, Math.min(480, current + delta));
        setEstimatedTime(String(next));
    };

    const handlePresetSelect = (preset: number) => {
        setEstimatedTime(String(preset));
    };

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
                toast.success(`Reparación iniciada (${time} min).`);
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
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[480px] p-0 overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl rounded-2xl custom-scrollbar">
                
                {/* Header: Dark Glassmorphic with Amber Neon Accents */}
                <DialogHeader className="p-5 sm:p-6 bg-gradient-to-b from-amber-500/10 via-slate-900/80 to-slate-950 border-b border-slate-800 relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                            <Play className="w-5 h-5 text-amber-400 fill-amber-400/30 ml-0.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Apertura de Sesión
                                </span>
                            </div>
                            <DialogTitle className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-1 truncate">
                                Ticket #{repair.ticketNumber}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Apertura de sesión de trabajo e inicio de cronómetro para reparación.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-5 sm:p-6 space-y-4">
                    
                    {/* Device & Hardware Identity Card */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-inner">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300">
                                <Smartphone className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                                    Equipo en Mesa
                                </span>
                                <p className="text-sm sm:text-base font-black text-white italic uppercase tracking-tight truncate">
                                    {repair.deviceBrand} {repair.deviceModel}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Listo
                        </div>
                    </div>

                    {/* Seller Diagnosis / Reported Fault */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-inner">
                        <div className="flex items-center gap-2 text-slate-400">
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Diagnóstico del Vendedor / Falla
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed pl-3 border-l-2 border-amber-500/40">
                            {repair.problemDescription || "Sin diagnóstico inicial registrado."}
                        </p>
                    </div>

                    {/* Verified Reception Summary (Pattern, PIN, Sim, Memory) */}
                    <RepairIntakeSummary
                        accessType={repair.accessType}
                        accessCredential={repair.accessCredential}
                        hasSimCard={repair.hasSimCard}
                        hasMemoryCard={repair.hasMemoryCard}
                        compact
                    />

                    {/* Time Configurator - Fast & Tactile */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-300">
                                <Timer className="w-4 h-4 text-amber-400" />
                                <Label htmlFor="time" className="text-xs font-black uppercase tracking-wider text-slate-300">
                                    Tiempo Estimado
                                </Label>
                            </div>
                            <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                Cronómetro en vivo
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
                                                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-[1.02]"
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

                            <div className="relative flex items-center justify-center bg-slate-950 border-2 border-slate-800 focus-within:border-amber-500/80 focus-within:ring-2 focus-within:ring-amber-500/20 rounded-xl px-4 h-14 w-36 transition-all">
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
                </div>

                {/* Footer: Modern Action Buttons */}
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
                        onClick={handleStart}
                        disabled={isLoading}
                        className="flex-1 h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black uppercase tracking-wider rounded-xl text-xs shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Play className="h-4 w-4 fill-slate-950" />
                                <span>Iniciar Ahora</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
