"use client";

import { AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { BranchStockHealthChart } from "@/components/admin/dashboard/BranchCharts";
import { ReplenishmentTable } from "@/components/admin/dashboard/ReplenishmentTable";

// Re-using the inline definitions from UnifiedDashboard (StockAlertsWidget, PartsTable)
// Ideally these should be their own files, but for now defining them here to complete the extraction.

function StockAlertsWidget({ alerts, health }: any) {
    return (
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-bold text-lg text-white mb-1">Alertas Criticas</h3>
                    <p className="text-sm text-zinc-500">Stock por agotarse</p>
                </div>
                <div className="bg-red-500/10 p-2 rounded-lg text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <AlertTriangle size={18} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 custom-scrollbar max-h-[350px]">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3 py-10">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
                            <CheckCircle2 size={24} />
                        </div>
                        <span className="text-sm font-medium">Inventario Saludable</span>
                    </div>
                ) : (
                    alerts.slice(0, 15).map((item: any, i: number) => {
                        const isCritical = item.quantity <= 1;
                        const colorClass = isCritical ? "bg-red-500" : "bg-orange-500";
                        const textClass = isCritical ? "text-red-500" : "text-orange-500";
                        const borderClass = isCritical ? "border-red-500/20" : "border-orange-500/20";
                        const bgClass = isCritical ? "bg-red-500/5 hover:bg-red-500/10" : "bg-orange-500/5 hover:bg-orange-500/10";

                        return (
                            <div key={i} className={cn(
                                "relative overflow-hidden rounded-xl p-3 border transition-all duration-300 group",
                                borderClass, bgClass
                            )}>
                                <div className="flex justify-between items-start mb-2 relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate max-w-[150px] lg:max-w-[180px]">
                                            {item.productName}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-0.5 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                                            {item.branchName}
                                        </span>
                                    </div>
                                    <div className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-sm", borderClass, "bg-[#18181b]")}>
                                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", colorClass)}></div>
                                        <span className={textClass}>{item.quantity} un.</span>
                                    </div>
                                </div>

                                <div className="h-1 w-full bg-zinc-800/50 rounded-full overflow-hidden mt-1">
                                    <div className={cn("h-full rounded-full w-[15%]", colorClass)}></div>
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
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-white mb-1">Repuestos Top</h3>
                    <p className="text-sm text-zinc-500">Mayor rotación en taller</p>
                </div>
                <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                    <Package size={18} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 max-h-[350px]">
                {parts.slice(0, 10).map((p: any, i: number) => {
                    const percent = (p.usage / maxUsage) * 100;
                    return (
                        <div key={i} className="group">
                            <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={cn(
                                        "w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold border border-zinc-800",
                                        i < 3 ? "bg-zinc-800 text-white" : "bg-transparent text-zinc-500"
                                    )}>
                                        #{i + 1}
                                    </div>
                                    <span className="text-sm text-zinc-300 font-medium truncate group-hover:text-white transition-colors">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-white block">{p.usage}</span>
                                        <span className="text-[9px] text-zinc-500 uppercase">Usados</span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                                <div className="absolute inset-0 bg-zinc-800/30"></div>
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-all duration-1000"
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-end mt-1">
                                <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1",
                                    p.stock <= 2 ? "text-red-400 border-red-500/20 bg-red-500/5" : "text-zinc-500 border-zinc-800 bg-zinc-900"
                                )}>
                                    {p.stock <= 2 ? <AlertTriangle size={8} /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                    Stock: {p.stock}
                                </span>
                            </div>
                        </div>
                    );
                })}
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
