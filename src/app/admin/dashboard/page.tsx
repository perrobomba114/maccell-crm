import { DailyOperations } from "@/components/admin/dashboard/DailyOperations";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth-actions";
import { StatisticsHeader } from "@/components/admin/statistics/StatisticsHeader";
import { reportMonth } from "@/lib/date-utils";
import { Suspense } from "react";
import {
    getSalesAnalytics,
    getRepairAnalytics,
    getRecentTransactions
} from "@/actions/dashboard-actions";
import { getBranchStats, getProductStats } from "@/actions/statistics-actions";
import { db as prisma } from "@/lib/db";
import {
    FinancialsWidget,
    InteractiveWidget,
    OperationsDetailWidget,
    InventoryWidget
} from "@/components/admin/dashboard/DashboardWidgets";
import { Card } from "@/components/ui/card";

// Loading Fallbacks (Basic Skeletons)
function WidgetSkeleton({ className }: { className?: string }) {
    return <Card className={`bg-[#18181b] border-zinc-800 animate-pulse ${className}`} />;
}

function SectionSkeleton({ height = "h-[400px]" }: { height?: string }) {
    return <div className={`w-full ${height} bg-[#18181b]/50 rounded-2xl animate-pulse border border-zinc-800/50 mb-8`} />;
}

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ branchId?: string; month?: string; year?: string }> }) {
    // Resolve params (Next.js 15 requires awaiting searchParams, doing so to be safe/future-proof)
    if ((await getCurrentUser())?.role !== "ADMIN") redirect("/");
    const resolvedParams = await searchParams; // In Next 14 this is just the object, in 15 it's a promise. Await is safe.
    const branchId = resolvedParams?.branchId;
    const date = reportMonth(resolvedParams.month, resolvedParams.year);

    // 1. Fetch Fast/Critical Data (Shell)
    // Branches are needed for the Filter immediately
    const branches = await prisma.branch.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });

    // 2. Start Data Fetching in Parallel (Promises)
    // Dashboard Stats
    const salesPromise = getSalesAnalytics(branchId, date);
    const repairsPromise = getRepairAnalytics(branchId, date);
    const transactionsPromise = getRecentTransactions(branchId, date);

    // External Stats (from other actions)
    const branchStatsPromise = getBranchStats(branchId, date);
    const productStatsPromise = getProductStats(branchId, date);

    return (
        <div className="mx-auto min-h-screen max-w-[100rem] rounded-2xl bg-zinc-950 px-3 py-5 text-zinc-50 sm:p-6 lg:p-8">
            <StatisticsHeader dashboard branches={branches} currentBranchId={branchId} period={date} />

            <Suspense key={branchId || "all"} fallback={<SectionSkeleton height="h-48" />}>
                <DailyOperations period={date} branchId={branchId} />
            </Suspense>

            {/* SECTION 1: FINANCIAL OVERVIEW - Streaming */}
            <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-12"><WidgetSkeleton className="h-40" /><WidgetSkeleton className="h-40" /><WidgetSkeleton className="h-40" /><WidgetSkeleton className="h-40" /></div>}>
                <FinancialsWidget salesPromise={salesPromise} repairsPromise={repairsPromise} />
            </Suspense>

            <Suspense key={`${date.toISOString()}-${branchId ?? "all"}`} fallback={<SectionSkeleton />}>
                <InteractiveWidget
                    salesPromise={salesPromise}
                    repairsPromise={repairsPromise}
                    transactionsPromise={transactionsPromise}
                />
            </Suspense>

            {/* SECTION 2: OPERATIONS DETAIL - Streaming */}
            <Suspense fallback={<SectionSkeleton />}>
                <OperationsDetailWidget repairsPromise={repairsPromise} branchStatsPromise={branchStatsPromise} />
            </Suspense>


            {/* SECTION 3: INVENTORY CONTROL - Streaming */}
            <Suspense fallback={<SectionSkeleton />}>
                <InventoryWidget
                    salesPromise={salesPromise}
                    repairsPromise={repairsPromise}
                    branchStatsPromise={branchStatsPromise}
                    productStatsPromise={productStatsPromise}
                />
            </Suspense>


        </div>
    );
}
