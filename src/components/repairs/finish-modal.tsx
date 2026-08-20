"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2,
    CheckCircle,
    CheckCircle2,
    X,
    Clock,
    Search,
    AlertTriangle,
    PackageSearch,
    Droplets,
    Camera,
    MessageSquare,
    Wrench,
    FileText,
    Sparkles,
    Smartphone,
    User,
    ShieldCheck,
    RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { finishRepairAction } from "@/lib/actions/repairs";
import { Checkbox } from "@/components/ui/checkbox";
import { isValidImg, cn } from "@/lib/utils";
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
    { id: 4, name: "PAUSADO", icon: Clock, bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-400", activeBg: "bg-orange-600", glow: "shadow-[0_0_15px_rgba(249,115,22,0.3)]" },
    { id: 5, name: "FINALIZADO OK", icon: CheckCircle2, bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400", activeBg: "bg-emerald-600", glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]" },
    { id: 6, name: "NO REPARADO", icon: X, bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400", activeBg: "bg-red-600", glow: "shadow-[0_0_15px_rgba(239,68,68,0.3)]" },
    { id: 7, name: "DIAGNOSTICADO", icon: Search, bg: "bg-blue-500/15", border: "border-blue-500/40", text: "text-blue-400", activeBg: "bg-blue-600", glow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]" },
    { id: 8, name: "ESPERANDO CONF.", icon: AlertTriangle, bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400", activeBg: "bg-amber-600", glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]" },
    { id: 9, name: "ESPERANDO REP.", icon: PackageSearch, bg: "bg-violet-500/15", border: "border-violet-500/40", text: "text-violet-400", activeBg: "bg-violet-600", glow: "shadow-[0_0_15px_rgba(139,92,246,0.3)]" },
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
        if (!trimmed) return toast.error("Escribí el informe técnico antes de mejorarlo.");
        if (trimmed.length < 5) return toast.error("El informe es demasiado corto para mejorar.");

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
            toast.success("Informe mejorado con Cerebro IA.");
        } catch (e) {
            toast.error("Error de conexión al mejorar el diagnóstico.");
        } finally {
            setIsEnhancing(false);
        }
    };

    const submitRepair = async (forceNoAi: boolean = false) => {
        if (!statusId) return toast.error("Selecciona un estado de cierre.");
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
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
                <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-0 border border-slate-800/90 bg-slate-950 shadow-2xl rounded-2xl sm:max-w-[min(1080px,calc(100vw-2rem))] custom-scrollbar">

                    {/* Header: Dark Glassmorphic with dynamic status glow */}
                    <DialogHeader className={cn(
                        "p-5 sm:p-6 border-b border-slate-800 relative overflow-hidden transition-all duration-300",
                        activeStatus
                            ? "bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950"
                            : "bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950"
                    )}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-all",
                                    activeStatus
                                        ? `${activeStatus.bg} ${activeStatus.border} ${activeStatus.text} ${activeStatus.glow}`
                                        : "bg-slate-800 border-slate-700 text-slate-300"
                                )}>
                                    {activeStatus ? (
                                        <activeStatus.icon className="w-5 h-5" />
                                    ) : (
                                        <Wrench className="w-5 h-5" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-700">
                                            Cierre de Trabajo
                                        </span>
                                        {activeStatus && (
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border animate-in fade-in",
                                                activeStatus.bg, activeStatus.border, activeStatus.text
                                            )}>
                                                {activeStatus.name}
                                            </span>
                                        )}
                                    </div>
                                    <DialogTitle className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase mt-0.5">
                                        Ticket #{repair.ticketNumber}
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Formulario de finalización técnica y diagnóstico de reparación.
                                    </DialogDescription>
                                </div>
                            </div>

                            {/* Device & Client Pills in Header */}
                            <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                                    <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span className="font-bold text-white uppercase italic truncate max-w-[160px]">
                                        {repair.deviceBrand} {repair.deviceModel}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                                    <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="font-bold text-emerald-300 uppercase truncate max-w-[140px]">
                                        {repair.customer?.name || "Cliente S/N"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Content Grid */}
                    <div className="p-4 sm:p-6 space-y-4">
                        
                        {/* 1. Status Selection Buttons (Grid of 6) */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">
                                1. Selecciona el Estado de la Reparación
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                {finishStatuses.map((s) => {
                                    const isSelected = statusId === s.id.toString();
                                    const Icon = s.icon;
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setStatusId(s.id.toString())}
                                            className={cn(
                                                "relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 select-none",
                                                isSelected
                                                    ? `${s.activeBg} text-white border-white/80 ${s.glow} scale-[1.03] z-10 font-black shadow-lg`
                                                    : `${s.bg} ${s.border} ${s.text} hover:scale-[1.01] hover:border-slate-600 bg-slate-900/60`
                                            )}
                                        >
                                            <Icon className={cn("w-4 h-4", isSelected ? "text-white" : s.text)} />
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-wider leading-tight",
                                                isSelected ? "text-white drop-shadow-sm" : "text-slate-300"
                                            )}>
                                                {s.name}
                                            </span>
                                            {isSelected && (
                                                <div className="absolute top-1.5 right-1.5 bg-white text-slate-950 rounded-full p-0.5 shadow-sm">
                                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Dual Column Layout: Left (Intake + Seller Report) / Right (Technical Report + Controls) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                            
                            {/* Left Column (5 cols): Intake Reception & Seller Diagnosis */}
                            <div className="lg:col-span-5 space-y-3">
                                
                                {/* Seller Diagnosis / Problem Description */}
                                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-inner">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            Diagnóstico del Vendedor / Falla
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-300 italic leading-relaxed pl-3 border-l-2 border-amber-500/40">
                                        {repair.problemDescription || "Sin descripción de falla registrada."}
                                    </p>
                                </div>

                                {/* Verified Reception (PIN, Pattern, SIM, Memory) */}
                                <FinishRepairIntakeCheck
                                    accessType={repair.accessType}
                                    accessCredential={repair.accessCredential}
                                    hasSimCard={hasSimCard}
                                    hasMemoryCard={hasMemoryCard}
                                    onSimCardChange={setHasSimCard}
                                    onMemoryCardChange={setHasMemoryCard}
                                />
                            </div>

                            {/* Right Column (7 cols): Technical Report & Final Controls */}
                            <div className="lg:col-span-7 space-y-3">
                                
                                {/* Technical Diagnosis Textarea */}
                                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                            <Label htmlFor="diagnosis" className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                                Informe Técnico / Trabajo Realizado
                                            </Label>
                                        </div>
                                        {wasEnhanced && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/30">
                                                <Sparkles className="w-2.5 h-2.5" /> IA Optimizada
                                            </span>
                                        )}
                                    </div>

                                    <Textarea
                                        id="diagnosis"
                                        value={diagnosis}
                                        onChange={(e) => {
                                            setDiagnosis(e.target.value);
                                            setWasEnhanced(false);
                                        }}
                                        placeholder="Detalla el trabajo realizado, cambios de componentes, pruebas de funcionamiento..."
                                        className="h-28 min-h-[110px] resize-none rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-bold text-white transition-all placeholder:text-slate-600 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30"
                                    />

                                    {enhanceError && (
                                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-700/50 text-amber-300 text-[10px] font-bold leading-relaxed">
                                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                            <span>{enhanceError}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Control Final: Humidity Check & Photo Evidence Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    
                                    {/* Water Damage Check */}
                                    <div
                                        className={cn(
                                            "flex min-h-12 cursor-pointer items-center justify-between rounded-xl border px-3 py-2 transition-all",
                                            isWet
                                                ? "border-blue-400 bg-blue-600/20 text-blue-100 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                                                : "border-slate-800 bg-slate-900/80 hover:border-slate-700 text-slate-300"
                                        )}
                                        onClick={() => setIsWet(!isWet)}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                                isWet ? "bg-blue-500 text-white" : "bg-slate-800 text-blue-400"
                                            )}>
                                                <Droplets size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-black uppercase tracking-wider block">
                                                    Humedad
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-500 block truncate">
                                                    Rastros de líquido
                                                </span>
                                            </div>
                                        </div>
                                        <Checkbox
                                            checked={isWet}
                                            onCheckedChange={(checked) => setIsWet(!!checked)}
                                            className={cn("h-4 w-4 rounded", isWet ? "border-blue-400 bg-blue-500" : "border-slate-700")}
                                        />
                                    </div>

                                    {/* Evidence Photos */}
                                    <div className="flex min-h-12 items-center justify-between gap-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Camera size={14} className="text-cyan-400" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                Evidencia
                                            </span>
                                        </div>
                                        <FinishRepairEvidence
                                            images={images}
                                            newImages={newImages}
                                            onImageChange={handleImageChange}
                                            onRemoveNewImage={(index) => setNewImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}
                                        />
                                    </div>
                                </div>

                                {/* Spare Parts Return Checklist (if parts are assigned) */}
                                {repair.parts && repair.parts.length > 0 && (
                                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
                                            Devolución de Repuestos
                                        </span>
                                        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                                            {repair.parts.map((part) => {
                                                const isReturned = partsToReturn.has(part.id) || statusId === "6";
                                                return (
                                                    <label
                                                        key={part.id}
                                                        className={cn(
                                                            "flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                                                            isReturned
                                                                ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                                                                : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                                                        )}
                                                    >
                                                        <Checkbox
                                                            checked={isReturned}
                                                            onCheckedChange={() => togglePartReturn(part.id)}
                                                            disabled={statusId === "6"}
                                                            className="h-3.5 w-3.5"
                                                        />
                                                        <span className="max-w-36 truncate text-[10px] font-bold uppercase">
                                                            {part.sparePart?.name || "Repuesto"}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <DialogFooter className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                            className="h-11 border-2 border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all"
                        >
                            Descartar
                        </Button>

                        <div className="flex flex-1 gap-2">
                            <Button
                                type="button"
                                onClick={enhanceDiagnosis}
                                disabled={isEnhancing || !diagnosis.trim()}
                                className="flex-1 h-11 border border-violet-500/40 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 font-black uppercase tracking-wider rounded-xl text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {isEnhancing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4 text-violet-400" />
                                )}
                                <span>Mejorar con IA</span>
                            </Button>

                            <Button
                                type="button"
                                onClick={() => submitRepair()}
                                disabled={isLoading || isEnhancing || !statusId}
                                className={cn(
                                    "flex-1 h-11 font-black uppercase tracking-wider rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2",
                                    activeStatus
                                        ? `${activeStatus.activeBg} text-white hover:brightness-110 ${activeStatus.glow}`
                                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        <span>Confirmar Cierre</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogFooter>

                    {/* 🧠 AI Warning Overlay */}
                    {showAiWarning && (
                        <div className="absolute inset-0 z-[120] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                            <div className="w-full max-w-sm bg-slate-900 border-2 border-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.2)] rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
                                <div className="p-3.5 rounded-full bg-violet-500/10 border border-violet-500/30">
                                    <Sparkles size={28} className="text-violet-400" />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-base font-black text-white uppercase tracking-tight italic">
                                        ¿Informe sin mejorar?
                                    </h3>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed">
                                        ¿Estás seguro de que no querés mejorar el informe con IA antes de guardar?
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-2.5 w-full pt-1">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setShowAiWarning(false);
                                            enhanceDiagnosis();
                                        }}
                                        className="h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black uppercase tracking-wider rounded-xl text-xs shadow-lg transition-all"
                                    >
                                        <Sparkles size={14} className="mr-1.5" /> Mejorar con Cerebro IA
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setShowAiWarning(false)}
                                            className="flex-1 h-10 text-slate-400 hover:text-white font-black uppercase tracking-wider rounded-xl text-[10px]"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setShowAiWarning(false);
                                                submitRepair(true);
                                            }}
                                            className="flex-1 h-10 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white font-black uppercase tracking-wider rounded-xl text-[10px]"
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
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
            `}</style>
        </>
    );
}
