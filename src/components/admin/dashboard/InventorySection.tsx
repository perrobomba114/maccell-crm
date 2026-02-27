"use client";

import { AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { BranchStockHealthChart } from "@/components/admin/dashboard/BranchCharts";
import { ReplenishmentTable } from "@/components/admin/dashboard/ReplenishmentTable";

// Re-using the inline definitions from UnifiedDashboard (StockAlertsWidget, PartsTable)
// Ideally these should be their own files, but for now defining them here to complete the extraction.

function StockAlertsWidget({ alerts, health }: any) {
    return (
        <div className="bg-[#09090b] rounded-3xl p-7 border border-zinc-900 shadow-2xl h-[580px] flex flex-col overflow-hidden relative group">
            {/* Ambient Red Glow for warnings */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-red-500/10 transition-all duration-1000" />

            <div className="mb-8 flex justify-between items-center z-10 relative">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/20">
                            <AlertTriangle className="text-red-400" size={18} />
                        </div>
                        <h3 className="font-black text-xl text-white tracking-tight uppercase italic">
                            Alertas Críticas
                        </h3>
                    </div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-10">Stock por Agotarse</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 custom-scrollbar z-10 relative">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-12">
                        <CheckCircle2 className="mb-2 opacity-10 text-emerald-500" size={48} />
                        <p className="text-sm font-medium">Inventario Protegido</p>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-700 mt-1">Sin quiebres de stock</p>
                    </div>
                ) : (
                    alerts.slice(0, 15).map((item: any, i: number) => {
                        const isCritical = item.quantity <= 1;
                        const accentColor = isCritical ? "text-red-500" : "text-orange-500";
                        const bgColor = isCritical ? "bg-red-500" : "bg-orange-500";
                        const ringColor = isCritical ? "ring-red-500/20" : "ring-orange-500/20";

                        return (
                            <div key={i} className={cn(
                                "group/item relative p-3 rounded-2xl border-2 transition-all duration-500",
                                isCritical
                                    ? "bg-red-500/[0.03] border-red-500/10 hover:border-red-500/20"
                                    : "bg-orange-500/[0.03] border-orange-500/10 hover:border-orange-500/20"
                            )}>
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-zinc-200 group-hover/item:text-white transition-colors leading-snug tracking-tight">
                                            {item.productName}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-black text-zinc-500 uppercase tracking-wider">
                                                {item.branchName}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "shrink-0 px-3 py-2 rounded-xl border-2 flex flex-col items-center justify-center min-w-[50px] shadow-2xl transition-transform duration-500 group-hover/item:scale-105",
                                        isCritical ? "bg-red-950/30 border-red-500/30" : "bg-orange-950/30 border-orange-500/30"
                                    )}>
                                        <span className={cn("text-lg font-black leading-none tabular-nums", accentColor)}>
                                            {item.quantity}
                                        </span>
                                        <span className="text-[8px] font-black uppercase tracking-tighter text-zinc-500 mt-0.5">unid.</span>
                                    </div>
                                </div>

                                {/* Progress track */}
                                <div className="h-1.5 w-full bg-zinc-900/50 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-1000", bgColor)}
                                        style={{ width: `${Math.max(8, (item.quantity / 5) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function PartsTable({ parts }: any) {
    const maxUsage = parts.length > 0 ? parts[0].usage : 1;

    return (
        <div className="bg-[#09090b] rounded-3xl p-7 border border-zinc-900 shadow-2xl h-[580px] flex flex-col overflow-hidden relative group">
            {/* Soft Ambient Glow */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-cyan-500/10 transition-all duration-1000" />

            <div className="mb-8 flex justify-between items-center z-10 relative">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20">
                            <Package className="text-cyan-400" size={18} />
                        </div>
                        <h3 className="font-black text-xl text-white tracking-tight uppercase italic">
                            Top Repuestos
                        </h3>
                    </div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-10">Mayor Rotación en Taller</p>
                </div>
                <div className="bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Análisis de Uso
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-5 scrollbar-thin scrollbar-thumb-zinc-800 custom-scrollbar z-10 relative">
                {parts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-12">
                        <Package className="mb-2 opacity-10" size={48} />
                        <p className="text-sm font-medium">Sin datos de uso</p>
                    </div>
                ) : (
                    parts.slice(0, 10).map((p: any, i: number) => {
                        const percent = (p.usage / maxUsage) * 100;
                        const isLowStock = p.stock <= 2;

                        return (
                            <div key={i} className="group/item relative">
                                <div className="flex justify-between items-start mb-2.5">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        {/* Rank Badge with metallic feel */}
                                        <div className={cn(
                                            "w-9 h-9 flex items-center justify-center rounded-xl font-black text-sm border-2 shadow-lg transition-transform duration-500 group-hover/item:scale-110",
                                            i === 0 ? "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 border-yellow-400/30 text-white shadow-yellow-500/10" :
                                                i === 1 ? "bg-gradient-to-br from-zinc-300 via-zinc-400 to-zinc-500 border-zinc-200/20 text-white" :
                                                    i === 2 ? "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 border-orange-400/20 text-white" :
                                                        "bg-zinc-900 border-zinc-800 text-zinc-500"
                                        )}>
                                            {i + 1}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-zinc-200 group-hover/item:text-white transition-colors leading-tight">
                                                {p.name}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn(
                                                    "text-[9px] font-black px-1.5 py-0.5 rounded-sm flex items-center gap-1 uppercase tracking-tighter",
                                                    isLowStock ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                )}>
                                                    Stock: {p.stock} {isLowStock && "¡CRÍTICO!"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-lg font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-md">
                                            {p.usage}
                                        </div>
                                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">Salidas</span>
                                    </div>
                                </div>

                                {/* Modern Progress Bar */}
                                <div className="h-2 w-full bg-zinc-900/50 rounded-full overflow-hidden border border-white/5 relative">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-[1.5s] ease-out"
                                        style={{ width: `${percent}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/10 opacity-50 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

interface InventorySectionProps {
    stats: any;
    branchStats?: any;
    productStats?: any;
}

export function InventorySection({ stats, branchStats, productStats }: InventorySectionProps) {
    if (!stats) return null;
    const { stock, repairs } = stats;

    return (
        <div className="space-y-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-white">Control de Inventario</h2>
                <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
            </div>

            {/* Stock Audit Health Chart - Integrated with margin */}
            {branchStats && (
                <div className="mb-8">
                    <BranchStockHealthChart data={branchStats.stockHealthStats} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 h-full min-h-[350px]">
                    <StockAlertsWidget alerts={stock.alerts} health={stock.health} />
                </div>
                <div className="col-span-1 h-full min-h-[350px]">
                    <PartsTable parts={repairs.frequentParts} />
                </div>
            </div>

            {productStats && productStats.lowStock.length > 0 && (
                <div className="mt-8">
                    <ReplenishmentTable data={productStats.lowStock} />
                </div>
            )}
        </div>
    );
}
