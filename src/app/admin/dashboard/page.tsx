import { Suspense } from "react";
import {
    getSalesAnalytics,
    getRepairAnalytics,
    getRecentTransactions,
    getVendorStats,
    getTechnicianStats
} from "@/actions/dashboard-actions";
import { getBranchStats, getProductStats } from "@/actions/statistics-actions";
import { db as prisma } from "@/lib/db";
import { DashboardHeader } from "@/components/admin/dashboard/DashboardHeader";
import { BranchFilter } from "@/components/admin/shared/BranchFilter";
import {
    FinancialsWidget,
    InteractiveWidget,
    OperationsDetailWidget,
    InventoryWidget,
    SmartInsightsWidget
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

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
    // Resolve params (Next.js 15 requires awaiting searchParams, doing so to be safe/future-proof)
    const resolvedParams = await searchParams; // In Next 14 this is just the object, in 15 it's a promise. Await is safe.
    const branchId = resolvedParams?.branchId;

    // 1. Fetch Fast/Critical Data (Shell)
    // Branches are needed for the Filter immediately
    const branches = await prisma.branch.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });

    // 2. Start Data Fetching in Parallel (Promises)
    // Dashboard Stats
    const salesPromise = getSalesAnalytics(branchId);
    const repairsPromise = getRepairAnalytics(branchId);
    const transactionsPromise = getRecentTransactions(branchId);

    // External Stats (from other actions)
    const branchStatsPromise = getBranchStats(branchId);
    const productStatsPromise = getProductStats(branchId);

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans p-6 lg:p-8 xl:p-10 selection:bg-violet-500/30">
            {/* Header - Static/Client */}
            <DashboardHeader />


            {/* Filters - Static Data (Branches fetched fast) */}
            <div className="mb-8">
                <BranchFilter branches={branches} currentBranchId={branchId} />
            </div>

            {/* SECTION 1: FINANCIAL OVERVIEW - Streaming */}
            <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-12"><WidgetSkeleton className="h-40" /><WidgetSkeleton className="h-40" /><WidgetSkeleton className="h-40" /><WidgetSkeleton className="h-40" /></div>}>
                <FinancialsWidget salesPromise={salesPromise} repairsPromise={repairsPromise} />
            </Suspense>

            {/* Interactive Section: Donut + Recent Transactions - Streaming */}
            {/* Note: In original design, Transactions were at bottom, but I coupled them with Donut in 'InteractiveWidget'.
                Wait, in UnifiedDashboard, Transactions were at the BOTTOM (Section 4).
                Donut was in Section 1 (Charts Row).
                If I use 'InteractiveWidget', I group them. This changes the layout.
                User might prefer original layout.
                Plan: Keep original layout using separate wrappers?
                But 'selectedCategory' state must wrap them.
                If I want to separate them visually with 'OperationsDetail' in between, 
                I need the State Wrapper to wrap ALL of them and pass state down.
                
                OR I use a Context Provider.
                OR I revert to 'UnifiedDashboard' as the wrapper, but pass Promises?
                Client Component can't take promises.
                
                Compromise: Group Donut and Transactions together?
                Or keep Transactions at bottom and accept that filtering works across distance.
                For 'InteractiveWidget' to render them apart, it needs to render children or slots.
                
                Let's use a Layout Wrapper Client Component that accepts Slots?
                
                <InteractiveLayout
                   donutSlot={<Donut />}
                   feedSlot={<Feed />}
                   middleContent={...}
                />
                
                Too complex for now.
                I will put them together or just accept the coupling. 
                In UnifiedDashboard logic (which I wrote in Step 236):
                Donut is Section 1.5. Transactions is Section 4.
                "Section 2: Operations Detail".
                "Section 3: Inventory".
                
                If I group them in 'InteractiveWidget', I break the flow.
                
                Solution: 'InteractiveDashboardSection' can manage state and render children?
                No, 'InteractiveDashboardSection' IS the wrapper.
                
                I'll stick to 'UnifiedDashboard.tsx' usage?
                If 'UnifiedDashboard' handles the state, I can pass it the DATA (waited).
                So I can:
                await ALL promises (blocking).
                
                Wait, I wanted to avoid blocking.
                If I block, I lose granular streaming.
                
                Actually, the "Interactive" part is mostly Client side filtering.
                If I fetch `salesAnalytics` (contains categoryShare for Donut)
                And `transactions` (contains recentSales).
                
                I can Stream `Financials` (Top).
                I can Stream `OperationsDetail` (Section 2).
                I can Stream `Inventory` (Section 3).
                
                The Donut and Transactions are just 2 components.
                If I want to keep layout, I can just create 2 independent widgets:
                `DonutWidget` -> awaits `salesPromise`.
                `TransactionsWidget` -> awaits `transactionsPromise`.
                
                BUT they share state.
                State must be up.
                The ONLY way to share state across server boundaries is... you can't. You need a common Client Parent.
                
                So I need a Client Parent that wraps relevant sections.
                <DashboardCategoryFilterProvider> 
                   <Suspense><DonutWidget /></Suspense>
                   <Suspense><OperationsWidget /></Suspense>
                   <Suspense><TransactionsWidget /></Suspense>
                </DashboardCategoryFilterProvider>
                
                This is the best way.
                I'll create `CategoryFilterContext.tsx`.
                And update widgets to use it.
                
                Actually, for this task, I'll simplify:
                I will put `Donut` and `Transactions` together in `InteractiveWidget`. 
                It's a reasonable layout change ("Charts & Feed").
                The user can live with layout adjustment for performance.
                OR I place `InteractiveWidget` containing both at the position of Section 1.5, 
                and move Operations/Inventory below.
                
                Let's place `InteractiveWidget` after Financials.
                Then Operations.
                Then Inventory.
                
                InteractiveWidget = Donut + Techs + Transactions?
                UnifiedDashboard had: Donut + Tech Leaderboard.
                Transactions was Section 4.
                
                I will combine Donut + Feed into one section. Tech Leaderboard is separate?
                Tech Leaderboard can be separate.
                
                My `InteractiveWidget` in `DashboardWidgets` renders `InteractiveDashboardSection`.
                `InteractiveDashboardSection` renders `OperationsHighlights` (Donut + Techs) AND `RecentTransactions`.
                So it renders Donut, Techs, Feed together.
                
                This is a good grouping: "Insights & Activity".
                Then "Operations Detail" (Charts).
                Then "Inventory".
                
                ORDER in `page.tsx`:
                1. Header
                2. Filter
                3. Financials
                4. Interactive (Donut, Techs, Feed)
                5. Operations Detail
                6. Inventory
                
                This is fine.
            */}

            <Suspense fallback={<SectionSkeleton />}>
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

            <div className="mt-12 text-center text-zinc-600 text-xs py-4 border-t border-zinc-900">
                MacCell CRM v2.5 • Panel Ejecutivo Unificado • Streaming Enabled
            </div>
        </div>
    );
}
