"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Image, Smartphone, User, Calendar, DollarSign, FileText, Clock } from "lucide-react";
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

export function RepairDetailsDialog({ repair, isOpen, onClose }: RepairDetailsDialogProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    if (!repair) return null;

    const colorClass = statusColorMap[repair.status.color] || "bg-gray-100 text-gray-800";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between mr-8">
                            <DialogTitle className="flex items-center gap-2 text-2xl">
                                <span>#{repair.ticketNumber}</span>
                                <Badge variant="outline" className={`font-bold border ${colorClass}`}>
                                    {repair.status.name}
                                </Badge>
                            </DialogTitle>
                            {repair.branch && (
                                <span className="text-sm text-muted-foreground mr-2">
                                    {repair.branch.name}
                                </span>
                            )}
                        </div>
                        <DialogDescription>
                            Detalles completos de la reparación.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Status & Timing Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg border">
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> CREADO
                                </span>
                                <p className="text-sm font-medium">{format(new Date(repair.createdAt), "dd/MM/yy HH:mm", { locale: es })}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> PROMETIDO
                                </span>
                                <p className="text-sm font-medium">{format(new Date(repair.promisedAt), "dd/MM/yy HH:mm", { locale: es })}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> PRECIO EST.
                                </span>
                                <p className="text-sm font-medium">
                                    {repair.estimatedPrice > 0 ? `$${repair.estimatedPrice.toLocaleString()}` : "-"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <User className="w-3 h-3" /> TÉCNICO
                                </span>
                                <p className="text-sm font-medium">
                                    {repair.assignedTo ? repair.assignedTo.name : "Sin asignar"}
                                </p>
                            </div>
                        </div>

                        {/* Customer & Device */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="border rounded-lg p-4 space-y-3">
                                <h3 className="font-semibold flex items-center gap-2 text-primary">
                                    <User className="w-4 h-4" /> Cliente
                                </h3>
                                <div className="space-y-1">
                                    <p className="text-lg font-medium">{repair.customer.name}</p>
                                    <p className="text-muted-foreground">{repair.customer.phone || "Sin teléfono"}</p>
                                    {repair.customer.email && <p className="text-sm text-muted-foreground">{repair.customer.email}</p>}
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 space-y-3">
                                <h3 className="font-semibold flex items-center gap-2 text-primary">
                                    <Smartphone className="w-4 h-4" /> Dispositivo
                                </h3>
                                <div className="space-y-1">
                                    <p className="text-lg font-medium">{repair.deviceBrand} {repair.deviceModel}</p>
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-semibold">Contraseña:</span> {repair.devicePassword || "No registrada"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-semibold">Serial/IMEI:</span> {repair.serialNumber || "No registrado"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Problem & Notes */}
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2 text-primary">
                                <FileText className="w-4 h-4" /> Descripción del Problema
                            </h3>
                            <div className="bg-muted/30 p-4 rounded-lg border">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{repair.problemDescription}</p>
                            </div>
                        </div>

                        {repair.technicalNotes && (
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2 text-primary">
                                    <FileText className="w-4 h-4" /> Diagnóstico / Notas Técnicas
                                </h3>
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{repair.technicalNotes}</p>
                                </div>
                            </div>
                        )}

                        {/* Images */}
                        {repair.deviceImages && repair.deviceImages.filter((img: string) => img && img.includes('/')).length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2 text-primary">
                                    <Image className="w-4 h-4" /> Evidencia Fotográfica
                                </h3>
                                <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
                                    <div className="flex gap-3 flex-wrap">
                                        {repair.deviceImages
                                            .filter((url: string) => url && url.includes('/'))
                                            .map((url: string, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="relative h-24 w-24 flex-shrink-0 cursor-pointer rounded-md overflow-hidden border bg-white hover:opacity-90 transition-opacity shadow-sm"
                                                    onClick={() => setPreviewImage(url)}
                                                    title="Ver imagen completa"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={url}
                                                        alt={`Foto ${idx + 1}`}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            const parent = target.parentElement;
                                                            if (parent) parent.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}
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
