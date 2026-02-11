"use client";

import { CheckCircle2, Lock, Unlock, ArrowRight, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface RegisterDialogProps {
    isOpen: boolean;
    onClose: () => void;
    modalAction: "OPEN" | "CLOSE";
    amountInput: string;
    setAmountInput: (v: string) => void;
    shiftSummary: any;
    billCounts: Record<number, number>;
    handleBillChange: (denom: number, val: number) => void;
    employeeCount: number;
    setEmployeeCount: (v: number) => void;
    confirmRegisterAction: () => void;
}

export function RegisterDialog({
    isOpen,
    onClose,
    modalAction,
    amountInput,
    setAmountInput,
    shiftSummary,
    billCounts,
    handleBillChange,
    employeeCount,
    setEmployeeCount,
    confirmRegisterAction
}: RegisterDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={cn(
                "w-[95vw] border-zinc-800 bg-zinc-950 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden rounded-3xl",
                modalAction === "CLOSE" ? "sm:max-w-4xl" : "sm:max-w-md"
            )}>
                <DialogHeader className={cn(
                    "p-6 text-white relative h-32 flex flex-col justify-end",
                    modalAction === "OPEN"
                        ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                        : "bg-gradient-to-br from-red-600 to-rose-700"
                )}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        {modalAction === "OPEN" ? <Unlock className="w-32 h-32 -mr-10 -mt-10" /> : <Lock className="w-32 h-32 -mr-10 -mt-10" />}
                    </div>
                    <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                        {modalAction === "OPEN" ? <><Unlock className="w-8 h-8" /> Abrir Caja</> : <><Lock className="w-8 h-8" /> Cerrar Caja</>}
                    </DialogTitle>
                    <DialogDescription className="text-white/80 font-medium">
                        {modalAction === "OPEN" ? "Registre el fondo de caja inicial" : "Realice el conteo final para el cierre del turno"}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6">
                    {modalAction === "CLOSE" ? (
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Left: Bill Counter */}
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                                    {[20000, 10000, 2000, 1000, 500, 200, 100].map((denom) => {
                                        const count = billCounts[denom] || 0;
                                        return (
                                            <div key={denom} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border border-border/50 hover:border-primary/30 transition-colors">
                                                <div className="flex items-center gap-3 min-w-[100px]">
                                                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold text-xs ring-1 ring-green-500/20">
                                                        $
                                                    </div>
                                                    <span className="font-mono font-bold text-sm">${denom.toLocaleString()}</span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600"
                                                        onClick={() => handleBillChange(denom, Math.max(0, count - 1))}
                                                    >
                                                        -
                                                    </Button>
                                                    <Input
                                                        name={`bill-count-${denom}`}
                                                        id={`bill-count-${denom}`}
                                                        aria-label={`Cantidad de billetes de ${denom}`}
                                                        type="number"
                                                        min="0"
                                                        value={count === 0 ? "" : count}
                                                        placeholder="0"
                                                        className="h-8 w-16 text-center tabular-nums bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary shadow-none font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            handleBillChange(denom, val);
                                                        }}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600"
                                                        onClick={() => handleBillChange(denom, count + 1)}
                                                    >
                                                        +
                                                    </Button>
                                                </div>

                                                <div className="w-24 text-right font-mono text-sm text-muted-foreground">
                                                    ${(count * denom).toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right: Summary */}
                            <div className="w-full md:w-96 flex flex-col gap-4">
                                <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Resumen del Turno</h3>

                                    {shiftSummary && (
                                        <div className="space-y-2 text-sm pb-2 border-b border-border/50">
                                            <div className="flex justify-between font-bold text-base pb-2 text-foreground">
                                                <span>Venta Total</span>
                                                <span>${shiftSummary.totalSales.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Ventas Efectivo</span>
                                                <span className="font-medium">${(shiftSummary.cashSales || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Ventas Tarjeta</span>
                                                <span className="font-medium">${(shiftSummary.cardSales || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Ventas MP</span>
                                                <span className="font-medium">${(shiftSummary.mpSales || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-red-500/80">
                                                <span>Gastos</span>
                                                <span>-${(shiftSummary.expenses || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Bonus Logic */}
                                    <div className="space-y-2 py-2 bg-secondary/20 rounded-lg p-2">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                                Premios ({shiftSummary && shiftSummary.totalSales >= 1200000 ? "2%" : "1%"})
                                            </Label>
                                            {shiftSummary && shiftSummary.totalSales >= 1200000 && (
                                                <Badge variant="default" className="text-[10px] h-4 px-1 bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 border-yellow-500/50">
                                                    BONUS 2%
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <Label htmlFor="employee-count-input" className="text-[10px] text-muted-foreground mb-1 block">Cant. Empleados</Label>
                                                <Input
                                                    name="employee-count"
                                                    id="employee-count-input"
                                                    type="number"
                                                    min="1"
                                                    className="h-8 text-center bg-background"
                                                    value={employeeCount}
                                                    onChange={(e) => setEmployeeCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                />
                                            </div>
                                            <div className="flex-1 text-right">
                                                <div className="text-[10px] text-muted-foreground mb-1">Premio p/emp</div>
                                                <div className="font-mono text-sm font-bold">
                                                    ${shiftSummary ? (shiftSummary.calculatedBonus || 0).toLocaleString() : 0}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm pt-1 border-t border-border/10">
                                            <span className="text-muted-foreground">Total Premios:</span>
                                            <span className="font-bold text-orange-500">
                                                -${shiftSummary ? ((shiftSummary.calculatedBonus || 0) * employeeCount).toLocaleString() : 0}
                                            </span>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>Esperado en Caja</span>
                                        </div>
                                        <div className="flex justify-between text-base font-medium">
                                            <span>Sistema (Neto)</span>
                                            <span>
                                                ${shiftSummary ? (
                                                    shiftSummary.expectedCash - ((shiftSummary.calculatedBonus || 0) * employeeCount)
                                                ).toLocaleString() : 0}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>Contado Real</span>
                                        </div>
                                        <div className="flex justify-between text-2xl font-bold text-primary">
                                            <span>Total</span>
                                            <span>${parseFloat(amountInput?.replace(/\./g, '').replace(',', '.') || "0").toLocaleString('es-AR')}</span>
                                        </div>
                                    </div>

                                    <div className={cn("p-3 rounded-lg flex items-center justify-between text-sm border",
                                        (() => {
                                            const expected = shiftSummary ? (shiftSummary.expectedCash - ((shiftSummary.calculatedBonus || 0) * employeeCount)) : 0;
                                            const currentVal = parseFloat(amountInput?.replace(/\./g, '').replace(',', '.') || "0");
                                            const diff = currentVal - expected;
                                            return Math.abs(diff) < 1
                                                ? "bg-green-500/10 border-green-500/20 text-green-600"
                                                : diff > 0
                                                    ? "bg-blue-500/10 border-blue-500/20 text-blue-600"
                                                    : "bg-red-500/10 border-red-500/20 text-red-600"
                                        })()
                                    )}>
                                        <span className="font-semibold">Diferencia:</span>
                                        <span className="font-mono font-bold">
                                            ${(() => {
                                                const expected = shiftSummary ? (shiftSummary.expectedCash - ((shiftSummary.calculatedBonus || 0) * employeeCount)) : 0;
                                                const currentVal = parseFloat(amountInput?.replace(/\./g, '').replace(',', '.') || "0");
                                                const diff = currentVal - expected;
                                                return diff.toLocaleString('es-AR');
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 p-4">
                            <div className="space-y-4">
                                <Label htmlFor="initial-amount-input" className="text-lg font-bold">Monto Inicial en Efectivo</Label>
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all"></div>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-2xl">$</span>
                                        <Input
                                            name="initial-amount"
                                            id="initial-amount-input"
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                            className="pl-12 text-3xl h-20 font-black tracking-tight bg-background border-2 border-emerald-500/20 focus:border-emerald-500/50 rounded-2xl transition-all"
                                            value={amountInput}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/[^0-9,]/g, '');
                                                const parts = val.split(',');
                                                if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('');
                                                if (parts[0]) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                                setAmountInput(parts.join(','));
                                            }}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <p className="text-sm text-center text-muted-foreground italic font-medium">Ingrese el dinero con el que comienza el turno para abrir la caja.</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-zinc-900/50 sm:justify-between items-center border-t border-white/5">
                    {modalAction === "CLOSE" ? (
                        <div className="text-sm font-bold text-muted-foreground flex items-center bg-zinc-800/50 px-4 py-2 rounded-full border border-white/5">
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                            <span>Verifique los billetes antes de confirmar</span>
                        </div>
                    ) : <div></div>}
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="ghost" onClick={onClose} className="h-12 px-8 font-bold text-zinc-400 hover:text-white transition-colors">Cancelar</Button>
                        <Button
                            onClick={confirmRegisterAction}
                            className={cn(
                                "h-12 px-10 font-bold rounded-xl transition-all hover:scale-105 active:scale-95",
                                modalAction === "CLOSE"
                                    ? "bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-500/20"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20"
                            )}>
                            {modalAction === "OPEN" ? "Abrir Caja" : "Confirmar Cierre"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
