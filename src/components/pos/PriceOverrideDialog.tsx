"use client";

import { Edit, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";

interface PriceOverrideDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedItem: any | null;
    overridePrice: string;
    setOverridePrice: (v: string) => void;
    overrideReason: string;
    setOverrideReason: (v: string) => void;
    onConfirm: () => void;
}

export function PriceOverrideDialog({
    isOpen,
    onClose,
    selectedItem,
    overridePrice,
    setOverridePrice,
    overrideReason,
    setOverrideReason,
    onConfirm
}: PriceOverrideDialogProps) {
    if (!selectedItem) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl text-white shadow-2xl p-6 gap-6 rounded-3xl">
                <DialogHeader>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mx-auto mb-4 border border-amber-500/20">
                        <Edit className="w-6 h-6 text-amber-500" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-center tracking-tight">Modificar Precio</DialogTitle>
                    <DialogDescription className="text-center text-zinc-400 text-base font-medium">
                        {selectedItem.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="override-price-input" className="text-xs uppercase text-zinc-500 font-bold tracking-wider ml-1">Nuevo Precio Unitario</Label>
                        <div className="relative group">
                            <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-amber-500/70 group-focus-within:text-amber-500 transition-colors" />
                            <Input
                                name="override-price"
                                id="override-price-input"
                                type="number"
                                placeholder="0.00"
                                className="pl-10 h-12 bg-zinc-900/50 border-zinc-800 text-white text-lg font-black focus:border-amber-500/50 focus:ring-amber-500/20 transition-all"
                                value={overridePrice}
                                onChange={(e) => setOverridePrice(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="override-reason-input" className="text-xs uppercase text-zinc-500 font-bold tracking-wider ml-1">Razón del Cambio</Label>
                        <Input
                            name="override-reason"
                            id="override-reason-input"
                            placeholder="Ej: Descuento cliente frecuente..."
                            className="h-12 bg-zinc-900/50 border-zinc-800 text-white focus:border-zinc-700 focus:ring-zinc-700/50 transition-all font-medium"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl font-bold"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/20 rounded-xl font-black uppercase tracking-wide"
                    >
                        Aplicar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
