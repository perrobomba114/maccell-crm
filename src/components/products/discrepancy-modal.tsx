"use strict";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportStockDiscrepancy } from "@/lib/actions/stock-actions";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, MinusCircle, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscrepancyModalProps {
    stockId: string;
    productName: string;
    currentQuantity: number;
    userId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function DiscrepancyModal({
    stockId,
    productName,
    currentQuantity,
    userId,
    open,
    onOpenChange,
    onSuccess
}: DiscrepancyModalProps) {
    const [adjustment, setAdjustment] = useState<number | "">("");
    const [isPending, startTransition] = useTransition();

    const handleSubmit = () => {
        const val = Number(adjustment);
        if (!val || val === 0) return;

        startTransition(async () => {
            const result = await reportStockDiscrepancy(stockId, userId, val);
            if (result.success) {
                toast.success("Reporte enviado con éxito");
                onOpenChange(false);
                setAdjustment("");
                onSuccess();
            } else {
                toast.error(result.error || "Error al enviar reporte");
            }
        });
    };

    const val = Number(adjustment) || 0;
    const newStock = currentQuantity + val;
    const isNegative = val < 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden gap-0 border-none shadow-2xl">
                {/* Header with gradient for visual impact */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20 p-6 pb-4 border-b">
                    <DialogHeader className="gap-1">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-red-700 dark:text-red-400">
                            <AlertCircle className="h-5 w-5" />
                            Reportar Discrepancia
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground/90">
                            Notificar al administrador sobre una diferencia en el stock físico.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6 bg-card text-card-foreground">
                    {/* Context Panel */}
                    <div className="bg-muted/40 rounded-lg p-4 border space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto</div>
                        <div className="text-base font-medium truncate" title={productName}>
                            {productName}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            Stock Sistema: <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border">{currentQuantity}</span>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Diferencia encontrada</Label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    {val > 0 ? <PlusCircle className="w-4 h-4 text-green-500" /> : <MinusCircle className="w-4 h-4 text-red-500" />}
                                </div>
                                <Input
                                    type="number"
                                    value={adjustment}
                                    onChange={(e) => setAdjustment(e.target.value === "" ? "" : parseInt(e.target.value))}
                                    placeholder="-1"
                                    className="pl-9 h-11 text-lg font-mono bg-background"
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Usa números negativos ({'-2'}) si falta stock, o positivos ({'+2'}) si sobra.
                            </p>
                        </div>

                        {/* Result Preview */}
                        <div className={cn(
                            "flex items-center justify-between p-3 rounded-lg border text-sm transition-colors",
                            val !== 0
                                ? (isNegative ? "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900" : "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900")
                                : "bg-muted/20 border-transparent"
                        )}>
                            <div className="flex items-center gap-2">
                                <span>Nuevo Stock Estimado:</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono font-bold text-lg">
                                {currentQuantity}
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <span className={val !== 0 ? (isNegative ? "text-red-600" : "text-green-600") : ""}>
                                    {newStock}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 gap-2 bg-card">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
                        Cancelar
                    </Button>
                    <Button
                        variant={val !== 0 ? "destructive" : "secondary"}
                        onClick={handleSubmit}
                        disabled={isPending || val === 0}
                        className={cn("flex-1 font-semibold", val !== 0 && "shadow-md")}
                    >
                        {isPending ? "Enviando..." : "Confirmar Reporte"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
