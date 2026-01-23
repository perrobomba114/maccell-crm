import { getCurrentUser } from "@/actions/auth-actions";
import { getVendorStats } from "@/actions/dashboard-actions";
import { UnifiedVendorDashboard } from "@/components/vendor/dashboard/UnifiedVendorDashboard";

export default async function VendorDashboardPage() {
    const user = await getCurrentUser();
    if (!user) return null;

    const stats = await getVendorStats(user.id, user.branch?.id!);

    return <UnifiedVendorDashboard stats={stats} user={user} />;
}
