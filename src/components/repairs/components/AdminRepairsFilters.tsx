"use client";

import { getArgentinaDate, TIMEZONE } from "@/lib/date-utils";
import { formatInTimeZone } from "date-fns-tz";

import { Search, Building2, ShieldCheck, CheckCircle2, ShieldAlert, Calendar, X, Filter, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    return (
    const activeDate = searchParams.get('date');
    const todayStr = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");

    return (
        <div className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] space-y-12 relative overflow-hidden group/container">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none group-hover/container:bg-blue-500/15 transition-colors duration-700" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none group-hover/container:bg-purple-500/15 transition-colors duration-700" />

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
                {/* Search Bar Group */}
                <div className="flex-1 space-y-4 max-w-2xl">
                    <Label htmlFor="admin-repairs-search" className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.4em] flex items-center gap-2.5 ml-2">
                        <Search className="h-4 w-4" />
                        Buscador Inteligente
                    </Label>
                    <div className="relative group/search">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-500" />
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within/search:text-primary transition-all duration-300 z-10" />
                        <Input
                            id="admin-repairs-search"
                            placeholder="Ticket, cliente, modelo, IMEI..."
                            value={localSearchTerm}
                            onChange={(e) => setLocalSearchTerm(e.target.value)}
                            className="pl-16 h-18 text-xl font-medium shadow-2xl border-white/10 focus-visible:ring-offset-2 transition-all duration-500 bg-background/60 backdrop-blur-md rounded-2xl relative z-10 hover:bg-background/80"
                        />
                    </div>
                </div>

                {/* Period Controls */}
                <div className="space-y-4 min-w-[340px]">
                    <Label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.4em] flex items-center gap-2.5 ml-2">
                        <Calendar className="h-4 w-4" />
                        Rango Temporal
                    </Label>
                    <div className="flex gap-3">
                        {[
                            { label: "Todo", value: null, active: !activeDate, color: "bg-slate-900" },
                            { label: "Hoy", value: todayStr, active: activeDate === todayStr, color: "bg-blue-600 shadow-blue-500/40" },
                            { label: "Mes", value: "MONTH", active: activeDate === "MONTH", color: "bg-purple-600 shadow-purple-500/40" }
                        ].map((btn) => (
                            <Button
                                key={btn.label}
                                variant="outline"
                                onClick={() => updateParams({ date: btn.value })}
                                className={cn(
                                    "flex-1 h-14 transition-all duration-500 font-black uppercase text-[10px] tracking-[0.2em] border-2 rounded-2xl relative overflow-hidden group/btn",
                                    btn.active
                                        ? cn(btn.color, "text-white border-transparent shadow-2xl scale-105 z-10")
                                        : "text-muted-foreground border-white/10 hover:border-white/20 hover:bg-white/5 bg-background/40"
                                )}
                            >
                                {btn.active && <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50" />}
                                <span className="relative z-10">{btn.label}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pt-10 border-t border-white/5">
                {/* Branch Selection Grid */}
                <div className="lg:col-span-8 space-y-5">
                    <Label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.4em] flex items-center gap-2.5 ml-2">
                        <Building2 className="h-4 w-4" />
                        Sucursales & Sedes
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateParams({ branch: "ALL" })}
                            className={cn(
                                "h-16 transition-all duration-500 font-black border-2 rounded-[1.25rem] text-[11px] uppercase tracking-widest relative group/branch",
                                selectedBranchId === "ALL"
                                    ? "bg-slate-950 text-white border-transparent shadow-[0_15px_30px_rgba(0,0,0,0.3)] dark:bg-white dark:text-slate-950 scale-105 z-10"
                                    : "text-muted-foreground border-white/5 hover:border-white/10 hover:bg-white/5 bg-background/30"
                            )}
                        >
                            {selectedBranchId === "ALL" && <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />}
                            <span className="relative z-10">Todas las Sedes</span>
                        </Button>
                        {branches
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                            .map((b, index) => {
                                const branchColors = [
                                    { dot: "bg-orange-500", shadow: "shadow-orange-500/30", active: "bg-orange-600 border-orange-400", text: "text-orange-500" },
                                    { dot: "bg-blue-500", shadow: "shadow-blue-500/30", active: "bg-blue-600 border-blue-400", text: "text-blue-500" },
                                    { dot: "bg-emerald-500", shadow: "shadow-emerald-500/30", active: "bg-emerald-600 border-emerald-400", text: "text-emerald-500" },
                                    { dot: "bg-purple-500", shadow: "shadow-purple-500/30", active: "bg-purple-600 border-purple-400", text: "text-purple-500" },
                                    { dot: "bg-pink-500", shadow: "shadow-pink-500/30", active: "bg-pink-600 border-pink-400", text: "text-pink-500" },
                                    { dot: "bg-cyan-500", shadow: "shadow-cyan-500/30", active: "bg-cyan-600 border-cyan-400", text: "text-cyan-500" },
                                ];
                                const style = branchColors[index % branchColors.length];
                                const isSelected = selectedBranchId === b.id;

                                return (
                                    <Button
                                        key={b.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateParams({ branch: b.id })}
                                        className={cn(
                                            "h-16 transition-all duration-500 font-black border-2 rounded-[1.25rem] text-[11px] uppercase tracking-widest relative overflow-hidden group/branch",
                                            isSelected
                                                ? cn(style.active, style.shadow, "text-white border-transparent shadow-2xl scale-105 z-10")
                                                : cn(style.text, "border-white/5 bg-background/30 hover:border-white/10 hover:bg-white/5")
                                        )}
                                    >
                                        {isSelected && <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-40" />}
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className={cn("w-2.5 h-2.5 rounded-full ring-4 ring-offset-0 ring-offset-transparent", isSelected ? "bg-white ring-white/20 animate-pulse" : style.dot + " ring-current/10")} />
                                            <span className="truncate">{b.name}</span>
                                        </div>
                                    </Button>
                                );
                            })}
                    </div>
                </div>

                {/* Status / Quick Actions */}
                <div className="lg:col-span-4 space-y-5">
                    <Label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.4em] flex items-center gap-2.5 ml-2">
                        <Filter className="h-4 w-4" />
                        Acciones Rápidas
                    </Label>
                    <div className="flex flex-col gap-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowOnlyWarranty(!showOnlyWarranty)}
                            className={cn(
                                "h-20 w-full px-8 transition-all duration-700 font-black uppercase text-xs tracking-[0.3em] border-2 rounded-[1.5rem] justify-between relative overflow-hidden group/warranty",
                                showOnlyWarranty
                                    ? "bg-yellow-500 text-white border-transparent shadow-[0_20px_40px_rgba(234,179,8,0.3)] scale-[1.02] z-10"
                                    : "text-yellow-600 border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500/30 shadow-sm"
                            )}
                        >
                            {showOnlyWarranty && <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent opacity-50" />}
                            <div className="flex items-center gap-5 relative z-10">
                                <div className={cn("p-3 rounded-2xl transition-colors", showOnlyWarranty ? "bg-white/20" : "bg-yellow-500/10")}>
                                    {showOnlyWarranty ? <ShieldCheck className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
                                </div>
                                <div className="flex flex-col items-start leading-none">
                                    <span>Garantías</span>
                                    <span className="text-[8px] opacity-60 mt-1.5 tracking-[0.1em]">{showOnlyWarranty ? "Filtro Activo" : "Ver Reclamos"}</span>
                                </div>
                            </div>
                            {showOnlyWarranty && <div className="w-3 h-3 rounded-full bg-white animate-bounce shadow-lg" />}
                        </Button>

                        {(searchParams.get('date') || searchParams.get('techId') || (searchParams.get('branch') && searchParams.get('branch') !== "ALL") || showOnlyWarranty) && (
                            <Button
                                variant="ghost"
                                onClick={() => updateParams({ date: null, techId: null, tech: null, warranty: null, branch: "ALL" })}
                                className="h-12 text-red-500/80 hover:text-red-500 hover:bg-red-500/10 font-black uppercase text-[10px] tracking-[0.4em] transition-all group/clear rounded-2xl"
                            >
                                <X className="mr-3 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                                Restablecer Filtros
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Active Tech Indicator */}
            {searchParams.get('techId') && (
                <div className="pt-8 border-t border-white/5 flex items-center gap-5 animate-in slide-in-from-bottom-8 duration-700">
                    <Badge variant="outline" className="px-8 py-4 text-sm font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-[0_10px_30px_rgba(147,51,234,0.3)] flex items-center gap-4 rounded-2xl group/tech-badge">
                        <Smartphone className="h-6 w-6 opacity-80 group-hover/tech-badge:scale-110 transition-transform" />
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] opacity-70 uppercase tracking-widest mb-1">Técnico Seleccionado</span>
                            <span className="text-base tracking-tight">{searchParams.get('tech')?.toUpperCase() || "CARGANDO..."}</span>
                        </div>
                        <button 
                            className="bg-white/20 hover:bg-white/40 rounded-xl p-2 transition-all ml-4 hover:rotate-90"
                            onClick={() => updateParams({ techId: null, tech: null })}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </Badge>
                </div>
            )}
        </div>
    );
}
