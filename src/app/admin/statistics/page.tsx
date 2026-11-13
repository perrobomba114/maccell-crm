import { MonthlyReview } from "@/components/admin/statistics/MonthlyReview";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth-actions";
import { reportMonth } from "@/lib/date-utils";
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

export const dynamic = 'force-dynamic';

function SectionSkeleton({ height = "h-[450px]" }: { height?: string }) {
    return <div className={`w-full ${height} bg-[#18181b]/50 rounded-2xl animate-pulse border border-zinc-800/50 mb-8`} />;
}

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ branchId?: string; month?: string; year?: string }> }) {
    if ((await getCurrentUser())?.role !== "ADMIN") redirect("/");
    const resolvedParams = await searchParams;
    const branchId = resolvedParams.branchId;

    const reportDate = reportMonth(resolvedParams.month, resolvedParams.year);

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
        <div className="mx-auto min-h-screen max-w-[100rem] rounded-2xl bg-zinc-950 px-3 py-5 text-zinc-50 sm:p-6 lg:p-8">

            {/* Header (Static) */}
            <StatisticsHeader branches={branches} currentBranchId={branchId} period={reportDate} />

            <Suspense key={`review-${reportDate.toISOString()}-${branchId ?? "all"}`} fallback={<SectionSkeleton height="h-64" />}>
                <MonthlyReview period={reportDate} branchId={branchId} />
            </Suspense>
            <section className="mb-6"><h2 className="text-lg font-bold">Costos de taller y bonos</h2>
            <Suspense key={`financials-${reportDate.toISOString()}`} fallback={<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10"><SectionSkeleton height="h-32" /><SectionSkeleton height="h-32" /><SectionSkeleton height="h-32" /><SectionSkeleton height="h-32" /></div>}>
                <FinancialsRowWidget
                    globalStatsPromise={globalStatsPromise}
                />
            </Suspense>

            </section>
            {/* Main Visuals Grid (Streaming) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
                {/* Revenue Chart */}
                <Suspense key={`revenue-${reportDate.toISOString()}`} fallback={<SectionSkeleton />}>
                    <BranchProfitWidget branchStatsPromise={branchStatsPromise} />
                </Suspense>

                {/* Top Products Chart */}
                <Suspense key={`products-${reportDate.toISOString()}`} fallback={<SectionSkeleton />}>
                    <MainChartsWidget
                        branchStatsPromise={branchStatsPromise}
                        productStatsPromise={productStatsPromise}
                        repairStatsPromise={repairStatsPromise}
                    />
                </Suspense>
            </div>

            {/* Operational Tables (Streaming) - Includes Unified Tech Leaderboard */}
            <Suspense key={`operational-${reportDate.toISOString()}`} fallback={<SectionSkeleton height="h-[350px]" />}>
                <OperationalRowWidget
                    repairStatsPromise={repairStatsPromise}
                    productStatsPromise={productStatsPromise}
                    repairsAnalyticsPromise={repairsAnalyticsPromise}
                />
            </Suspense>


        </div>
    );
}
