"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, Smartphone, Monitor, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PosProduct {
    id: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    category?: string;
}

interface PosRepair {
    id: string;
    ticketNumber: string;
    device: string;
    customerName: string;
    price: number;
    status: string;
}

interface PosSearchProps {
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    repairQuery: string;
    setRepairQuery: (v: string) => void;
    isSearching: boolean;
    isSearchingRepairs: boolean;
    cashShift: any;
    repairs: PosRepair[];
    products: PosProduct[];
    bestSellers: PosProduct[];
    onAddRepairToCart: (repair: PosRepair) => void;
    onAddToCartProduct: (product: PosProduct) => void;
    onClearProducts: () => void;
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
    return (
        <div className="flex flex-col gap-6 h-full min-h-0">
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                {/* Product Search */}
                <div className="md:col-span-2 relative group z-20">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                    <div className="relative bg-card/80 backdrop-blur-xl rounded-xl border border-secondary/20 p-4 shadow-lg">
                        <div className="flex justify-between items-center mb-2">
                            <Label htmlFor="product-search-input" className="sr-only">Buscar productos</Label>
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 tracking-wider">
                                <Search className="w-3 h-3" /> Catálogo
                            </h3>
                            {isSearching && <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />}
                        </div>
                        <Input
                            name="product-search"
                            id="product-search-input"
                            aria-label="Buscar producto"
                            placeholder="Buscar producto (Nombre, SKU)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && searchQuery.trim().length >= 2 && products.length > 0) {
                                    // If there's an exact SKU match or just one result, pick it
                                    const exactMatch = products.find(p => p.sku.toLowerCase() === searchQuery.trim().toLowerCase()) || products[0];
                                    if (exactMatch) {
                                        onAddToCartProduct(exactMatch);
                                        setSearchQuery("");
                                        onClearProducts();
                                    }
                                }
                            }}
                            className="bg-background/50 border-primary/20 focus:border-primary/50 text-lg h-12 transition-all hover:bg-background/80"
                            autoFocus
                            disabled={!cashShift}
                        />
                    </div>
                </div>

                {/* Repair Search Input */}
                <div className="relative group z-20">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-cyan-400/30 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
                    <div className="relative bg-card/80 backdrop-blur-xl rounded-xl border border-secondary/20 p-4 shadow-lg h-full flex flex-col justify-start">
                        <div className="flex justify-between items-center mb-2">
                            <Label htmlFor="repair-search-input" className="sr-only">Buscar reparaciones</Label>
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 tracking-wider">
                                <Smartphone className="w-3 h-3" /> Buscar Reparación
                            </h3>
                            {isSearchingRepairs && <span className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />}
                        </div>
                        <Input
                            name="repair-search"
                            id="repair-search-input"
                            aria-label="Buscar reparación"
                            placeholder="Ticket, Nombre, Teléfono..."
                            value={repairQuery}
                            onChange={(e) => {
                                setRepairQuery(e.target.value);
                                if (e.target.value.length >= 2) {
                                    setSearchQuery(""); // Clear product search to switch context
                                    onClearProducts();
                                }
                            }}
                            className="bg-background/50 border-primary/20 h-10 transition-all hover:bg-background/80"
                            disabled={!cashShift}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Products & Repairs Grid */}
            <div className="flex-1 overflow-auto rounded-2xl p-2 -m-2 custom-scrollbar relative">
                {!cashShift ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                    >
                        <div className="relative mb-6">
                            <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                            <div className="relative p-6 bg-zinc-900 border-2 border-emerald-500/30 rounded-full shadow-2xl">
                                <Lock className="w-16 h-16 text-emerald-500" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Caja Cerrada</h2>
                        <p className="text-zinc-400 max-w-xs mb-8 font-medium">
                            Debe abrir la caja registradora para comenzar a buscar productos, realizar ventas o cobrar reparaciones.
                        </p>

                        {/* Note: In a real app we might pass the onUpdateRegister handler here too, 
                            but since it's already in the header, we just point them there or add instructions.
                            Actually, let's keep it simple and just show the message, the header button is now very visible.
                        */}
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 animate-bounce">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-emerald-500/20">
                                <Monitor className="w-4 h-4" />
                            </div>
                            <span className="text-emerald-400 font-bold">Use el botón "Abrir Caja" arriba a la derecha</span>
                        </div>
                    </motion.div>
                ) : repairQuery.length >= 2 ? (
                    /* CASE 1: REPAIR SEARCH ACTIVE */
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                        <AnimatePresence>
                            {repairs.length === 0 && !isSearchingRepairs ? (
                                <div className="col-span-full flex flex-col items-center justify-center p-10 text-muted-foreground opacity-50">
                                    <Search className="w-12 h-12 mb-2" />
                                    <p>No se encontraron reparaciones</p>
                                </div>
                            ) : (
                                repairs.map((repair, i) => (
                                    <motion.div
                                        key={repair.id}
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => onAddRepairToCart(repair)}
                                    >
                                        <Card className="h-full cursor-pointer group hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/10 overflow-hidden bg-card/40 backdrop-blur-sm relative border-white/5">
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                                            <CardContent className="p-4 flex flex-col h-full gap-2">
                                                <div className="flex justify-between items-start">
                                                    <Badge variant="outline" className="text-[10px] tracking-tight backdrop-blur-md bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                        #{repair.ticketNumber}
                                                    </Badge>
                                                    <span className="text-[10px] text-muted-foreground font-mono bg-background/50 px-1 rounded truncate max-w-[80px]">
                                                        {repair.status}
                                                    </span>
                                                </div>

                                                <h3 className="font-medium text-sm text-foreground/90 mt-2 group-hover:text-blue-500 transition-colors line-clamp-1">
                                                    {repair.device}
                                                </h3>
                                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                                    {repair.customerName}
                                                </p>

                                                <div className="pt-2 mt-auto flex items-end justify-between border-t border-border/30">
                                                    <span className="text-xs text-muted-foreground">Total</span>
                                                    <span className="text-lg font-bold text-foreground">
                                                        ${repair.price.toLocaleString()}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                ) : searchQuery.length >= 2 || products.length > 0 ? (
                    /* CASE 2: PRODUCT SEARCH ACTIVE */
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                        <AnimatePresence>
                            {products.length === 0 && !isSearching ? (
                                <div className="col-span-full flex flex-col items-center justify-center p-10 text-muted-foreground opacity-50">
                                    <Search className="w-12 h-12 mb-2" />
                                    <p>No se encontraron productos</p>
                                </div>
                            ) : (
                                products.map((product, i) => (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => onAddToCartProduct(product)}
                                    >
                                        <Card className="h-full cursor-pointer group hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10 overflow-hidden bg-card/40 backdrop-blur-sm relative border-white/5">
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-purple-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                                            <CardContent className="p-4 flex flex-col h-full gap-2">
                                                <div className="flex justify-between items-start">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] tracking-tight backdrop-blur-md",
                                                        product.stock > 0 ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                                    )}>
                                                        STOCK: {product.stock}
                                                    </Badge>
                                                    <span className="text-[9px] text-muted-foreground font-mono bg-background/50 px-1 rounded truncate max-w-[80px]">
                                                        {product.sku}
                                                    </span>
                                                </div>

                                                <h3 className="font-medium text-sm text-foreground/90 mt-2 group-hover:text-primary transition-colors line-clamp-2 min-h-[40px]">
                                                    {product.name}
                                                </h3>

                                                <div className="pt-2 mt-auto flex items-end justify-between border-t border-border/30">
                                                    <span className="text-xs text-muted-foreground">Precio</span>
                                                    <span className="text-lg font-bold text-foreground">
                                                        ${product.price.toLocaleString()}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    /* CASE 3: NO SEARCH -> SHOW BEST SELLERS */
                    <>
                        {bestSellers.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-8 w-1 bg-gradient-to-b from-primary to-purple-500 rounded-full" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Más Vendidos</h3>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                                    <AnimatePresence>
                                        {bestSellers.map((product, i) => (
                                            <motion.div
                                                key={`best-${product.id}`}
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => onAddToCartProduct(product)}
                                            >
                                                <Card className="h-full cursor-pointer group hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10 overflow-hidden bg-card/40 backdrop-blur-sm relative border-white/5">
                                                    <div className="absolute top-0 right-0 p-2 z-10">
                                                        <Badge variant="secondary" className="text-[9px] font-bold bg-amber-500/10 text-amber-500 border-amber-500/20">HOT</Badge>
                                                    </div>
                                                    <CardContent className="p-4 flex flex-col h-full gap-2">
                                                        <div className="flex justify-between items-start mt-4">
                                                            <Badge variant="outline" className={cn(
                                                                "text-[10px] tracking-tight backdrop-blur-md",
                                                                product.stock > 0 ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                                            )}>
                                                                STOCK: {product.stock}
                                                            </Badge>
                                                        </div>
                                                        <h3 className="font-medium text-sm line-clamp-2 flex-grow mt-2 group-hover:text-primary transition-colors">
                                                            {product.name}
                                                        </h3>
                                                        <div className="pt-2 flex items-end justify-between border-t border-border/30 mt-auto">
                                                            <span className="text-xs text-muted-foreground">Precio</span>
                                                            <span className="text-lg font-bold text-foreground">
                                                                ${product.price.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 pt-20"
                            >
                                <Search className="w-20 h-20 mb-4" />
                                <p className="text-xl font-bold">Comienza a buscar...</p>
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
