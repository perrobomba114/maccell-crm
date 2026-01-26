"use client";

import React, { useState, useEffect } from "react";
import { BranchFilter } from "@/components/admin/dashboard/BranchFilter";
import { SmartInsights } from "@/components/admin/dashboard/SmartInsights";
import { DashboardHeader } from "@/components/admin/dashboard/DashboardHeader";
import { FinancialStats } from "@/components/admin/dashboard/FinancialStats";
import { OperationalHighlights } from "@/components/admin/dashboard/OperationalHighlights";
import { OperationsDetail } from "@/components/admin/dashboard/OperationsDetail";
import { InventorySection } from "@/components/admin/dashboard/InventorySection";
import { RecentTransactions } from "@/components/admin/dashboard/RecentTransactions";
import { ProfitDonut } from "@/components/admin/dashboard/ProfitDonut";
import { TechLeaderboard } from "@/components/admin/dashboard/TechLeaderboard";

// --- Types ---
interface UnifiedDashboardProps {
    stats: any;
    branches: any[];
    currentBranchId?: string;
    currentUser: { name: string | null };
    branchStats?: any;
    productStats?: any;
}

// --- Main Layout ---
export function UnifiedDashboard({ stats, branches, currentBranchId, currentUser, branchStats, productStats }: UnifiedDashboardProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // If stats are missing (e.g. loading or error), we could handle it here, but page usually blocks.
    if (!stats) return null;

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans p-6 lg:p-8 xl:p-10 selection:bg-violet-500/30">

            {/* Header */}
            <DashboardHeader />

            {/* Smart Insights */}
            <div className="mb-8">
                <SmartInsights stats={stats} />
            </div>

            {/* Filters */}
            <div className="mb-8">
                <BranchFilter branches={branches} currentBranchId={currentBranchId} />
            </div>

            {/* SECTION 1: FINANCIAL OVERVIEW */}
            <FinancialStats stats={stats} />

            {/* Charts Row: Profit Distribution & Tech Leaderboard */}
            <OperationalHighlights
                stats={stats}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
            />

            {/* SECTION 2: OPERATIONS DETAIL */}
            <OperationsDetail stats={stats} branchStats={branchStats} />

            {/* SECTION 3: INVENTORY CONTROL */}
            <InventorySection stats={stats} branchStats={branchStats} productStats={productStats} />

            {/* SECTION 4: RECENT TRANSACTIONS */}
            <RecentTransactions stats={stats} selectedCategory={selectedCategory} />

            <div className="mt-12 text-center text-zinc-600 text-xs py-4 border-t border-zinc-900">
                MacCell CRM v2.5 • Panel Ejecutivo Unificado
            </div>
        </div >
    );
}
