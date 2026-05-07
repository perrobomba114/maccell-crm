"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Smartphone, Monitor, X, Edit, CreditCard, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { type CashShiftResult } from "@/lib/actions/cash-register";

interface CartItem {
    uniqueId: string;
    type: "PRODUCT" | "REPAIR";
    id: string;
    name: string;
    details?: string;
    price: number;
    quantity: number;
    maxStock?: number;
    originalPrice?: number;
    priceChangeReason?: string;
}

interface PosCartProps {
    cart: CartItem[];
    cashShift: CashShiftResult | null;
    onUpdateQuantity: (uniqueId: string, delta: number) => void;
    onRemoveFromCart: (uniqueId: string) => void;
    onItemClick: (item: CartItem) => void;
    onCheckoutClick: () => void;
    subtotal: number;
    total: number;
}

export function PosCart({
    cart,
    cashShift,
    onUpdateQuantity,
    onRemoveFromCart,
    onItemClick,
    onCheckoutClick,
    subtotal,
    total
}: PosCartProps) {
    return (
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-emerald-300/20 bg-zinc-950/80 shadow-2xl shadow-black/25 backdrop-blur-2xl lg:w-[22rem] xl:w-[26rem]"
        >
            <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-emerald-300" />
            <div className="flex items-center justify-between border-b border-white/10 bg-emerald-300/5 p-5 pl-6">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg border border-emerald-200/30 bg-emerald-300 text-emerald-950 p-2 shadow-lg shadow-emerald-500/20">
                        <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black tracking-normal text-white">Cobro</h2>
                        <span className="text-xs font-semibold text-zinc-500">{cart.length} items seleccionados</span>
                    </div>
                </div>
                <span className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-normal",
                    cashShift ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-zinc-700 bg-zinc-900 text-zinc-500"
                )}>
                    {cashShift ? "activo" : "bloqueado"}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
                {cart.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-zinc-500">
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6">
                            <ShoppingCart className="h-12 w-12 opacity-50" />
                        </div>
                        <p className="text-sm font-semibold">El carrito está vacío</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {cart.map(item => (
                                <motion.div
                                    key={item.uniqueId}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                    className="group relative flex cursor-pointer gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 transition-all hover:border-cyan-300/30 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-black/10"
                                    onClick={() => onItemClick(item)}
                                >
                                    <div className={cn(
                                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border backdrop-blur-sm",
                                        item.type === "PRODUCT" ? "border-cyan-300/15 bg-cyan-300/10 text-cyan-200" : "border-blue-300/15 bg-blue-300/10 text-blue-200"
                                    )}>
                                        {item.type === "PRODUCT" ? <Monitor className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                                    </div>

                                    <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                                        <div>
                                            <h4 className="truncate pr-6 text-sm font-bold text-zinc-100">{item.name}</h4>
                                            <p className="truncate text-[10px] font-medium text-zinc-500">{item.details}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            {item.type === "PRODUCT" ? (
                                            <div className="flex h-7 items-center rounded-md border border-white/10 bg-black/30">
                                                    <button
                                                        type="button"
                                                        aria-label="Restar unidad"
                                                        className="flex h-7 w-7 items-center justify-center rounded-l-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                                                        onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.uniqueId, -1); }}
                                                    >
                                                        <Minus className="h-3.5 w-3.5" />
                                                    </button>
                                                    <span className="w-8 text-center text-xs font-black tabular-nums text-white">{item.quantity}</span>
                                                    <button
                                                        type="button"
                                                        aria-label="Sumar unidad"
                                                        className="flex h-7 w-7 items-center justify-center rounded-r-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                                                        onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.uniqueId, 1); }}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                            <span className="rounded-md border border-blue-300/20 bg-blue-300/10 px-2 py-0.5 text-[10px] font-black uppercase text-blue-200">Servicio</span>
                                            )}
                                            <span className="font-mono text-sm font-black tabular-nums text-white">
                                                ${(item.price * item.quantity).toFixed(0)}
                                            </span>
                                        </div>
                                        {item.originalPrice && item.originalPrice !== item.price && (
                                            <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-300">
                                                <Edit className="h-3 w-3" />
                                                <span>Modificado: {item.priceChangeReason}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Quitar item"
                                        className="absolute right-2 top-2 z-10 rounded-full p-1.5 text-zinc-500 opacity-0 transition-colors hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveFromCart(item.uniqueId);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <div className="border-t border-white/10 bg-black/30 p-5 backdrop-blur-md">
                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm font-semibold text-zinc-500">
                        <span>Subtotal</span>
                        <span className="tabular-nums">${subtotal.toLocaleString()}</span>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex justify-between items-end">
                        <span className="text-base font-black text-white">Total a cobrar</span>
                        <span className="font-mono text-4xl font-black tracking-normal text-emerald-300 tabular-nums">
                            ${total.toLocaleString('es-AR')}
                        </span>
                    </div>
                </div>

                <Button
                    className="h-14 w-full rounded-lg border-0 bg-emerald-400 text-lg font-black text-emerald-950 shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.01] hover:bg-emerald-300 active:scale-[0.98] disabled:!opacity-100 disabled:bg-zinc-800 disabled:text-zinc-400"
                    size="lg"
                    onClick={onCheckoutClick}
                    disabled={cart.length === 0 || !cashShift}
                >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Confirmar Cobro
                </Button>
            </div>
        </motion.div>
    );
}
