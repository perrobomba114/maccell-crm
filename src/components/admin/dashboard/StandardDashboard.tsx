"use client";

import React from "react";
import { BranchFilter } from "@/components/admin/statistics/BranchFilter";
import { KPIStats } from "@/components/admin/statistics/KPIStats";
// Will create these next
import { DashboardCharts } from "./DashboardCharts";
import { DashboardTables } from "./DashboardTables";

interface StandardDashboardProps {
    stats: any; // We'll type this properly
    branches: { id: string; name: string }[];
    currentBranchId?: string;
    currentUser: { name: string | null };
}

export function StandardDashboard({ stats, branches, currentBranchId, currentUser }: StandardDashboardProps) {
    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Bienvenido de nuevo, {currentUser.name}. Resumen de operaciones.
                    </p>
                </div>
                {/* Branch Filter - Critical functionality */}
                <div className="flex items-center">
                    <BranchFilter branches={branches} currentBranchId={currentBranchId} />
                </div>
            </div>

            {/* KPI Cards section */}
            <KPIStats
                totalSales={stats.totalSales}
                profitThisMonth={stats.totalProfit}
                salesGrowth={stats.salesGrowth}
                phonesInShop={stats.activeRepairsCount}
            />

            {/* Additional Critical Metrics Row (Stock & Technicians Summary if needed) */}
            {/* We will add this to Charts or Tables section for now to keep it clean */}

            {/* Charts Row */}
            <DashboardCharts stats={stats} />

            {/* Data Tables Row */}
            <DashboardTables stats={stats} />

        </div>
    );
}
