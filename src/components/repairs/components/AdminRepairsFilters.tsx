"use client";

import { Search, Building2, ShieldCheck, CheckCircle2, ShieldAlert } from "lucide-react";
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
        <div className="flex flex-col gap-5">
            {/* Search Bar */}
            <div className="relative group w-full max-w-md">
                <Label htmlFor="admin-repairs-search" className="sr-only">Buscar reparaciones</Label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <Input
                    id="admin-repairs-search"
                    name="admin-repairs-search"
                    aria-label="Buscar por ticket, cliente, dispositivo"
                    placeholder="Buscar por ticket, cliente, dispositivo…"
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                    className="pl-10 h-12 text-lg shadow-sm border-muted-foreground/20 focus-visible:ring-offset-2 transition-all duration-200 bg-background/50 backdrop-blur-sm"
                />
            </div>

            {/* Branch Badges */}
            <div className="flex flex-col gap-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" />
                    Filtrar por Sucursal
                </Label>
                <div className="flex flex-wrap gap-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateParams({ branch: "ALL" })}
                        className={cn(
                            "h-9 px-4 transition-all duration-300 font-bold border",
                            selectedBranchId === "ALL"
                                ? "bg-slate-900 text-white border-slate-900 shadow-md hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:border-slate-50 dark:hover:bg-slate-200"
                                : "text-muted-foreground border-dashed hover:border-solid hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                    >
                        Todas
                    </Button>
                    {branches
                        .slice()
                        .sort((a, b) => {
                            const isAMaccell = a.name.toUpperCase().includes("MACCELL");
                            const isBMaccell = b.name.toUpperCase().includes("MACCELL");
                            if (isAMaccell && !isBMaccell) return -1;
                            if (!isAMaccell && isBMaccell) return 1;
                            return a.name.localeCompare(b.name, undefined, { numeric: true });
                        })
                        .map((b, index) => {
                            const colors = [
                                { selected: "bg-orange-600 border-orange-600 text-white shadow-orange-500/20", hover: "text-orange-600 border-orange-200 hover:bg-orange-50" },
                                { selected: "bg-blue-600 border-blue-600 text-white shadow-blue-500/20", hover: "text-blue-600 border-blue-200 hover:bg-blue-50" },
                                { selected: "bg-green-600 border-green-600 text-white shadow-green-500/20", hover: "text-green-600 border-green-200 hover:bg-green-50" },
                                { selected: "bg-purple-600 border-purple-600 text-white shadow-purple-500/20", hover: "text-purple-600 border-purple-200 hover:bg-purple-50" },
                                { selected: "bg-pink-600 border-pink-600 text-white shadow-pink-500/20", hover: "text-pink-600 border-pink-200 hover:bg-pink-50" },
                                { selected: "bg-cyan-600 border-cyan-600 text-white shadow-cyan-500/20", hover: "text-cyan-600 border-cyan-200 hover:bg-cyan-50" },
                                { selected: "bg-red-600 border-red-600 text-white shadow-red-500/20", hover: "text-red-600 border-red-200 hover:bg-red-50" },
                                { selected: "bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/20", hover: "text-indigo-600 border-indigo-200 hover:bg-indigo-50" },
                            ];
                            const style = colors[index % colors.length];
                            const isSelected = selectedBranchId === b.id;

                            return (
                                <Button
                                    key={b.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateParams({ branch: b.id })}
                                    className={cn(
                                        "h-9 px-4 transition-all duration-300 font-bold border",
                                        isSelected
                                            ? cn(style.selected, "shadow-md hover:opacity-90")
                                            : style.hover
                                    )}
                                >
                                    {b.name}
                                </Button>
                            );
                        })}
                </div>
            </div>

            {/* Warranty Filter Toggle */}
            <div className="flex flex-col gap-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Garantías
                </Label>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOnlyWarranty(!showOnlyWarranty)}
                    className={cn(
                        "h-9 px-4 transition-all duration-300 font-bold border w-full sm:w-auto justify-start",
                        showOnlyWarranty
                            ? "bg-yellow-500 text-white border-yellow-600 shadow-md hover:bg-yellow-600"
                            : "text-muted-foreground border-dashed hover:border-solid hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600"
                    )}
                >
                    {showOnlyWarranty ? (
                        <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mostrando Garantías
                        </>
                    ) : (
                        <>
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            Solo Garantías
                        </>
                    )}
                </Button>
            </div>

            {/* Active Tech Filter Badge */}
            {searchParams.get('tech') && (
                <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm font-medium text-muted-foreground">Filtrando por técnico:</span>
                    <Badge variant="secondary" className="px-3 py-1 text-sm font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors" onClick={() => updateParams({ tech: null })}>
                        {searchParams.get('tech')}
                        <span className="sr-only">Quitar filtro</span>
                        <div className="bg-purple-200 dark:bg-purple-800 rounded-full p-0.5 hover:bg-purple-300 dark:hover:bg-purple-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </div>
                    </Badge>
                </div>
            )}
        </div>
    );
}
