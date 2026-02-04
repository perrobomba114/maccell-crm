"use client";

import Link from "next/link";
import { BranchFilter } from "@/components/admin/shared/BranchFilter";
import { MonthNavigator } from "./MonthNavigator";

interface StatisticsHeaderProps {
    branches: any[];
    currentBranchId?: string;
}

export function StatisticsHeader({ branches, currentBranchId }: StatisticsHeaderProps) {
    // Get current branch label
    const currentBranchName = currentBranchId
        ? branches.find(b => b.id === currentBranchId)?.name
        : "Todas las Sucursales";

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-zinc-900/80 pb-8 px-1">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Centro de Estadísticas</h1>
                <div className="mt-4">
                    <MonthNavigator />
                </div>
            </div>

            {/* Unified Filter */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider hidden md:block">Filtrar por:</span>
                <BranchFilter branches={branches} currentBranchId={currentBranchId} />
            </div>
        </div>
    );
}
