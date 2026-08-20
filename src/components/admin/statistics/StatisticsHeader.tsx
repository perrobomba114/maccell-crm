"use client";

import { BarChart3, Building2, SlidersHorizontal } from "lucide-react";
import { BranchFilter } from "@/components/admin/shared/BranchFilter";
import { MonthNavigator } from "./MonthNavigator";
import { Badge } from "@/components/ui/badge";

interface StatisticsHeaderProps {
    branches: any[];
    currentBranchId?: string;
}

export function StatisticsHeader({ branches, currentBranchId }: StatisticsHeaderProps) {
    const currentBranchName = currentBranchId
        ? branches.find(b => b.id === currentBranchId)?.name
        : "Todas las Sucursales";

    return (
        <div className="mb-8 space-y-5 border-b border-slate-800/80 pb-6 px-1">
            {/* Top Bar: Title & Active Branch Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">
                            Centro de Estadísticas
                        </h1>
                        <p className="text-xs text-slate-400 font-medium">
                            Métricas financieras, operativas y rendimiento por sucursal
                        </p>
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-950 border-slate-800 text-slate-300 font-bold text-xs px-3 py-1 rounded-xl">
                        <Building2 className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                        <span>{currentBranchName}</span>
                    </Badge>
                </div>
            </div>

            {/* Bottom Controls Bar: Mes Selector & Sucursales Filter perfectly aligned */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-2 bg-slate-950/60 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-3 shrink-0">
                    <MonthNavigator />
                </div>

                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider shrink-0 pl-1">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                        <span className="hidden xl:inline">Sucursal:</span>
                    </div>
                    <BranchFilter branches={branches} currentBranchId={currentBranchId} />
                </div>
            </div>
        </div>
    );
}

