"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2,
    CheckCircle,
    X,
    Clock,
    Search,
    AlertTriangle,
    PackageSearch,
    Droplets,
    Camera,
    MessageSquare,
    ChevronRight,
    Wrench,
    FileText,
    History,
    Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { finishRepairAction } from "@/lib/actions/repairs";
import { Checkbox } from "@/components/ui/checkbox";
import { isValidImg } from "@/lib/utils";
import { FinishRepairIntakeCheck } from "./finish-repair-intake-check";
import { FinishRepairEvidence } from "./finish-repair-evidence";
import type { RepairAccessType } from "@/lib/repairs/intake";

type FinishRepairPart = {
    id: string;
    sparePart?: {
        name?: string | null;
    } | null;
};

type FinishRepair = {
    id: string;
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    problemDescription?: string | null;
    customer?: {
        name?: string | null;
    } | null;
    isWet?: boolean | null;
    accessType?: RepairAccessType | null;
    accessCredential?: string | null;
    hasSimCard?: boolean | null;
    hasMemoryCard?: boolean | null;
    deviceImages?: string[] | null;
    parts?: FinishRepairPart[] | null;
};

interface FinishRepairModalProps {
    repair: FinishRepair;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}

const finishStatuses = [
    { id: 4, name: "PAUSADO", icon: Clock, color: "bg-orange-600", border: "border-orange-500", glow: "shadow-orange-500/20" },
    { id: 5, name: "FINALIZADO OK", icon: CheckCircle, color: "bg-emerald-600", border: "border-emerald-500", glow: "shadow-emerald-500/20" },
    { id: 6, name: "NO REPARADO", icon: X, color: "bg-red-600", border: "border-red-500", glow: "shadow-red-500/20" },
    { id: 7, name: "DIAGNOSTICADO", icon: Search, color: "bg-blue-600", border: "border-blue-500", glow: "shadow-blue-500/20" },
    { id: 8, name: "ESPERANDO CONF.", icon: AlertTriangle, color: "bg-amber-500", border: "border-amber-400", glow: "shadow-amber-500/20" },
    { id: 9, name: "ESPERANDO REP.", icon: PackageSearch, color: "bg-violet-600", border: "border-violet-500", glow: "shadow-violet-500/20" },
];

export function FinishRepairModal({ repair, currentUserId, isOpen, onClose }: FinishRepairModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [enhanceError, setEnhanceError] = useState<string | null>(null);
    const [statusId, setStatusId] = useState<string>("");
    const [diagnosis, setDiagnosis] = useState("");
    const [isWet, setIsWet] = useState<boolean>(!!repair.isWet);
    const [hasSimCard, setHasSimCard] = useState<boolean>(!!repair.hasSimCard);
    const [hasMemoryCard, setHasMemoryCard] = useState<boolean>(!!repair.hasMemoryCard);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [partsToReturn, setPartsToReturn] = useState<Set<string>>(new Set());
    const [wasEnhanced, setWasEnhanced] = useState(false);
    const [showAiWarning, setShowAiWarning] = useState(false);

    const images = (repair.deviceImages || []).filter(isValidImg);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (newImages.length + files.length > 3) {
                toast.error("Máximo 3 imágenes.");
                return;
            }
            setNewImages(prev => [...prev, ...files]);
        }
    };

    const togglePartReturn = (partId: string) => {
        setPartsToReturn(prev => {
            const next = new Set(prev);
            if (next.has(partId)) next.delete(partId);
            else next.add(partId);
            return next;
        });
    };

    const enhanceDiagnosis = async () => {
        const trimmed = diagnosis.trim();
        if (!trimmed) return toast.error("Escribí el diagnóstico antes de mejorarlo.");
        if (trimmed.length < 5) return toast.error("El diagnóstico es demasiado corto para mejorar.");

        setIsEnhancing(true);
        setEnhanceError(null);
        try {
            const res = await fetch("/api/cerebro/enhance-diagnosis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    diagnosis: trimmed,
                    deviceBrand: repair.deviceBrand,
                    deviceModel: repair.deviceModel,
                    problemDescription: repair.problemDescription,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.modelUnavailable) {
                    setEnhanceError(data.error);
                } else {
                    toast.error(data.error || "Error al mejorar el diagnóstico.");
                }
                return;
            }
            setDiagnosis(data.improved);
            setWasEnhanced(true);
            toast.success("Diagnóstico mejorado. Revisalo antes de guardar.");
        } catch (e) {
            toast.error("Error de conexión al mejorar el diagnóstico.");
        } finally {
            setIsEnhancing(false);
        }
    };

    const submitRepair = async (forceNoAi: boolean = false) => {
        if (!statusId) return toast.error("Selecciona un estado.");
        if (!diagnosis.trim()) return toast.error("El informe técnico es obligatorio.");

        // 🧠 ADVERTENCIA: ¿Confirmar sin IA? (Se activa para cualquier estado excepto PAUSADO)
        if (!wasEnhanced && !forceNoAi && diagnosis.length > 2 && [5, 6, 7, 8, 9].includes(parseInt(statusId))) {
            setShowAiWarning(true);
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("repairId", repair.id);
            formData.append("technicianId", currentUserId);
            formData.append("statusId", statusId);
            formData.append("diagnosis", diagnosis);
            formData.append("isWet", isWet.toString());
            formData.append("hasSimCard", hasSimCard.toString());
            formData.append("hasMemoryCard", hasMemoryCard.toString());
            formData.append("returnPartIds", JSON.stringify(Array.from(partsToReturn)));
            newImages.forEach(f => formData.append("images", f));

            const result = await finishRepairAction(formData);
            if (result.success) {
                toast.success("Reparación finalizada con éxito.");
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

    const activeStatus = finishStatuses.find(s => s.id.toString() === statusId);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-h-[calc(100dvh-1rem)] p-0 overflow-hidden border-2 border-slate-800 bg-slate-950 shadow-2xl sm:max-w-[min(1100px,calc(100vw-2rem))]">

                    {/* Header consistent with Start/Assign modals */}
                    <DialogHeader className={`p-4 border-b-2 transition-colors duration-500 relative overflow-hidden ${activeStatus ? activeStatus.color : "bg-slate-900 border-slate-800"}`}>
                        <div className="absolute inset-0 bg-grid-white/[0.05] pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <DialogTitle className="text-2xl sm:text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
                                #{repair.ticketNumber}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    {/* Content Body */}
                    <div className="grid flex-1 grid-cols-12 gap-4 overflow-y-auto p-4 custom-scrollbar lg:overflow-hidden">

                        {/* 1. Device Context - Small & Focused */}
                        <div className="col-span-12 flex items-center justify-between rounded-xl border-2 border-slate-800 bg-slate-900 px-4 py-3">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Dispositivo</span>
                                <p className="text-sm font-black text-white italic truncate max-w-[200px] uppercase">
                                    {repair.deviceBrand} {repair.deviceModel}
                                </p>
                            </div>
                            <div className="h-10 w-px bg-slate-800" />
                            <div className="space-y-1 text-right">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Cliente</span>
                                <p className="text-sm font-black text-emerald-400 italic uppercase">
                                    {repair.customer?.name || 'Cliente S/N'}
                                </p>
                            </div>
                        </div>

                        <div className="col-span-12 lg:col-span-5">
                            <FinishRepairIntakeCheck
                                accessType={repair.accessType}
                                accessCredential={repair.accessCredential}
                                hasSimCard={hasSimCard}
                                hasMemoryCard={hasMemoryCard}
                                onSimCardChange={setHasSimCard}
                                onMemoryCardChange={setHasMemoryCard}
                            />
                        </div>

                        {/* 2. Status Picker - Compact Solid Grid */}
                        <div className="col-span-12 h-full lg:col-span-7">
                            <div className="grid h-full grid-cols-2 grid-rows-2 gap-2 sm:grid-cols-3">
                                {finishStatuses.map((s) => {
                                    const isSelected = statusId === s.id.toString();
                                    const Icon = s.icon;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setStatusId(s.id.toString())}
                                            className={`
                                                group relative flex min-h-14 items-center gap-3 rounded-xl border-2 p-3 transition-all ${s.color}
                                                ${isSelected
                                                    ? `border-white shadow-lg ${s.glow} scale-105 z-10 brightness-110`
                                                    : "border-transparent opacity-80 hover:opacity-100 hover:scale-[1.02] grayscale-[0.2] hover:grayscale-0 shadow-sm"
                                                }
                                            `}
                                        >
                                            <div className="p-1.5 rounded-lg bg-white/20 transition-colors">
                                                <Icon size={16} className="text-white" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-left leading-tight text-white drop-shadow-sm">
                                                {s.name}
                                            </span>
                                            {isSelected && (
                                                <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-lg">
                                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Reports & final controls */}
                        <div className="col-span-12 grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
                            {/* Problem Reference */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pl-1">
                                    <MessageSquare size={12} className="text-slate-600" />
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Reporte Entrada</Label>
                                </div>
                                <div className="h-[120px] overflow-y-auto rounded-xl border-2 border-slate-800 bg-slate-900/50 p-4 custom-scrollbar">
                                    <p className="text-xs font-bold text-slate-400 italic leading-relaxed">
                                        {repair.problemDescription || "Sin descripción."}
                                    </p>
                                </div>
                            </div>

                            {/* New Report Area */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pl-1">
                                    <FileText size={12} className="text-slate-600" />
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Informe Técnico</Label>
                                </div>
                                <Textarea
                                    value={diagnosis}
                                    onChange={(e) => {
                                        setDiagnosis(e.target.value);
                                        setWasEnhanced(false);
                                    }}
                                    placeholder="Detalla la reparación realizada..."
                                    className="h-[120px] min-h-[120px] resize-none rounded-xl border-2 border-slate-800 bg-slate-900 p-4 text-xs font-bold text-white transition-all placeholder:text-slate-700 focus:border-emerald-500"
                                />
                                {enhanceError && (
                                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-amber-300 text-[10px] font-bold leading-relaxed">
                                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                        <span>{enhanceError}</span>
                                    </div>
                                )}
                            </div>

                            {/* Final verification */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pl-1">
                                    <Droplets size={12} className="text-slate-600" />
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Control final</Label>
                                </div>
                                <div className="flex h-[120px] flex-col gap-2 rounded-xl border-2 border-slate-800 bg-slate-900/50 p-2.5">
                                    <div
                                        className={`flex min-h-11 cursor-pointer items-center justify-between rounded-lg border px-3 transition-all ${isWet ? "border-blue-400 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "border-slate-700 bg-slate-950 hover:border-slate-600"}`}
                                        onClick={() => setIsWet(!isWet)}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`rounded-md p-1.5 ${isWet ? "bg-white/20" : "bg-slate-800"}`}>
                                                <Droplets size={14} className={isWet ? "text-white" : "text-blue-500"} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isWet ? "text-white" : "text-slate-300"}`}>Humedad</span>
                                                <span className={`text-[8px] font-bold ${isWet ? "text-blue-100" : "text-slate-600"}`}>Rastros de líquido</span>
                                            </div>
                                        </div>
                                        <Checkbox checked={isWet} onCheckedChange={(checked) => setIsWet(!!checked)} className={isWet ? "border-white bg-white text-blue-600" : "border-slate-700"} />
                                    </div>

                                    <div className="flex min-h-11 items-center gap-2 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 px-3">
                                        <div className="flex min-w-[76px] items-center gap-2">
                                            <Camera size={14} className="text-cyan-500" />
                                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Evidencia</span>
                                        </div>
                                        <FinishRepairEvidence
                                            images={images}
                                            newImages={newImages}
                                            onImageChange={handleImageChange}
                                            onRemoveNewImage={(index) => setNewImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Spare parts checklist when assigned */}
                            {repair.parts && repair.parts.length > 0 && (
                                <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
                                    <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar">
                                        <span className="shrink-0 pl-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Devolución repuestos</span>
                                        {repair.parts.map((part) => {
                                            const isReturned = partsToReturn.has(part.id) || statusId === "6";
                                            return (
                                                <label key={part.id} className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                                                    <span className="max-w-40 truncate text-[9px] font-black uppercase text-slate-400">{part.sparePart?.name}</span>
                                                    <Checkbox checked={isReturned} onCheckedChange={() => togglePartReturn(part.id)} disabled={statusId === "6"} />
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Footer consistent with Start/Assign modals */}
                    <DialogFooter className="m-0 flex flex-col gap-3 border-t-2 border-slate-900 bg-slate-950 p-4 sm:flex-row">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                            className="h-12 border-2 border-slate-800 hover:bg-slate-900 text-slate-400 font-black uppercase tracking-widest rounded-2xl text-[10px] transition-all"
                        >
                            Descartar
                        </Button>

                        <div className="flex flex-1 gap-2">
                            <Button
                                type="button"
                                onClick={enhanceDiagnosis}
                                disabled={isEnhancing || !diagnosis.trim()}
                                className="flex-1 h-12 border-2 border-violet-700/50 bg-violet-950/30 text-violet-300 font-black uppercase tracking-widest rounded-2xl text-[10px] hover:bg-violet-900/40 hover:border-violet-400 transition-all disabled:opacity-40"
                            >
                                {isEnhancing ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Sparkles className="h-4 w-4 mr-2" />
                                )}
                                Mejorar con IA (Groq)
                            </Button>

                            <Button
                                onClick={() => submitRepair()}
                                disabled={isLoading || isEnhancing}
                                className={`flex-1 h-12 text-white font-black uppercase tracking-widest rounded-2xl text-[10px] shadow-lg transition-all active:scale-95 flex items-center justify-center
                                    ${activeStatus ? `${activeStatus.color} hover:brightness-110 shadow-${activeStatus.color}/20` : "bg-slate-800 text-slate-500 cursor-not-allowed"}
                                `}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Confirmar Cierre
                            </Button>
                        </div>
                    </DialogFooter>

                    {/* 🧠 AI Warning Overlay */}
                    {showAiWarning && (
                        <div className="absolute inset-0 z-[120] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
                            <div className="w-full max-w-sm bg-slate-900 border-2 border-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.2)] rounded-3xl p-8 flex flex-col items-center text-center space-y-6">
                                <div className="p-4 rounded-full bg-violet-500/10 border-2 border-violet-500/20">
                                    <Sparkles size={32} className="text-violet-400" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight italic">¿Informe sin mejorar?</h3>
                                    <p className="text-xs font-bold text-slate-400 leading-relaxed">
                                        ¿Estás seguro que no quieres mejorar el diagnóstico con IA antes de cerrar?
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-3 w-full pt-2">
                                    <Button
                                        onClick={() => {
                                            setShowAiWarning(false);
                                            enhanceDiagnosis();
                                        }}
                                        className="h-12 bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-widest rounded-2xl text-[10px] shadow-lg transition-all"
                                    >
                                        <Sparkles size={14} className="mr-2" /> Mejorar con Cerebro
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowAiWarning(false)}
                                            className="flex-1 h-12 text-slate-500 hover:text-white font-black uppercase tracking-widest rounded-2xl text-[9px]"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowAiWarning(false);
                                                submitRepair(true); // Proceed without AI
                                            }}
                                            className="flex-1 h-12 border-2 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white font-black uppercase tracking-widest rounded-2xl text-[9px]"
                                        >
                                            Confirmar igual
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </DialogContent>
            </Dialog>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </>
    );
}
