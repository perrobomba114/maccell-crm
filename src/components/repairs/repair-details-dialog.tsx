"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Image, Smartphone, User, Calendar, DollarSign, FileText, Clock, ImageOff } from "lucide-react";
import { useState } from "react";
import { ImagePreviewModal } from "./image-preview-modal";

interface RepairDetailsDialogProps {
    repair: any;
    isOpen: boolean;
    onClose: () => void;
}

const statusColorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
    green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    amber: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    slate: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
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

    return (
        <div
            className="group relative aspect-square cursor-pointer rounded-xl overflow-hidden border bg-background hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all shadow-sm"
            onClick={onClick}
        >
            <img
                src={url}
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

export function RepairDetailsDialog({ repair, isOpen, onClose }: RepairDetailsDialogProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    if (!repair) return null;

    const colorClass = statusColorMap[repair.status.color] || "bg-gray-100 text-gray-800";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                    {/* Header Sticky */}
                    <DialogHeader className="p-6 pb-4 border-b bg-background sticky top-0 z-10 flex flex-row items-start justify-between">
                        <div className="flex items-start justify-between gap-4 w-full">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <DialogTitle className="text-2xl font-bold tracking-tight">
                                        Ticket #{repair.ticketNumber}
                                    </DialogTitle>
                                    <Badge variant="secondary" className={`font-semibold border rounded-full px-3 ${colorClass}`}>
                                        {repair.status.name}
                                    </Badge>
                                </div>
                                {repair.branch && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <span>{repair.branch.name}</span>
                                    </div>
                                )}
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <span className="sr-only">Cerrar</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x w-5 h-5 text-muted-foreground"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                    </DialogHeader>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto bg-muted/5 dark:bg-muted/10">
                        <div className="p-6 space-y-6">

                            {/* Top Stats Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col justify-between hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Ingreso</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">{format(new Date(repair.createdAt), "dd/MM/yy", { locale: es })}</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(repair.createdAt), "HH:mm", { locale: es })} hs</p>
                                    </div>
                                </div>

                                <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col justify-between hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Prometido</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">{format(new Date(repair.promisedAt), "dd/MM/yy", { locale: es })}</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(repair.promisedAt), "HH:mm", { locale: es })} hs</p>
                                    </div>
                                </div>

                                <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col justify-between hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                        <User className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Técnico</span>
                                    </div>
                                    <p className="text-sm font-medium truncate">
                                        {repair.assignedTo ? repair.assignedTo.name : "Sin asignar"}
                                    </p>
                                </div>

                                <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col justify-between hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                        <DollarSign className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Presupuesto</span>
                                    </div>
                                    <p className="text-lg font-bold text-primary">
                                        {repair.estimatedPrice > 0 ? `$${repair.estimatedPrice.toLocaleString()}` : "A cotizar"}
                                    </p>
                                </div>
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                                {/* LEFT COLUMN: Context (Customer + Device) */}
                                <div className="md:col-span-4 space-y-6">
                                    {/* Customer Section */}
                                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                                        <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-2">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <h3 className="font-semibold text-sm">Cliente</h3>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div>
                                                <p className="text-lg font-bold text-foreground">{repair.customer.name}</p>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Smartphone className="w-3.5 h-3.5" />
                                                    <span>{repair.customer.phone || "Sin teléfono"}</span>
                                                </div>
                                                {repair.customer.email && (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span className="truncate">{repair.customer.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Device Section */}
                                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                                        <div className="bg-muted/30 px-4 py-3 border-b flex items-center gap-2">
                                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                                            <h3 className="font-semibold text-sm">Dispositivo</h3>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-lg font-bold mb-1">{repair.deviceBrand}</p>
                                            <p className="text-md text-muted-foreground">{repair.deviceModel}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Core Info (Problem -> Diagnosis -> Images) */}
                                <div className="md:col-span-8 space-y-6">

                                    {/* Status of Work */}
                                    <div className="grid grid-cols-1 gap-6">

                                        {/* Problem */}
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-semibold text-muted-foreground pl-1">PROBLEMA REPORTADO</h3>
                                            <div className="bg-card p-4 rounded-xl border shadow-sm">
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                                    {repair.problemDescription}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Diagnosis (Highlighted) */}
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 pl-1 flex items-center gap-2">
                                                DIAGNÓSTICO TÉCNICO
                                                {repair.diagnosis ? <Clock className="w-3 h-3" /> : null}
                                            </h3>
                                            <div className={`
                                                p-5 rounded-xl border shadow-sm relative overflow-hidden
                                                ${repair.diagnosis
                                                    ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                                                    : "bg-muted/30 border-dashed border-muted-foreground/30"
                                                }
                                            `}>
                                                {repair.diagnosis ? (
                                                    <div className="relative z-10">
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground font-medium">
                                                            {repair.diagnosis}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                                        <div className="rounded-full bg-muted p-3 mb-2">
                                                            <Clock className="w-5 h-5 text-muted-foreground" />
                                                        </div>
                                                        <p className="text-sm font-medium text-muted-foreground">Sin diagnóstico registrado</p>
                                                        <p className="text-xs text-muted-foreground/70 mt-1">El técnico aún no ha cargado observaciones.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Images */}
                                        {repair.deviceImages && repair.deviceImages.filter((img: string) => img && img.includes('/')).length > 0 && (
                                            <div className="space-y-2 pt-2">
                                                <h3 className="text-sm font-semibold text-muted-foreground pl-1">EVIDENCIA FOTOGRÁFICA</h3>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                    {repair.deviceImages
                                                        .filter((url: string) => url && url.includes('/'))
                                                        .map((url: string, idx: number) => (
                                                            <RepairImage
                                                                key={idx}
                                                                url={url}
                                                                index={idx}
                                                                onClick={() => setPreviewImage(url)}
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
                isOpen={!!previewImage}
                onClose={() => setPreviewImage(null)}
                imageUrl={previewImage}
            />
        </>
    );
}
