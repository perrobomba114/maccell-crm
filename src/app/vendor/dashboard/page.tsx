import { getCurrentUser } from "@/actions/auth-actions";
import { getVendorStats } from "@/actions/dashboard-actions";
import { UnifiedVendorDashboard } from "@/components/vendor/dashboard/UnifiedVendorDashboard";
import { redirect } from "next/navigation";

export default async function VendorDashboardPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    if (!user.branch?.id) {
        return (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
                Tu usuario no tiene una sucursal asignada.
            </div>
        );
    }

    const stats = await getVendorStats(user.id, user.branch.id);

    return <UnifiedVendorDashboard stats={stats} user={user} />;
}
