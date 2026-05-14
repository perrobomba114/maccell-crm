"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lock, Monitor, Search, Smartphone, Sparkles } from "lucide-react";
import { type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { type PosProduct, type PosRepair } from "@/lib/actions/pos";
import { type CashShiftResult } from "@/lib/actions/cash-register";
import { PosProductCard, PosRepairCard } from "@/components/pos/PosResultCards";

interface PosSearchProps {
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    repairQuery: string;
    setRepairQuery: (v: string) => void;
    isSearching: boolean;
    isSearchingRepairs: boolean;
    cashShift: CashShiftResult | null;
    repairs: PosRepair[];
    products: PosProduct[];
    bestSellers: PosProduct[];
    onAddRepairToCart: (repair: PosRepair) => void;
    onAddToCartProduct: (product: PosProduct) => void;
    onClearProducts: () => void;
}

function EmptyState({
    icon,
    title,
    description
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-full min-h-[20rem] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center"
        >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-zinc-950 text-zinc-500">
                {icon}
            </div>
            <h3 className="text-lg font-black text-white">{title}</h3>
            <p className="mt-2 max-w-sm text-sm font-medium text-zinc-500">{description}</p>
        </motion.div>
    );
}

export function PosSearch({
    searchQuery,
    setSearchQuery,
    repairQuery,
    setRepairQuery,
    isSearching,
    isSearchingRepairs,
    cashShift,
    repairs,
    products,
    bestSellers,
    onAddRepairToCart,
    onAddToCartProduct,
    onClearProducts
}: PosSearchProps) {
    const isProductMode = searchQuery.length >= 2 || products.length > 0;
    const isRepairMode = repairQuery.length >= 2;

    return (
        <div className="flex shrink-0 flex-col gap-4 lg:h-full lg:min-h-0">
            <motion.div
                initial={{ y: -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]"
            >
                <div className="relative overflow-hidden rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 shadow-xl shadow-black/15">
                    <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-cyan-300" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
                    <div className="mb-3 flex items-center justify-between pl-2">
                        <Label htmlFor="product-search-input" className="flex items-center gap-2 text-xs font-black uppercase tracking-normal text-cyan-100">
                            <Search className="h-4 w-4" />
                            catálogo
                        </Label>
                        {isSearching && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />}
                    </div>
                    <Input
                        name="product-search"
                        id="product-search-input"
                        aria-label="Buscar producto"
                        placeholder="Escaneá SKU o buscá por nombre"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && searchQuery.trim().length >= 2 && products.length > 0) {
                                const exactMatch = products.find((product) => product.sku.toLowerCase() === searchQuery.trim().toLowerCase()) || products[0];
                                onAddToCartProduct(exactMatch);
                                setSearchQuery("");
                                onClearProducts();
                            }
                        }}
                        className="h-14 rounded-lg border-white/10 bg-black/35 px-4 text-lg font-bold text-white shadow-inner shadow-black/20 transition-all placeholder:text-zinc-500 focus:border-cyan-300/50 focus:bg-black/55"
                        autoFocus
                        disabled={!cashShift}
                    />
                </div>

                <div className="relative overflow-hidden rounded-xl border border-blue-300/20 bg-blue-300/10 p-4 shadow-xl shadow-black/15">
                    <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-blue-300" />
                    <div className="mb-3 flex items-center justify-between pl-2">
                        <Label htmlFor="repair-search-input" className="flex items-center gap-2 text-xs font-black uppercase tracking-normal text-blue-100">
                            <Smartphone className="h-4 w-4" />
                            reparación
                        </Label>
                        {isSearchingRepairs && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />}
                    </div>
                    <Input
                        name="repair-search"
                        id="repair-search-input"
                        aria-label="Buscar reparación"
                        placeholder="Ticket, cliente o teléfono"
                        value={repairQuery}
                        onChange={(event) => {
                            setRepairQuery(event.target.value);
                            if (event.target.value.length >= 2) {
                                setSearchQuery("");
                                onClearProducts();
                            }
                        }}
                        className="h-14 rounded-lg border-white/10 bg-black/35 px-4 font-bold text-white shadow-inner shadow-black/20 transition-all placeholder:text-zinc-500 focus:border-blue-300/50 focus:bg-black/55"
                        disabled={!cashShift}
                    />
                </div>
            </motion.div>

            <div className="shrink-0 overflow-visible rounded-xl border border-white/10 bg-zinc-950/80 p-4 shadow-xl shadow-black/20 custom-scrollbar lg:min-h-0 lg:flex-1 lg:overflow-auto">
                {!cashShift ? (
                    <EmptyState
                        icon={<Lock className="h-8 w-8 text-emerald-300" />}
                        title="Abrí la caja para empezar"
                        description="Con la caja abierta se habilitan búsquedas, cobros, transferencias y carga de gastos."
                    />
                ) : isRepairMode ? (
                    <ResultGrid
                        title="Reparaciones listas para cobrar"
                        tone="blue"
                        isEmpty={repairs.length === 0 && !isSearchingRepairs}
                        emptyText="No se encontraron reparaciones para esa búsqueda."
                    >
                        <AnimatePresence>
                            {repairs.map((repair, index) => (
                                <PosRepairCard key={repair.id} repair={repair} index={index} onAdd={onAddRepairToCart} />
                            ))}
                        </AnimatePresence>
                    </ResultGrid>
                ) : isProductMode ? (
                    <ResultGrid
                        title="Resultados del catálogo"
                        tone="cyan"
                        isEmpty={products.length === 0 && !isSearching}
                        emptyText="No se encontraron productos para esa búsqueda."
                    >
                        <AnimatePresence>
                            {products.map((product, index) => (
                                <PosProductCard key={product.id} product={product} index={index} onAdd={onAddToCartProduct} />
                            ))}
                        </AnimatePresence>
                    </ResultGrid>
                ) : bestSellers.length > 0 ? (
                    <ResultGrid title="Atajos de más vendidos" tone="amber" isEmpty={false} emptyText="">
                        <AnimatePresence>
                            {bestSellers.map((product, index) => (
                                <PosProductCard key={`best-${product.id}`} product={product} index={index} variant="best-seller" onAdd={onAddToCartProduct} />
                            ))}
                        </AnimatePresence>
                    </ResultGrid>
                ) : (
                    <EmptyState
                        icon={<Monitor className="h-8 w-8" />}
                        title="Listo para vender"
                        description="Escaneá un SKU, buscá un producto o cargá una reparación desde el campo superior."
                    />
                )}
            </div>
        </div>
    );
}

function ResultGrid({
    title,
    tone,
    isEmpty,
    emptyText,
    children
}: {
    title: string;
    tone: "cyan" | "blue" | "amber";
    isEmpty: boolean;
    emptyText: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
                <span
                    className={cn(
                        "h-9 w-1 rounded-r-full",
                        tone === "cyan" && "bg-cyan-300",
                        tone === "blue" && "bg-blue-300",
                        tone === "amber" && "bg-amber-300"
                    )}
                />
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-normal text-zinc-300">
                    <Sparkles className="h-4 w-4 text-zinc-500" />
                    {title}
                </h3>
            </div>
            {isEmpty ? (
                <EmptyState icon={<Search className="h-8 w-8" />} title="Sin resultados" description={emptyText} />
            ) : (
                <div className="grid grid-cols-1 gap-3 pb-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {children}
                </div>
            )}
        </div>
    );
}
