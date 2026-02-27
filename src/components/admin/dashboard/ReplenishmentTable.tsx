"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
    AlertTriangle,
    ShoppingCart,
    Copy,
    CheckCircle2,
    Package,
    ArrowRight,
    ClipboardCheck,
    Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ReplenishmentProps {
    data: {
        name: string;
        branch: string;
        quantity: number;
        suggestedQuantity?: number;
    }[];
}

export function ReplenishmentTable({ data }: ReplenishmentProps) {
    const [copied, setCopied] = useState(false);

    const copyAll = () => {
        const text = data.map(item => `- ${item.name} (${item.branch}): Comprar ${item.suggestedQuantity || 0} un.`).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="border border-zinc-900 bg-[#09090b] shadow-2xl rounded-3xl overflow-hidden relative group">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-orange-500/10 transition-all duration-1000" />

            <CardHeader className="border-b border-zinc-900 pb-6 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/20">
                                <ShoppingCart size={18} className="text-orange-400" />
                            </div>
                            <h3 className="font-black text-xl text-white tracking-tight uppercase italic">
                                Plan de Reposición
                            </h3>
                        </div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-10">Artículos Críticos para Compra</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="bg-orange-500/10 text-orange-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-500/20 uppercase tracking-widest">
                            {data.length} ÍTEMS REQUERIDOS
                        </span>
                        <button
                            onClick={copyAll}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all duration-300 border-2 active:scale-95",
                                copied
                                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                    : "bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30"
                            )}
                        >
                            {copied ? (
                                <><ClipboardCheck size={14} /> Copiado</>
                            ) : (
                                <><Copy size={14} /> Copiar Lista de Compra</>
                            )}
                        </button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 relative z-10">
                <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 custom-scrollbar">
                    {data.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-zinc-600">
                            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                <CheckCircle2 size={32} className="text-emerald-500" />
                            </div>
                            <p className="font-bold text-lg text-zinc-400 uppercase tracking-tight italic">Stock Óptimo</p>
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">No hay órdenes pendientes</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-900">
                            {data.map((item, i) => {
                                return (
                                    <div key={i} className="group/item flex flex-col md:flex-row items-center justify-between p-5 hover:bg-white/[0.02] transition-colors gap-6 md:gap-4">
                                        <div className="flex items-center gap-5 flex-1 min-w-0 w-full">
                                            {/* Status Dot */}
                                            <div className={cn(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-xl",
                                                item.quantity === 0
                                                    ? "bg-red-500/10 border-red-500/20 text-red-500"
                                                    : "bg-orange-500/10 border-orange-500/20 text-orange-400"
                                            )}>
                                                <Package size={20} />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className="bg-zinc-800 border border-zinc-700 rounded-md px-1.5 py-0.5 text-[8px] font-black text-zinc-400 uppercase tracking-[0.1em]">
                                                        GLOBAL (TODAS LAS SEDES)
                                                    </div>
                                                    {item.quantity === 0 && (
                                                        <div className="bg-red-500/20 text-red-500 rounded px-1.5 py-0.5 text-[8px] font-black uppercase flex items-center gap-1">
                                                            <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                                                            QUIEBRE TOTAL
                                                        </div>
                                                    )}
                                                </div>
                                                <h4 className="font-black text-sm text-zinc-200 group-hover/item:text-white transition-colors tracking-tight line-clamp-2">
                                                    {item.name}
                                                </h4>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-zinc-900 pt-4 md:pt-0">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Stock Global</span>
                                                <span className="text-sm font-bold text-zinc-300 tabular-nums bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
                                                    {item.quantity}
                                                </span>
                                            </div>

                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1 italic">Para Comprar</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 rounded-full bg-orange-500/20 items-center justify-center text-orange-400 border border-orange-500/20">
                                                        <Truck size={14} />
                                                    </div>
                                                    <span className="text-xl font-black text-white tabular-nums">
                                                        {item.suggestedQuantity || 0}
                                                    </span>
                                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter">unids.</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => navigator.clipboard.writeText(`${item.name}: Comprar ${item.suggestedQuantity || 0} un. (Stock Global: ${item.quantity})`)}
                                                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-95 group/btn"
                                            >
                                                <Copy size={16} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>

            <div className="bg-zinc-950/50 p-4 border-t border-zinc-950 flex justify-between items-center relative z-10">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">
                    Logística de Reposición Inteligente
                </p>
                <div className="flex items-center gap-2 text-orange-500/40 opacity-50">
                    <Truck size={12} />
                    <span className="text-[8px] font-black uppercase">Frecuencia Semanal</span>
                </div>
            </div>
        </Card>
    );
}
