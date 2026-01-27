import { Suspense } from "react";
import {
    getBranchesList,
    getBranchStats,
    getGlobalStats,
    getProductStats,
    getRepairStats
} from "@/actions/statistics-actions";
import { getRepairAnalytics } from "@/actions/dashboard-actions"; // Cross-import for Unified Tech Logic
import { StatisticsHeader } from "@/components/admin/statistics/StatisticsHeader";
import {
    FinancialsRowWidget,
    BranchProfitWidget,
    MainChartsWidget,
    OperationalRowWidget
} from "@/components/admin/statistics/StatisticsWidgets";
import { Card } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

function SectionSkeleton({ height = "h-[450px]" }: { height?: string }) {
    return <div className={`w-full ${height} bg-[#18181b]/50 rounded-2xl animate-pulse border border-zinc-800/50 mb-8`} />;
}

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ branchId?: string; month?: string; year?: string }> }) {
    const resolvedParams = await searchParams;
    const branchId = resolvedParams.branchId;

    // Parse Date Navigation
    // Parse Date Navigation
    const now = new Date();
    const month = resolvedParams.month !== undefined ? parseInt(resolvedParams.month) : now.getMonth();
    const year = resolvedParams.year !== undefined ? parseInt(resolvedParams.year) : now.getFullYear();
    const reportDate = new Date(year, month, 1);

    // 1. Fast Data (Shell)
    const branches = await getBranchesList();

    // 2. Parallel Promises with Date Filtering
    const globalStatsPromise = getGlobalStats(branchId, reportDate);
    const branchStatsPromise = getBranchStats(branchId, reportDate);
    const productStatsPromise = getProductStats(branchId, reportDate);

    // Legacy repair stats (parts, etc)
    const repairStatsPromise = getRepairStats(branchId, reportDate);

    // NEW: Unified Technician Logic from Dashboard Actions
    const repairsAnalyticsPromise = getRepairAnalytics(branchId, reportDate);

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans p-6 lg:p-8">

            {/* Header (Static) */}
            <StatisticsHeader branches={branches} currentBranchId={branchId} />

            {/* KPI Cards (Streaming) */}
            <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10"><SectionSkeleton height="h-32" /><SectionSkeleton height="h-32" /><SectionSkeleton height="h-32" /><SectionSkeleton height="h-32" /></div>}>
                <FinancialsRowWidget
                    globalStatsPromise={globalStatsPromise}
                    repairStatsPromise={repairStatsPromise}
                />
            </Suspense>

            {/* Main Visuals Grid (Streaming) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
                {/* Revenue Chart */}
                <Suspense fallback={<SectionSkeleton />}>
                    <BranchProfitWidget branchStatsPromise={branchStatsPromise} />
                </Suspense>

                {/* Top Products Chart */}
                <Suspense fallback={<SectionSkeleton />}>
                    <MainChartsWidget
                        branchStatsPromise={branchStatsPromise}
                        productStatsPromise={productStatsPromise}
                        repairStatsPromise={repairStatsPromise}
                    />
                </Suspense>
            </div>

            {/* Operational Tables (Streaming) - Includes Unified Tech Leaderboard */}
            <Suspense fallback={<SectionSkeleton height="h-[350px]" />}>
                <OperationalRowWidget
                    repairStatsPromise={repairStatsPromise}
                    productStatsPromise={productStatsPromise}
                    repairsAnalyticsPromise={repairsAnalyticsPromise}
                />
            </Suspense>

            <div className="text-center text-xs text-zinc-700 pb-10">
                MacCell Analytics • Streaming Enabled
            </div>
        </div>
    );
}
