import { getCurrentUser } from "@/actions/auth-actions";
import { getAdminStats } from "@/actions/dashboard-actions";
import { getBranchStats, getProductStats } from "@/actions/statistics-actions";
import { db } from "@/lib/db";
import { UnifiedDashboard } from "@/components/admin/dashboard/UnifiedDashboard";

interface AdminDashboardProps {
    searchParams: Promise<{
        branchId?: string;
    }>;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardProps) {
    const { branchId } = await searchParams;

    const [user, stats, branches, branchStats, productStats] = await Promise.all([
        getCurrentUser(),
        getAdminStats(branchId),
        db.branch.findMany({ select: { id: true, name: true } }),
        getBranchStats(branchId),
        getProductStats(branchId)
    ]);

    const safeUser = { name: user?.name || "Administrador" };

    return (
        <UnifiedDashboard
            stats={stats}
            branches={branches}
            currentBranchId={branchId}
            currentUser={safeUser}
            branchStats={branchStats}
            productStats={productStats}
        />
    );

}
