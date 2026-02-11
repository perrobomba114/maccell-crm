"use client";

import { TrendingDown, DollarSign, ArrowRight } from "lucide-react";
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

interface ExpenseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    expenseAmount: string;
    setExpenseAmount: (v: string) => void;
    expenseDescription: string;
    setExpenseDescription: (v: string) => void;
    isSubmittingExpense: boolean;
    onSubmit: () => void;
}

export function ExpenseDialog({
    isOpen,
    onClose,
    expenseAmount,
    setExpenseAmount,
    expenseDescription,
    setExpenseDescription,
    isSubmittingExpense,
    onSubmit
}: ExpenseDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl text-white shadow-2xl p-6 gap-6 rounded-3xl">
                <DialogHeader>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 mx-auto mb-4 border border-orange-500/20">
                        <TrendingDown className="w-6 h-6 text-orange-500" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-center tracking-tight">Registrar Salida</DialogTitle>
                    <DialogDescription className="text-center text-zinc-400 text-base">
                        Registre un gasto en efectivo. Esto se descontará del total en caja.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="expense-amount-input" className="text-xs uppercase text-zinc-500 font-bold tracking-wider ml-1">Monto del Gasto</Label>
                        <div className="relative group">
                            <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-orange-500/70 group-focus-within:text-orange-500 transition-colors" />
                            <Input
                                name="expense-amount"
                                id="expense-amount-input"
                                type="number"
                                placeholder="0.00"
                                className="pl-10 h-12 bg-zinc-900/50 border-zinc-800 text-white text-lg font-bold focus:border-orange-500/50 focus:ring-orange-500/20 transition-all placeholder:text-zinc-600"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="expense-description-input" className="text-xs uppercase text-zinc-500 font-bold tracking-wider ml-1">Concepto / Descripción</Label>
                        <Input
                            name="expense-description"
                            id="expense-description-input"
                            placeholder="Ej: Compra de insumos limpieza..."
                            className="h-12 bg-zinc-900/50 border-zinc-800 text-white focus:border-zinc-700 focus:ring-zinc-700/50 transition-all placeholder:text-zinc-600 font-medium"
                            value={expenseDescription}
                            onChange={(e) => setExpenseDescription(e.target.value)}
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
                        onClick={onSubmit}
                        disabled={isSubmittingExpense}
                        className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-900/20 rounded-xl font-bold tracking-wide"
                    >
                        {isSubmittingExpense ? (
                            <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                        ) : (
                            <>Guardar Gasto <ArrowRight className="ml-2 w-4 h-4 opacity-70" /></>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
