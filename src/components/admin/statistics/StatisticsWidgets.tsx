import { Suspense } from "react";
import { StatisticsHeader } from "@/components/admin/statistics/StatisticsHeader";
import { GlobalFinancials } from "@/components/admin/statistics/GlobalFinancials";
import { BranchCharts } from "@/components/admin/statistics/BranchCharts";
import { ProductCharts, StockAlertsList, TopPartsList } from "@/components/admin/statistics/ProductCharts";
import { TechLeaderboard } from "@/components/admin/dashboard/TechLeaderboard"; // Reusing Dashboard Component!

// Wrappers for Suspense Streaming

export async function FinancialsRowWidget({ globalStatsPromise, repairStatsPromise }: { globalStatsPromise: Promise<any>, repairStatsPromise: Promise<any> }) {
    const [globalStats, repairStats] = await Promise.all([globalStatsPromise, repairStatsPromise]);
    return <GlobalFinancials globalStats={globalStats} repairStats={repairStats} />;
}

export async function MainChartsWidget({ branchStatsPromise, productStatsPromise, repairStatsPromise }: { branchStatsPromise: Promise<any>, productStatsPromise: Promise<any>, repairStatsPromise: Promise<any> }) {
    const [branchStats, productStats, repairStats] = await Promise.all([branchStatsPromise, productStatsPromise, repairStatsPromise]);

    return <ProductCharts productStats={productStats} repairStats={repairStats} />;
}

// Separate BranchChart widget because it might be slow or we want granular loading
export async function BranchProfitWidget({ branchStatsPromise }: { branchStatsPromise: Promise<any> }) {
    const stats = await branchStatsPromise;
    return <BranchCharts branchStats={stats} />;
}


export async function OperationalRowWidget({ repairStatsPromise, productStatsPromise, repairsAnalyticsPromise }: { repairStatsPromise: Promise<any>, productStatsPromise: Promise<any>, repairsAnalyticsPromise: Promise<any> }) {
    // Note: We are using repairsAnalyticsPromise (from Dashboard logic) for Tek Leaderboard
    // And repairStatsPromise (from Statistics logic) for Parts List.
    // And productStatsPromise for Stock Alerts.

    const [repairStats, productStats, repairAnalytics] = await Promise.all([repairStatsPromise, productStatsPromise, repairsAnalyticsPromise]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">

            {/* 1. Tech Leaderboard (Using Unified Dashboard Logic) */}
            <div className="bg-[#18181b] rounded-2xl border border-zinc-800 p-6 flex flex-col h-full min-h-[350px]">
                <TechLeaderboard technicians={repairAnalytics.repairs.technicians} />
            </div>

            {/* 2. Stock Alerts */}
            <div className="h-full min-h-[350px]">
                <StockAlertsList productStats={productStats} />
            </div>

            {/* 3. Parts Usage */}
            <div className="h-full min-h-[350px]">
                <TopPartsList repairStats={repairStats} />
            </div>
        </div>
    );
}
