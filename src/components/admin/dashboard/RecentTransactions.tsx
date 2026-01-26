"use client";

import { DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function SalesFeedTimeline({ sales, mounted }: { sales: any[], mounted: boolean }) {
    if (!sales || sales.length === 0) {
        return <div className="text-zinc-500 text-sm text-center py-10 bg-zinc-900/30 rounded-xl">Sin actividad reciente</div>;
    }

    return (
        <div className="relative pl-4 border-l border-zinc-800 space-y-8 py-2">
            {sales.map((sale: any, i: number) => (
                <div key={i} className="relative group">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[21px] top-3 w-3 h-3 rounded-full bg-zinc-900 border-2 border-zinc-700 group-hover:border-violet-500 group-hover:bg-violet-500 transition-colors shadow-sm"></div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900 hover:border-violet-500/30 transition-all hover:shadow-lg hover:shadow-violet-500/5">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:bg-violet-500/20 group-hover:text-violet-400 transition-colors">
                                #{sale.saleNumber?.toString().slice(-2) || "??"}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-violet-200 transition-colors">
                                    Venta #{sale.saleNumber}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 group-hover:border-zinc-700">
                                        {sale.branchName}
                                    </span>
                                    <span className="text-[10px] text-zinc-500">
                                        {mounted ? new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-base font-bold text-white block">{fmtMoney(sale.total)}</span>
                            <span className="text-[10px] text-zinc-500">{sale.paymentMethod || 'Efectivo'}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function RecentTransactions({ stats, selectedCategory }: { stats: any, selectedCategory: string | null }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!stats) return null;

    // Filter "Recent Sales" based on selected category
    const recentSales = stats.tables?.recentSales || [];
    const filteredRecentSales = selectedCategory
        ? recentSales.filter((s: any) => s.category === selectedCategory)
        : recentSales;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-white">Últimas Transacciones</h2>
                <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
            </div>

            <div className="grid grid-cols-1">
                {/* Recent Transactions Feed - Full Width for clarity */}
                <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full min-h-[300px]">
                    <div className="mb-6 flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg text-white mb-1">
                                {selectedCategory ? `Ventas: ${selectedCategory}` : "Feed de Ventas"}
                            </h3>
                            <p className="text-sm text-zinc-500">Actividad en tiempo real de todas las sucursales</p>
                        </div>
                        <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                            <DollarSign size={18} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[400px] scrollbar-thin scrollbar-thumb-zinc-800">
                        <SalesFeedTimeline sales={filteredRecentSales} mounted={isMounted} />
                    </div>
                </div>
            </div>
        </div>
    );
}
