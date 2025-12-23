import { getBranchesList, getBranchStats, getGlobalStats, getProductStats, getRepairStats } from "@/actions/statistics-actions";
import { KPIStats } from "@/components/admin/statistics/KPIStats";
import { BranchProfitChart, TopProductsChart } from "@/components/admin/statistics/StatisticsCharts";
import { PartsUsageTable, ReplenishmentTable, TechnicianTable } from "@/components/admin/statistics/StatisticsTables";
import { BranchFilter } from "../../../components/admin/statistics/BranchFilter";

export const dynamic = 'force-dynamic';

export default async function StatisticsPage(props: { searchParams: Promise<{ branchId?: string }> }) {
    const searchParams = await props.searchParams;
    const branchId = searchParams.branchId;

    // Parallel fetch
    const [branches, globalStats, productStats, branchStats, repairStats] = await Promise.all([
        getBranchesList(),
        getGlobalStats(branchId),
        getProductStats(branchId),
        getBranchStats(branchId),
        getRepairStats(branchId)
    ]);

    return (
        <div className="space-y-8 container mx-auto p-4 pb-20 max-w-7xl">
            {/* Header & Filter */}
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 dark:from-violet-400 dark:via-pink-400 dark:to-orange-400 bg-clip-text text-transparent drop-shadow-sm">
                        Centro de Estadísticas
                    </h2>
                    <p className="text-lg text-muted-foreground mt-1 font-medium">
                        Insights en tiempo real de tu negocio.
                    </p>
                </div>

                {/* Branch Filters (Glass Buttons) */}
                <BranchFilter branches={branches} currentBranchId={branchId} />
            </div>

            {/* 1. KPIs */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <KPIStats
                    totalSales={globalStats.salesThisMonth}
                    profitThisMonth={globalStats.profitThisMonth}
                    salesGrowth={globalStats.growthPercent}
                    phonesInShop={repairStats.phonesInShop}
                />
            </section>

            {/* 2. Charts Row */}
            <section className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                {/* Always show Profit Chart (It adapts if branch is selected to show just that one bar or multiple) */}
                <BranchProfitChart data={branchStats.branchProfits} />
                <TopProductsChart data={productStats.topSelling} />
            </section>

            {/* 3. Detailed Data Tables */}
            <section className="grid gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <div className="md:col-span-1">
                    <TechnicianTable data={repairStats.bestTechnicians} />
                </div>
                <div className="md:col-span-1">
                    <ReplenishmentTable data={productStats.lowStock} />
                </div>
                <div className="md:col-span-1">
                    <PartsUsageTable data={repairStats.mostUsedParts} />
                </div>
            </section>
        </div>
    );
}
