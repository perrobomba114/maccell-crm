"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type PosProduct, type PosRepair } from "@/lib/actions/pos";
import { PackageCheck, Smartphone, TrendingUp } from "lucide-react";

type PosProductCardProps = {
    product: PosProduct;
    index: number;
    variant?: "default" | "best-seller";
    onAdd: (product: PosProduct) => void;
};

type PosRepairCardProps = {
    repair: PosRepair;
    index: number;
    onAdd: (repair: PosRepair) => void;
};

const moneyFormatter = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0
});

export function PosProductCard({ product, index, variant = "default", onAdd }: PosProductCardProps) {
    const hasStock = product.stock > 0;

    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.035, 0.24) }}
            onClick={() => onAdd(product)}
            className="group h-full text-left"
        >
            <Card className="relative h-full overflow-hidden rounded-xl border-cyan-300/20 bg-cyan-300/10 shadow-xl shadow-black/15 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/45 hover:bg-cyan-300/15 hover:shadow-cyan-950/30">
                <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-cyan-300" />
                <CardContent className="flex h-full flex-col gap-3 p-4 pl-5">
                    <div className="flex items-start justify-between gap-2">
                        <Badge
                            variant="outline"
                            className={cn(
                                "rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-normal",
                                hasStock
                                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                    : "border-red-400/30 bg-red-500/10 text-red-300"
                            )}
                        >
                            {hasStock ? `${product.stock} en stock` : "sin stock"}
                        </Badge>
                        {variant === "best-seller" ? (
                            <Badge className="rounded-md border border-amber-300/30 bg-amber-300/15 text-[10px] font-black uppercase tracking-normal text-amber-200">
                                <TrendingUp className="mr-1 h-3 w-3" />
                                top
                            </Badge>
                        ) : (
                            <span className="max-w-[7rem] truncate rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-zinc-400">
                                {product.sku}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-1 gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-200/30 bg-cyan-300 text-cyan-950 shadow-lg shadow-cyan-500/15">
                            <PackageCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-100 transition-colors group-hover:text-cyan-100">
                                {product.name}
                            </h3>
                            <p className="mt-1 truncate text-xs text-zinc-500">
                                {product.categoryName || product.sku}
                            </p>
                        </div>
                    </div>

                    <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-3">
                        <span className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Precio</span>
                        <span className="font-mono text-xl font-black tabular-nums text-white">
                            ${moneyFormatter.format(product.price)}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </motion.button>
    );
}

export function PosRepairCard({ repair, index, onAdd }: PosRepairCardProps) {
    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.035, 0.24) }}
            onClick={() => onAdd(repair)}
            className="group h-full text-left"
        >
            <Card className="relative h-full overflow-hidden rounded-xl border-blue-300/20 bg-blue-300/10 shadow-xl shadow-black/15 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/45 hover:bg-blue-300/15 hover:shadow-blue-950/30">
                <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-blue-300" />
                <CardContent className="flex h-full flex-col gap-3 p-4 pl-5">
                    <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="rounded-md border-blue-300/30 bg-blue-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-normal text-blue-200">
                            #{repair.ticketNumber}
                        </Badge>
                        <span className="max-w-[8rem] truncate rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold text-zinc-400">
                            {repair.status}
                        </span>
                    </div>

                    <div className="flex flex-1 gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200/30 bg-blue-300 text-blue-950 shadow-lg shadow-blue-500/15">
                            <Smartphone className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-100 transition-colors group-hover:text-blue-100">
                                {repair.device}
                            </h3>
                            <p className="mt-1 truncate text-xs text-zinc-500">{repair.customerName}</p>
                        </div>
                    </div>

                    <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-3">
                        <span className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Total</span>
                        <span className="font-mono text-xl font-black tabular-nums text-white">
                            ${moneyFormatter.format(repair.price)}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </motion.button>
    );
}
