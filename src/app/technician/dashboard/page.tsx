import { getCurrentUser } from "@/actions/auth-actions";
import { getTechnicianStats } from "@/actions/dashboard-actions";
import { UnifiedTechnicianDashboard } from "@/components/technician/dashboard/UnifiedTechnicianDashboard";
import { AutoRefresh } from "@/components/ui/auto-refresh";

export default async function TechnicianDashboardPage() {
    const user = await getCurrentUser();
    if (!user) return null;

    const stats = await getTechnicianStats(user.id);

    return (
        <>
            <UnifiedTechnicianDashboard stats={stats} user={user} />
            <AutoRefresh intervalMs={30000} />
        </>
    );
}
