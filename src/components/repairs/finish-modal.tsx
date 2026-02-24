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
import { finishRepairAction } from "@/actions/repairs/technician-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { ImagePreviewModal } from "./image-preview-modal";
import { getImgUrl, isValidImg } from "@/lib/utils";
import { SafeImageThumbnail } from "./safe-image-thumbnail";

interface FinishRepairModalProps {
    repair: any;
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
    const [newImages, setNewImages] = useState<File[]>([]);
    const [partsToReturn, setPartsToReturn] = useState<Set<string>>(new Set());
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

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
            toast.success("Diagnóstico mejorado. Revisalo antes de guardar.");
        } catch (e) {
            toast.error("Error de conexión al mejorar el diagnóstico.");
        } finally {
            setIsEnhancing(false);
        }
    };

    const submitRepair = async () => {
        if (!statusId) return toast.error("Selecciona un estado.");
        if (!diagnosis.trim()) return toast.error("El informe técnico es obligatorio.");

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("repairId", repair.id);
            formData.append("technicianId", currentUserId);
            formData.append("statusId", statusId);
            formData.append("diagnosis", diagnosis);
            formData.append("isWet", isWet.toString());
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
                <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-2 border-slate-800 bg-slate-950 shadow-2xl">

                    {/* Header consistent with Start/Assign modals */}
                    <DialogHeader className={`p-8 border-b-2 transition-colors duration-500 relative overflow-hidden ${activeStatus ? activeStatus.color : "bg-slate-900 border-slate-800"}`}>
                        <div className="absolute inset-0 bg-grid-white/[0.05] pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <DialogTitle className="text-2xl sm:text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
                                #{repair.ticketNumber}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar p-6 space-y-6">

                        {/* 1. Device Context - Small & Focused */}
                        <div className="bg-slate-900 border-2 border-slate-800 p-4 rounded-xl flex items-center justify-between">
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

                        {/* 2. Status Picker - Compact Solid Grid */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {finishStatuses.map((s) => {
                                    const isSelected = statusId === s.id.toString();
                                    const Icon = s.icon;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setStatusId(s.id.toString())}
                                            className={`
                                                relative flex items-center p-3 rounded-xl border-2 transition-all gap-3 h-14 group ${s.color}
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

                        {/* 3. Problem & Diagnosis Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Problem Reference */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pl-1">
                                    <MessageSquare size={12} className="text-slate-600" />
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Reporte Entrada</Label>
                                </div>
                                <div className="bg-slate-900/50 border-2 border-slate-800 p-4 rounded-xl min-h-[120px]">
                                    <p className="text-xs font-bold text-slate-400 italic leading-relaxed">
                                        "{repair.problemDescription || 'Sin descripción.'}"
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
                                    onChange={(e) => setDiagnosis(e.target.value)}
                                    placeholder="Detalla la reparación realizada..."
                                    className="min-h-[120px] bg-slate-900 border-2 border-slate-800 rounded-xl text-xs font-bold text-white p-4 focus:border-emerald-500 transition-all placeholder:text-slate-700"
                                />
                                {/* Mejorar con IA */}
                                <button
                                    type="button"
                                    onClick={enhanceDiagnosis}
                                    disabled={isEnhancing || !diagnosis.trim()}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-violet-700/60 bg-violet-950/40 text-violet-300 text-[10px] font-black uppercase tracking-widest hover:bg-violet-900/50 hover:border-violet-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                >
                                    {isEnhancing ? (
                                        <><Loader2 size={12} className="animate-spin" /> Mejorando con IA...</>
                                    ) : (
                                        <><Sparkles size={12} /> Mejorar con IA</>
                                    )}
                                </button>
                                {enhanceError && (
                                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-amber-300 text-[10px] font-bold leading-relaxed">
                                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                        <span>{enhanceError}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Controls & Images Row */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                            {/* Humidity Toggles & Parts */}
                            <div className="md:col-span-12 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Humidity Toggle Card */}
                                    <div
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group ${isWet ? "bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "bg-slate-900 border-slate-800 hover:border-slate-700"}`}
                                        onClick={() => setIsWet(!isWet)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isWet ? "bg-white/20" : "bg-slate-800"}`}>
                                                <Droplets size={16} className={isWet ? "text-white" : "text-blue-500"} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${isWet ? "text-white" : "text-slate-400"}`}>HUMEDAD</span>
                                                <span className={`text-[9px] font-bold ${isWet ? "text-blue-100" : "text-slate-600"}`}>Rastros de líquido</span>
                                            </div>
                                        </div>
                                        <Checkbox checked={isWet} onCheckedChange={(c) => setIsWet(!!c)} className={isWet ? "border-white bg-white text-blue-600" : "border-slate-700"} />
                                    </div>

                                    {/* Spare Parts Checklist (if any) */}
                                    {repair.parts && repair.parts.length > 0 && (
                                        <div className="bg-slate-900 border-2 border-slate-800 p-4 rounded-xl space-y-3">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pl-1">DEVOLUCIÓN REPUESTOS</span>
                                            <div className="max-h-[80px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                {repair.parts.map((p: any) => {
                                                    const isReturned = partsToReturn.has(p.id) || statusId === "6";
                                                    return (
                                                        <div key={p.id} className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800/50">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase truncate pr-4">{p.sparePart?.name}</span>
                                                            <Checkbox checked={isReturned} onCheckedChange={() => togglePartReturn(p.id)} disabled={statusId === "6"} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Photo Evidence Section */}
                            <div className="md:col-span-12 space-y-4">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Evidencia Visual</Label>
                                <div className="flex flex-wrap gap-3">
                                    {/* Entrance Photos */}
                                    {images.map((url: string, idx: number) => (
                                        <div key={`old-${idx}`} className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-800 bg-slate-950 cursor-pointer hover:border-slate-600 transition-all opacity-50 hover:opacity-100" onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}>
                                            <SafeImageThumbnail src={getImgUrl(url)} alt="Entrada" onClick={() => { }} />
                                        </div>
                                    ))}

                                    {/* New Photos */}
                                    {newImages.map((file, idx) => (
                                        <div key={`new-${idx}`} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-slate-950 group">
                                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                                            <button onClick={() => setNewImages(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add Button */}
                                    {newImages.length < 3 && (
                                        <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900 hover:bg-slate-850 hover:border-slate-600 cursor-pointer transition-all group">
                                            <Camera size={16} className="text-slate-600 group-hover:text-slate-400" />
                                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer consistent with Start/Assign modals */}
                    <DialogFooter className="p-6 bg-slate-950 border-t-2 border-slate-900 flex flex-row gap-3 mt-0 pt-6">
                        <Button variant="outline" onClick={onClose} disabled={isLoading}
                            className="flex-1 h-12 border-2 border-slate-800 hover:bg-slate-900 text-slate-400 font-black uppercase tracking-widest rounded-2xl text-[11px] transition-all">
                            Descartar
                        </Button>
                        <Button
                            onClick={submitRepair}
                            disabled={isLoading}
                            className={`flex-1 h-12 text-white font-black uppercase tracking-widest rounded-2xl text-[11px] shadow-lg transition-all active:scale-95 flex items-center justify-center
                                ${activeStatus ? `${activeStatus.color} hover:brightness-110 shadow-${activeStatus.color}/20` : "bg-slate-800 text-slate-500 cursor-not-allowed"}
                            `}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Cierre"}
                        </Button>
                    </DialogFooter>

                </DialogContent>
            </Dialog>

            <ImagePreviewModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={images}
                currentIndex={viewerIndex}
                onIndexChange={setViewerIndex}
            />

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
