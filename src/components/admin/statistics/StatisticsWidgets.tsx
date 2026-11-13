import type { getBranchStats, getProductStats, getRepairStats } from "@/actions/statistics-actions";
import type { getRepairAnalytics } from "@/actions/dashboard-actions";
import { GlobalFinancials } from "@/components/admin/statistics/GlobalFinancials";
import { BranchCharts } from "@/components/admin/statistics/BranchCharts";
import { ProductCharts, StockAlertsList, TopPartsList } from "@/components/admin/statistics/ProductCharts";
import { TechLeaderboard } from "@/components/admin/dashboard/TechLeaderboard"; // Reusing Dashboard Component!

// Wrappers for Suspense Streaming

export async function FinancialsRowWidget({ globalStatsPromise }: { globalStatsPromise: ReturnType<typeof import("@/actions/statistics/global").getGlobalStats> }) {
    return <GlobalFinancials globalStats={await globalStatsPromise} />;
}

export async function MainChartsWidget({ productStatsPromise }: { productStatsPromise: ReturnType<typeof getProductStats> }) {
    return <ProductCharts productStats={await productStatsPromise} />;
}

// Separate BranchChart widget because it might be slow or we want granular loading
export async function BranchProfitWidget({ branchStatsPromise }: { branchStatsPromise: ReturnType<typeof getBranchStats> }) {
    const stats = await branchStatsPromise;
    return <BranchCharts branchStats={stats} />;
}


export async function OperationalRowWidget({ repairStatsPromise, productStatsPromise, repairsAnalyticsPromise }: { repairStatsPromise: ReturnType<typeof getRepairStats>, productStatsPromise: ReturnType<typeof getProductStats>, repairsAnalyticsPromise: ReturnType<typeof getRepairAnalytics> }) {
    // Note: We are using repairsAnalyticsPromise (from Dashboard logic) for Tek Leaderboard
    // And repairStatsPromise (from Statistics logic) for Parts List.
    // And productStatsPromise for Stock Alerts.

    const [repairStats, productStats, repairAnalytics] = await Promise.all([repairStatsPromise, productStatsPromise, repairsAnalyticsPromise]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 items-start gap-4 mb-6">

            {/* 1. Tech Leaderboard (Using Unified Dashboard Logic) */}
            <div className="min-w-0">
                <TechLeaderboard technicians={repairAnalytics.repairs.technicians} />
            </div>

            <div className="min-w-0">
                <TopPartsList repairStats={repairStats} />
            </div>

            <div className="min-w-0">
                <StockAlertsList productStats={productStats} />
            </div>
        </div>
    );
}
