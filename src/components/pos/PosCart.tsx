"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Smartphone, Monitor, X, Edit, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
    cashShift: any;
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
            className="w-full md:w-1/3 flex flex-col h-full bg-card/60 backdrop-blur-3xl rounded-3xl border border-secondary/20 shadow-2xl overflow-hidden"
        >
            {/* Cart Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg tracking-tight">Carrito</h2>
                        <span className="text-xs text-muted-foreground font-medium">{cart.length} items seleccionados</span>
                    </div>
                </div>
            </div>

            {/* Cart Items Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                        <div className="p-6 rounded-full bg-muted/10 border border-white/5">
                            <ShoppingCart className="w-12 h-12 opacity-50" />
                        </div>
                        <p className="text-sm">Carrito vacío</p>
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
                                    className="group relative flex gap-3 p-3 rounded-xl bg-background/40 border border-white/5 hover:border-primary/20 hover:bg-background/60 transition-all hover:shadow-lg hover:shadow-black/5 cursor-pointer"
                                    onClick={() => onItemClick(item)}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-sm",
                                        item.type === "PRODUCT" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                                    )}>
                                        {item.type === "PRODUCT" ? <Monitor className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                        <div>
                                            <h4 className="font-medium text-sm truncate pr-6 text-foreground/90">{item.name}</h4>
                                            <p className="text-[10px] text-muted-foreground truncate">{item.details}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            {item.type === "PRODUCT" ? (
                                                <div className="flex items-center bg-background/50 rounded-md border border-white/10 h-6">
                                                    <button
                                                        className="w-6 flex items-center justify-center hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.uniqueId, -1); }}
                                                    >-</button>
                                                    <span className="w-8 text-center text-xs font-medium tabular-nums">{item.quantity}</span>
                                                    <button
                                                        className="w-6 flex items-center justify-center hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.uniqueId, 1); }}
                                                    >+</button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded border border-purple-500/20">Servicio</span>
                                            )}
                                            <span className="font-bold text-sm tabular-nums">
                                                ${(item.price * item.quantity).toFixed(0)}
                                            </span>
                                        </div>
                                        {item.originalPrice && item.originalPrice !== item.price && (
                                            <div className="mt-1 text-[10px] text-amber-500 flex items-center gap-1">
                                                <Edit className="w-3 h-3" />
                                                <span>Modificado: {item.priceChangeReason}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveFromCart(item.uniqueId);
                                        }}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Footer Totals */}
            <div className="p-6 bg-background/40 border-t border-white/5 backdrop-blur-md">
                <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span className="tabular-nums">${subtotal.toLocaleString()}</span>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex justify-between items-end">
                        <span className="text-base font-semibold">Total a Cobrar</span>
                        <span className="text-3xl font-bold text-primary tracking-tight tabular-nums">
                            ${total.toLocaleString('es-AR')}
                        </span>
                    </div>
                </div>

                <Button
                    className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl border-0"
                    size="lg"
                    onClick={onCheckoutClick}
                    disabled={cart.length === 0 || !cashShift}
                >
                    <CreditCard className="mr-2 w-5 h-5" />
                    Confirmar Cobro
                </Button>
            </div>
        </motion.div>
    );
}
