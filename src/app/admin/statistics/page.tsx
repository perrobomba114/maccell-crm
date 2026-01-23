import { getBranchesList, getBranchStats, getGlobalStats, getProductStats, getRepairStats } from "@/actions/statistics-actions";
import { UnifiedStatisticsDashboard } from "@/components/admin/statistics/UnifiedStatisticsDashboard";

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
        <UnifiedStatisticsDashboard
            globalStats={globalStats}
            branchStats={branchStats}
            productStats={productStats}
            repairStats={repairStats}
            branches={branches}
            currentBranchId={branchId}
        />
    );
}
