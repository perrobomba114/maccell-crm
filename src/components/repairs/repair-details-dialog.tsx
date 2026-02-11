"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Image, Smartphone, User, Calendar, DollarSign, FileText, Clock, ImageOff, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ImagePreviewModal } from "./image-preview-modal";
import { getImgUrl, isValidImg } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createSinglePartReturnAction } from "@/actions/repairs/technician-actions";
import { useRouter } from "next/navigation";

interface RepairDetailsDialogProps {
    repair: any;
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: string;
    onAddPart?: () => void;
}

const statusColorMap: Record<string, string> = {
    blue: "bg-blue-600 text-white border-blue-700",
    indigo: "bg-indigo-600 text-white border-indigo-700",
    yellow: "bg-amber-500 text-white border-amber-600",
    gray: "bg-slate-600 text-white border-slate-700",
    green: "bg-green-600 text-white border-green-700",
    red: "bg-red-600 text-white border-red-700",
    purple: "bg-purple-600 text-white border-purple-700",
    orange: "bg-orange-600 text-white border-orange-700",
    amber: "bg-amber-600 text-white border-amber-700",
    slate: "bg-slate-800 text-white border-slate-900",
};

function RepairImage({ url, index, onClick }: { url: string; index: number; onClick: () => void }) {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="aspect-square rounded-xl border bg-muted/30 flex flex-col items-center justify-center p-2 text-center group relative overflow-hidden" title="Imagen no disponible">
                <ImageOff className="w-6 h-6 text-muted-foreground/50 mb-1" />
                <span className="text-[10px] text-muted-foreground/50 font-medium">No disponible</span>
            </div>
        );
    }

    const imgUrl = getImgUrl(url);
    if (!imgUrl) return null;

    return (
        <div
            className="group relative aspect-square cursor-pointer rounded-xl overflow-hidden border bg-background hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all shadow-sm"
            onClick={onClick}
        >
            <img
                src={imgUrl}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={() => setError(true)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10" />
            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded z-20">
                {index + 1}
            </div>
        </div>
    );
}

export function RepairDetailsDialog({ repair, isOpen, onClose, currentUserId, onAddPart }: RepairDetailsDialogProps) {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    if (!repair) return null;

    const images = (repair.deviceImages || []).filter(isValidImg);

    const handleImageClick = (index: number) => {
        setViewerIndex(index);
        setViewerOpen(true);
    };

    const router = useRouter();
    const handleReturnPart = async (partId: string) => {
        if (!currentUserId) return;

        // Simple confirmation via browser native or just toast action (native is safer for destructive)
        if (!confirm("¿Seguro que quieres devolver este repuesto? Se creará una solicitud de devolución y se eliminará de esta reparación.")) {
            return;
        }

        const toastId = toast.loading("Procesando devolución...");

        try {
            const result = await createSinglePartReturnAction(partId, currentUserId);
            if (result.success) {
                toast.success("Repuesto devuelto y solicitud creada.", { id: toastId });
                router.refresh();
                // We keep dialog open, but data refreshes
            } else {
                toast.error(result.error || "Error al devolver.", { id: toastId });
            }
        } catch (error) {
            toast.error("Error de conexión.", { id: toastId });
        }
    };

    const colorClass = statusColorMap[repair.status.color] || "bg-gray-100 text-gray-800";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-4xl p-0 overflow-hidden flex flex-col h-[95dvh] sm:h-auto">
                    {/* Header with Solid Color Background */}
                    <DialogHeader className={`p-5 sm:p-7 border-b shrink-0 relative overflow-hidden ${repair.isWet ? "bg-blue-600" : "bg-slate-900"}`}>
                        <div className="absolute inset-0 bg-grid-white/[0.05] pointer-events-none" />
                        <div className="flex items-center justify-between gap-4 w-full relative z-10">
                            <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <DialogTitle className="text-xl sm:text-3xl font-black tracking-tighter text-white uppercase italic">
                                        Ticket #{repair.ticketNumber}
                                    </DialogTitle>
                                    <Badge className={`font-black border-2 rounded-md px-3 py-1 shadow-lg uppercase text-[10px] sm:text-xs ${colorClass}`}>
                                        {repair.status.name}
                                    </Badge>
                                </div>
                                {repair.branch && (
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70 font-bold uppercase tracking-widest">
                                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                                        <span className="truncate">{repair.branch.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto bg-muted/5 dark:bg-muted/10">
                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

                            {/* Top Stats Row - Vibrant Centered Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                <div className="bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center group hover:border-blue-500 transition-all">
                                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ingreso</span>
                                    </div>
                                    <p className="text-lg font-black text-white">{format(new Date(repair.createdAt), "dd/MM/yy", { locale: es })}</p>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase mt-1 tracking-tighter">{format(new Date(repair.createdAt), "HH:mm", { locale: es })} hs</p>
                                </div>

                                <div className="bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center group hover:border-amber-500 transition-all">
                                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Prometido</span>
                                    </div>
                                    <p className="text-lg font-black text-white">{format(new Date(repair.promisedAt), "dd/MM/yy", { locale: es })}</p>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase mt-1 tracking-tighter">{format(new Date(repair.promisedAt), "HH:mm", { locale: es })} hs</p>
                                </div>

                                <div className="bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center group hover:border-purple-500 transition-all">
                                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                                        <User className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Técnico</span>
                                    </div>
                                    <p className="text-sm font-black text-white uppercase italic leading-tight px-1">
                                        {repair.assignedTo ? repair.assignedTo.name : "SIN ASIGNAR"}
                                    </p>
                                </div>

                                <div className="bg-blue-600 border-2 border-blue-400 p-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                                    <div className="flex items-center gap-2 text-blue-100 mb-2 relative z-10">
                                        <DollarSign className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Presupuesto</span>
                                    </div>
                                    <p className="text-2xl font-black text-white relative z-10 tracking-tighter italic">
                                        {repair.estimatedPrice > 0 ? `$${repair.estimatedPrice.toLocaleString()}` : "A COTIZAR"}
                                    </p>
                                </div>
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                                {/* LEFT COLUMN: Context (Customer + Device) */}
                                <div className="md:col-span-4 space-y-6">
                                    {/* Customer Section - Modern Centered */}
                                    <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center group">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
                                            <User className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Cliente</span>
                                        <p className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-3">
                                            {repair.customer.name}
                                        </p>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
                                            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-sm font-bold text-slate-300">{repair.customer.phone || "Sin teléfono"}</span>
                                        </div>
                                    </div>

                                    {/* Device Section - Modern Centered */}
                                    <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center group">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20">
                                            <Smartphone className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Dispositivo</span>
                                        <p className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">
                                            {repair.deviceBrand}
                                        </p>
                                        <p className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none mt-2">
                                            {repair.deviceModel}
                                        </p>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Core Info (Problem -> Diagnosis -> Images) */}
                                <div className="md:col-span-8 space-y-6">

                                    {/* Status of Work */}
                                    <div className="grid grid-cols-1 gap-6">

                                        {/* Problem */}
                                        <div className="space-y-2">
                                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">PROBLEMA REPORTADO</h3>
                                            <div className="bg-slate-900/80 border-2 border-slate-800 p-5 rounded-2xl shadow-inner">
                                                <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap text-white/90 italic">
                                                    "{repair.problemDescription}"
                                                </p>
                                            </div>
                                        </div>


                                        {/* Diagnosis (Vibrant Container) */}
                                        <div className="space-y-2">
                                            <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] pl-1 flex items-center gap-2">
                                                DIAGNÓSTICO TÉCNICO
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            </h3>
                                            <div className={`
                                                p-6 rounded-2xl border-2 shadow-2xl relative overflow-hidden
                                                ${repair.diagnosis
                                                    ? "bg-blue-600/10 border-blue-500/50"
                                                    : "bg-slate-900/50 border-dashed border-slate-800"
                                                }
                                            `}>
                                                {repair.diagnosis ? (
                                                    <p className="text-base font-black leading-relaxed whitespace-pre-wrap text-white">
                                                        {repair.diagnosis}
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-4 text-center">
                                                        <Clock className="w-8 h-8 text-slate-700 mb-3" />
                                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Esperando reporte...</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Assigned Parts Section */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold text-muted-foreground pl-1 flex items-center gap-2">
                                                    REPUESTOS ASIGNADOS
                                                </h3>
                                                {/* Add Part Button (If active and owned) */}
                                                {onAddPart && repair.assignedUserId === currentUserId && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs gap-1 border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary"
                                                        onClick={onAddPart}
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Agregar Repuesto
                                                    </Button>
                                                )}
                                            </div>

                                            {(!repair.parts || repair.parts.length === 0) && (
                                                <div className="p-4 border border-dashed rounded-xl bg-muted/20 text-center">
                                                    <p className="text-xs text-muted-foreground italic">No hay repuestos asignados a esta reparación.</p>
                                                </div>
                                            )}

                                            {repair.parts && repair.parts.length > 0 && (
                                                <div className="bg-card rounded-xl border shadow-sm divide-y">
                                                    {repair.parts.map((p: any, idx: number) => (
                                                        <div key={idx} className="p-3 flex items-center justify-between text-sm group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                                                                    <span className="font-bold text-xs">R</span>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-foreground truncate">{p.sparePart.name}</p>
                                                                    <p className="text-xs text-muted-foreground font-mono">SKU: {p.sparePart.sku}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-900/10 dark:text-orange-400 whitespace-nowrap">
                                                                    Asignado
                                                                </Badge>

                                                                {/* Return Button */}
                                                                {currentUserId && repair.assignedUserId === currentUserId && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        className="h-7 px-2 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 border-0 shadow-none"
                                                                        onClick={() => handleReturnPart(p.id)}
                                                                        title="Devolver al inventario (Falla/Error)"
                                                                    >
                                                                        <RotateCcw className="w-3 h-3" />
                                                                        Devolver
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>


                                        {/* Images */}
                                        {repair.deviceImages && repair.deviceImages.filter(isValidImg).length > 0 && (
                                            <div className="space-y-2 pt-2">
                                                <h3 className="text-sm font-semibold text-muted-foreground pl-1">EVIDENCIA FOTOGRÁFICA</h3>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                    {repair.deviceImages
                                                        .filter(isValidImg)
                                                        .map((url: string, idx: number) => (
                                                            <RepairImage
                                                                key={idx}
                                                                url={url}
                                                                index={idx}
                                                                onClick={() => handleImageClick(idx)}
                                                            />
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ImagePreviewModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={images}
                currentIndex={viewerIndex}
                onIndexChange={setViewerIndex}
            />
        </>
    );
}
