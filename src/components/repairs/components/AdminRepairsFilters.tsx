"use client";

import { getTodayRepairDateFilter, resolveAdminRepairDateSelection } from "@/lib/admin-repairs-date-filter";
import { Search, Building2, ShieldCheck, ShieldAlert, X, Filter, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReadonlyURLSearchParams } from "next/navigation";
import type { AdminRepairBranch } from "@/types/admin-repairs";

interface AdminRepairsFiltersProps {
    localSearchTerm: string;
    setLocalSearchTerm: (term: string) => void;
    selectedBranchId: string;
    branches: AdminRepairBranch[];
    showOnlyWarranty: boolean;
    setShowOnlyWarranty: (show: boolean) => void;
    updateParams: (updates: Record<string, string | null>) => void;
    searchParams: ReadonlyURLSearchParams;
}

export function AdminRepairsFilters({
    localSearchTerm,
    setLocalSearchTerm,
    selectedBranchId,
    branches,
    showOnlyWarranty,
    setShowOnlyWarranty,
    updateParams,
    searchParams
}: AdminRepairsFiltersProps) {
    const todayStr = getTodayRepairDateFilter();
    const rawDate = searchParams.get('date');
    const searchTerm = localSearchTerm.trim();
    const activeDate = resolveAdminRepairDateSelection(rawDate);
    const isSearchWithoutExplicitDate = searchTerm.length > 0 && !rawDate;
    const hasActiveFilters = searchTerm.length > 0
        || activeDate !== todayStr
        || Boolean(searchParams.get('techId'))
        || selectedBranchId !== "ALL"
        || showOnlyWarranty;

    return (
        <div className="bg-background border rounded-xl p-6 shadow-sm space-y-6">
            {/* Header / Search Area */}
            <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar por ticket, cliente, teléfono, modelo, técnico o falla..."
                        value={localSearchTerm}
                        onChange={(e) => setLocalSearchTerm(e.target.value)}
                        className="pl-10 h-11 bg-muted/30 border-muted-foreground/20 focus:bg-background transition-all"
                    />
                    {isSearchWithoutExplicitDate && (
                        <Badge variant="secondary" className="mt-2 w-fit border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
                            Busca en todas las fechas
                        </Badge>
                    )}
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    {[
                        { label: "Hoy", value: todayStr, active: activeDate === todayStr },
                        { label: "Este Mes", value: "MONTH", active: activeDate === "MONTH" }
                    ].map((period) => (
                        <Button
                            key={period.label}
                            variant={period.active ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateParams({ date: period.value })}
                            className={cn(
                                "h-11 px-4 font-bold flex-1 md:flex-none transition-all",
                                period.active && period.label === "Hoy" && "bg-blue-600 hover:bg-blue-700 text-white shadow-md border-blue-600",
                                period.active && period.label === "Este Mes" && "bg-purple-600 hover:bg-purple-700 text-white shadow-md border-purple-600"
                            )}
                        >
                            {period.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 border-t">
                {/* Branch Selection */}
                <div className="lg:col-span-9 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <Building2 className="h-3.5 w-3.5" />
                        Filtrar por Sucursal
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={selectedBranchId === "ALL" ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateParams({ branch: "ALL" })}
                            className={cn(
                                "h-10 px-4 font-bold transition-all border-2",
                                selectedBranchId === "ALL" 
                                    ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-md" 
                                    : "text-muted-foreground border-dashed hover:border-solid"
                            )}
                        >
                            Todas
                        </Button>
                        {branches
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                            .map((b, index) => {
                                const isSelected = selectedBranchId === b.id;
                                const colors = [
                                    "border-orange-500/30 text-orange-600 bg-orange-50/50 hover:bg-orange-100",
                                    "border-blue-500/30 text-blue-600 bg-blue-50/50 hover:bg-blue-100",
                                    "border-green-500/30 text-green-600 bg-green-50/50 hover:bg-green-100",
                                    "border-purple-500/30 text-purple-600 bg-purple-50/50 hover:bg-purple-100",
                                    "border-pink-500/30 text-pink-600 bg-pink-50/50 hover:bg-pink-100",
                                    "border-cyan-500/30 text-cyan-600 bg-cyan-50/50 hover:bg-cyan-100",
                                ];
                                const activeColors = [
                                    "bg-orange-600 text-white border-orange-600 shadow-sm",
                                    "bg-blue-600 text-white border-blue-600 shadow-sm",
                                    "bg-green-600 text-white border-green-600 shadow-sm",
                                    "bg-purple-600 text-white border-purple-600 shadow-sm",
                                    "bg-pink-600 text-white border-pink-600 shadow-sm",
                                    "bg-cyan-600 text-white border-cyan-600 shadow-sm",
                                ];
                                
                                return (
                                    <Button
                                        key={b.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateParams({ branch: b.id })}
                                        className={cn(
                                            "h-10 px-4 font-bold transition-all border",
                                            isSelected ? activeColors[index % activeColors.length] : colors[index % colors.length]
                                        )}
                                    >
                                        {b.name}
                                    </Button>
                                );
                            })}
                    </div>
                </div>

                {/* Special Filters */}
                <div className="lg:col-span-3 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <Filter className="h-3.5 w-3.5" />
                        Opciones
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button
                            variant={showOnlyWarranty ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowOnlyWarranty(!showOnlyWarranty)}
                            className={cn(
                                "h-10 font-bold justify-start gap-2",
                                showOnlyWarranty ? "bg-yellow-500 hover:bg-yellow-600 text-white shadow-md border-yellow-600" : "text-yellow-600 border-yellow-500/30 hover:bg-yellow-50"
                            )}
                        >
                            {showOnlyWarranty ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                            Solo Garantías
                        </Button>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setLocalSearchTerm("");
                                    updateParams({ q: null, date: todayStr, techId: null, tech: null, warranty: null, branch: "ALL" });
                                }}
                                className="h-10 text-red-500 hover:text-red-600 hover:bg-red-50 font-bold justify-start gap-2"
                            >
                                <X className="h-4 w-4" />
                                Limpiar Filtros
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Active Tech Indicator */}
            {searchParams.get('techId') && (
                <div className="pt-4 border-t flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Técnico:</span>
                    <Badge variant="secondary" className="px-3 py-1.5 text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center gap-2">
                        <Smartphone className="h-3.5 w-3.5" />
                        {searchParams.get('tech')?.toUpperCase()}
                        <X className="h-3 w-3 cursor-pointer hover:scale-125 transition-transform" onClick={() => updateParams({ techId: null, tech: null })} />
                    </Badge>
                </div>
            )}
        </div>
    );
}
