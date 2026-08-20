"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Smartphone,
    User,
    Calendar,
    DollarSign,
    Clock,
    ImageOff,
    Plus,
    RotateCcw,
    MessageSquare,
    Wrench,
    MapPin,
    AlertTriangle,
    CheckCircle2,
    Phone,
    FileText,
    Shield,
    Camera,
    Sparkles
} from "lucide-react";
import { useState } from "react";
import { ImagePreviewModal } from "./image-preview-modal";
import { cn, getImgUrl, isValidImg } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createSinglePartReturnAction } from "@/lib/actions/repairs";
import { useRouter } from "next/navigation";
import type { RepairAccessType } from "@/lib/repairs/intake";
import { RepairDetailsReception } from "./repair-details-reception";

type RepairStatusColor = string | null;
type RepairUserRole = "ADMIN" | "VENDOR" | "TECHNICIAN";

type RepairStatusSummary = {
    name: string;
    color: RepairStatusColor;
};

type RepairStatusHistoryItem = {
    createdAt: Date | string;
    userId?: string | null;
    fromStatus?: { name: string } | null;
    toStatus: RepairStatusSummary;
    user?: { name: string; role?: RepairUserRole | string } | null;
};

type RepairObservationItem = {
    content: string;
    createdAt: Date | string;
    user?: { name: string } | null;
};

type RepairPartItem = {
    id: string;
    sparePart: {
        name: string;
        sku: string;
    };
};

export type RepairDetails = {
    id: string;
    ticketNumber: string;
    createdAt: Date | string;
    promisedAt: Date | string;
    assignedUserId?: string | null;
    deviceBrand: string;
    deviceModel: string;
    problemDescription: string;
    diagnosis?: string | null;
    estimatedPrice?: number | null;
    deviceImages?: string[];
    isWet?: boolean;
    isWarranty?: boolean;
    accessType?: RepairAccessType | null;
    accessCredential?: string | null;
    hasSimCard?: boolean | null;
    hasMemoryCard?: boolean | null;
    customer: {
        name: string;
        phone?: string | null;
    };
    branch?: { name: string } | null;
    status: RepairStatusSummary;
    assignedTo?: { name: string } | null;
    originalRepair?: {
        id?: string;
        ticketNumber: string;
        problemDescription: string;
        assignedTo?: { name?: string | null } | null;
        statusHistory?: {
            user?: { name?: string | null; role?: string | null } | null;
        }[];
    } | null;
    warrantyRepairs?: {
        id: string;
        ticketNumber: string;
        problemDescription: string;
    }[];
    parts?: RepairPartItem[];
    observations?: RepairObservationItem[];
    statusHistory?: RepairStatusHistoryItem[];
};

interface RepairDetailsDialogProps {
    repair: RepairDetails | null;
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: string;
    onAddPart?: () => void;
    onOpenRepair?: (repairId: string) => void;
}

const statusColorMap: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: "bg-blue-500/15", border: "border-blue-500/40", text: "text-blue-400" },
    indigo: { bg: "bg-indigo-500/15", border: "border-indigo-500/40", text: "text-indigo-400" },
    yellow: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400" },
    gray: { bg: "bg-slate-500/15", border: "border-slate-500/40", text: "text-slate-400" },
    green: { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400" },
    red: { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400" },
    purple: { bg: "bg-purple-500/15", border: "border-purple-500/40", text: "text-purple-400" },
    orange: { bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-400" },
    amber: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400" },
    slate: { bg: "bg-slate-500/15", border: "border-slate-500/40", text: "text-slate-400" },
};

function RepairImage({ url, index, onClick }: { url: string; index: number; onClick: () => void }) {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="aspect-square rounded-xl border border-slate-800 bg-slate-900 flex flex-col items-center justify-center p-2 text-center" title="Imagen no disponible">
                <ImageOff className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[9px] text-slate-500 font-bold">No disponible</span>
            </div>
        );
    }

    const imgUrl = getImgUrl(url);
    if (!imgUrl) return null;

    return (
        <div
            className="group relative aspect-square cursor-pointer rounded-xl overflow-hidden border border-slate-800 bg-slate-950 hover:border-blue-500 transition-all shadow-md"
            onClick={onClick}
        >
            <img
                src={imgUrl}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setError(true)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-10" />
            <div className="absolute bottom-1.5 right-1.5 bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-slate-200 text-[10px] font-black px-1.5 py-0.5 rounded-md z-20">
                #{index + 1}
            </div>
        </div>
    );
}

export function RepairDetailsDialog({ repair, isOpen, onClose, currentUserId, onAddPart, onOpenRepair }: RepairDetailsDialogProps) {
    const router = useRouter();
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    if (!repair) return null;

    const images = (repair.deviceImages ?? []).filter(isValidImg);
    const chronologicalHistory = [...(repair.statusHistory ?? [])].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );

    const promisedDate = repair.promisedAt ? new Date(repair.promisedAt) : null;
    const isOverdue = promisedDate ? promisedDate < new Date() : false;

    const handleImageClick = (index: number) => {
        setViewerIndex(index);
        setViewerOpen(true);
    };

    const handleReturnPart = async (partId: string) => {
        if (!currentUserId) return;

        if (!confirm("¿Seguro que quieres devolver este repuesto? Se creará una solicitud de devolución y se eliminará de esta reparación.")) {
            return;
        }

        const toastId = toast.loading("Procesando devolución...");

        try {
            const result = await createSinglePartReturnAction(partId, currentUserId);
            if (result.success) {
                toast.success("Repuesto devuelto y solicitud creada.", { id: toastId });
                router.refresh();
            } else {
                toast.error(result.error || "Error al devolver.", { id: toastId });
            }
        } catch (error) {
            toast.error("Error de conexión.", { id: toastId });
        }
    };

    const statusStyle = statusColorMap[repair.status.color ?? ""] || { bg: "bg-slate-500/15", border: "border-slate-500/40", text: "text-slate-300" };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
                <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-0 border border-slate-800/90 bg-slate-950 shadow-2xl rounded-2xl sm:max-w-[min(1100px,calc(100vw-2rem))] custom-scrollbar">
                    
                    {/* Header: Dark Glassmorphic with Ticket, Status & Branch */}
                    <DialogHeader className={cn(
                        "relative shrink-0 overflow-hidden border-b border-slate-800 p-5 sm:p-6 text-left",
                        repair.isWet 
                            ? "bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950" 
                            : "bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950"
                    )}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full relative z-10">
                            
                            <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <DialogTitle className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-white">
                                        Ticket #{repair.ticketNumber}
                                    </DialogTitle>

                                    <Badge className={cn("font-black border rounded-lg px-2.5 py-0.5 text-[10px] uppercase shadow-sm", statusStyle.bg, statusStyle.border, statusStyle.text)}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                                        {repair.status.name}
                                    </Badge>

                                    {repair.isWet && (
                                        <Badge className="bg-blue-600/20 border border-blue-400/50 text-blue-300 font-black text-[9px] uppercase">
                                            💧 Mojado
                                        </Badge>
                                    )}

                                    {repair.isWarranty && (
                                        <Badge className="bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-[9px] uppercase">
                                            🛡️ Garantía
                                        </Badge>
                                    )}
                                </div>

                                {repair.branch && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                        <span>{repair.branch.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Device & Client quick tags */}
                            <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs shadow-inner">
                                    <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span className="font-bold text-white uppercase italic truncate max-w-[170px]">
                                        {repair.deviceBrand} {repair.deviceModel}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs shadow-inner">
                                    <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="font-bold text-emerald-300 uppercase truncate max-w-[150px]">
                                        {repair.customer.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Scrollable Content */}
                    <div className="p-4 sm:p-6 space-y-4">

                        {/* 1. Top 4 KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            
                            {/* Ingreso */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center shadow-inner space-y-1">
                                <div className="flex items-center justify-center gap-1.5 text-blue-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Ingreso</span>
                                </div>
                                <p className="text-sm sm:text-base font-black text-white">{format(new Date(repair.createdAt), "dd/MM/yy", { locale: es })}</p>
                                <p className="text-[10px] font-bold text-slate-500 font-mono">{format(new Date(repair.createdAt), "HH:mm", { locale: es })} hs</p>
                            </div>

                            {/* Prometido */}
                            <div className={cn(
                                "border rounded-xl p-3 text-center shadow-inner space-y-1",
                                isOverdue ? "bg-red-950/20 border-red-500/30" : "bg-slate-900/80 border-slate-800"
                            )}>
                                <div className="flex items-center justify-center gap-1.5">
                                    <Clock className={cn("w-3.5 h-3.5", isOverdue ? "text-red-400" : "text-amber-400")} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Prometido</span>
                                    {isOverdue && (
                                        <span className="text-[8px] font-black text-red-400 uppercase tracking-wider bg-red-500/20 px-1.5 py-0.2 rounded border border-red-500/40">
                                            Vencida
                                        </span>
                                    )}
                                </div>
                                <p className={cn("text-sm sm:text-base font-black", isOverdue ? "text-red-300 line-through" : "text-white")}>
                                    {format(new Date(repair.promisedAt), "dd/MM/yy", { locale: es })}
                                </p>
                                <p className="text-[10px] font-bold text-slate-500 font-mono">{format(new Date(repair.promisedAt), "HH:mm", { locale: es })} hs</p>
                            </div>

                            {/* Técnico */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center shadow-inner space-y-1">
                                <div className="flex items-center justify-center gap-1.5 text-purple-400">
                                    <User className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Técnico</span>
                                </div>
                                <p className="text-xs sm:text-sm font-black text-white uppercase italic truncate">
                                    {(() => {
                                        const lastTech = repair.statusHistory?.find((h) => h.user?.role === "TECHNICIAN")?.user;
                                        if (lastTech?.name) return lastTech.name;
                                        const lastUser = repair.statusHistory?.[0]?.user;
                                        if (lastUser?.name) return lastUser.name;
                                        return repair.assignedTo ? repair.assignedTo.name : "Sin Asignar";
                                    })()}
                                </p>
                                <p className="text-[9px] font-bold text-purple-400/80 uppercase">Mesa Técnica</p>
                            </div>

                            {/* Presupuesto */}
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400/40 rounded-xl p-3 text-center shadow-[0_0_18px_rgba(37,99,235,0.2)] space-y-1 text-white">
                                <div className="flex items-center justify-center gap-1.5 text-blue-100">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Presupuesto</span>
                                </div>
                                <p className="text-base sm:text-lg font-black italic tracking-tight">
                                    {(repair.estimatedPrice ?? 0) > 0 ? `$${repair.estimatedPrice?.toLocaleString()}` : "A COTIZAR"}
                                </p>
                                <p className="text-[9px] font-bold text-blue-200/80 uppercase">Estimado</p>
                            </div>
                        </div>

                        {/* 2. Main Content 2-Column Bento Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                            
                            {/* Left Column (5 cols): Cliente, Contacto & Recepción */}
                            <div className="lg:col-span-5 space-y-3">
                                
                                {/* Customer & Contact Card */}
                                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-inner">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <User className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            Cliente y Contacto
                                        </span>
                                    </div>
                                    <div className="space-y-1 pl-5.5">
                                        <p className="text-sm font-black text-white uppercase truncate">
                                            {repair.customer.name}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>{repair.customer.phone || "Sin teléfono registrado"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Reception Summary (Access PIN/Pattern, SIM, Memory, Warranty) */}
                                <RepairDetailsReception
                                    accessType={repair.accessType}
                                    accessCredential={repair.accessCredential}
                                    hasSimCard={repair.hasSimCard}
                                    hasMemoryCard={repair.hasMemoryCard}
                                    isWarranty={repair.isWarranty}
                                    originalRepair={repair.originalRepair}
                                    warrantyRepairs={repair.warrantyRepairs}
                                    onOpenRepair={onOpenRepair}
                                />
                            </div>

                            {/* Right Column (7 cols): Problema, Diagnóstico Técnico, Repuestos & Fotos */}
                            <div className="lg:col-span-7 space-y-3">
                                
                                {/* Problem Description (Seller / Intake) */}
                                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-inner">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            Diagnóstico del Vendedor / Falla Reportada
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-200 italic leading-relaxed pl-3 border-l-2 border-amber-500/40">
                                        {repair.problemDescription || "Sin descripción de falla registrada."}
                                    </p>
                                </div>

                                {/* Technical Diagnosis */}
                                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                                Informe Técnico Realizado
                                            </span>
                                        </div>
                                        {repair.diagnosis && (
                                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                                Registrado
                                            </span>
                                        )}
                                    </div>
                                    {repair.diagnosis ? (
                                        <p className="text-xs sm:text-sm font-bold text-white leading-relaxed pl-3 border-l-2 border-emerald-500/40 whitespace-pre-wrap">
                                            {repair.diagnosis}
                                        </p>
                                    ) : (
                                        <div className="py-2.5 text-center text-xs font-bold text-slate-500 italic">
                                            Esperando informe técnico de cierre...
                                        </div>
                                    )}
                                </div>

                                {/* Assigned Spare Parts */}
                                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            Repuestos Asignados
                                        </span>
                                        {onAddPart && repair.assignedUserId === currentUserId && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs gap-1 border-dashed border-primary/50 text-primary hover:bg-primary/5 rounded-lg"
                                                onClick={onAddPart}
                                            >
                                                <Plus className="w-3 h-3" />
                                                Agregar
                                            </Button>
                                        )}
                                    </div>

                                    {(!repair.parts || repair.parts.length === 0) ? (
                                        <p className="text-xs text-slate-500 italic py-1">No hay repuestos asignados a este ticket.</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {repair.parts.map((p, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs">
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-white truncate">{p.sparePart.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">SKU: {p.sparePart.sku}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[9px] font-bold uppercase">
                                                            Asignado
                                                        </Badge>
                                                        {currentUserId && repair.assignedUserId === currentUserId && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="h-6 px-2 text-[9px] gap-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/50 rounded"
                                                                onClick={() => handleReturnPart(p.id)}
                                                                title="Devolver al inventario"
                                                            >
                                                                <RotateCcw className="w-2.5 h-2.5" />
                                                                Devolver
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Photographic Evidence */}
                                {images.length > 0 && (
                                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-inner">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Camera className="w-3.5 h-3.5 text-cyan-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                Evidencia Fotográfica ({images.length})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                            {images.map((url, idx) => (
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

                        {/* 3. Timeline / Status History & Observations */}
                        {chronologicalHistory.length > 0 && (
                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-inner">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        Historial de Estados
                                    </span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">
                                        Ingreso → Cierre
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                    {chronologicalHistory.map((history, idx) => {
                                        const hStyle = statusColorMap[history.toStatus.color ?? ""] || { bg: "bg-slate-800", border: "border-slate-700", text: "text-white" };
                                        return (
                                            <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-center space-y-1">
                                                <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-slate-500">
                                                    <span>{format(new Date(history.createdAt), "dd/MM")}</span>
                                                    <span>{format(new Date(history.createdAt), "HH:mm")}</span>
                                                </div>
                                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase py-0.5 px-1.5 truncate max-w-full", hStyle.bg, hStyle.border, hStyle.text)}>
                                                    {history.toStatus.name}
                                                </Badge>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                                                    {history.user?.name.split(" ")[0] || (history.userId ? history.userId.slice(-4) : "Sistema")}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 4. Notes / Observations */}
                        {repair.observations && repair.observations.length > 0 && (
                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-inner">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 block">
                                    Notas y Observaciones
                                </span>
                                <div className="grid gap-2">
                                    {repair.observations.map((obs, idx) => (
                                        <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                                            <div className="flex items-center justify-between text-xs text-slate-400">
                                                <span className="font-bold text-slate-300">{obs.user?.name || "Sistema"}</span>
                                                <span className="text-[10px] font-mono text-slate-500">{format(new Date(obs.createdAt), "dd/MM/yy HH:mm")} hs</span>
                                            </div>
                                            <p className="text-xs font-medium text-slate-200 whitespace-pre-wrap">{obs.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
