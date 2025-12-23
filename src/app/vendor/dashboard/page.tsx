import { getCurrentUser } from "@/actions/auth-actions";
import { getVendorStats } from "@/actions/dashboard-actions";
import { VendorKPIGrid } from "@/components/vendor/dashboard/VendorKPIGrid";
import { SalesWeekChart } from "@/components/vendor/dashboard/VendorCharts";
import { BestSellersChart } from "@/components/vendor/dashboard/BestSellersChart";
import { ReadyForPickupTable, RecentActivityTable } from "@/components/vendor/dashboard/VendorTables";

export default async function VendorDashboardPage() {
    const user = await getCurrentUser();
    if (!user) return null;

    const stats = await getVendorStats(user.id, user.branch?.id!);

    return (
        <div className="space-y-8 container mx-auto p-6 pb-20 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                    Panel Vendedor
                </h2>
                <p className="text-lg text-muted-foreground">
                    Hola <span className="font-semibold text-foreground">{user.name}</span>, ¡a vender y facturar!
                </p>
            </div>

            {/* 1. KPIs */}
            <section>
                <VendorKPIGrid stats={stats} />
            </section>

            {/* 2. Charts & Actions */}
            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Pickup Table - Actionable */}
                <ReadyForPickupTable data={stats.readyForPickup} />

                {/* Best Sellers Chart - 3D Pie */}
                <BestSellersChart data={stats.topSellingProducts} />
            </section>

            {/* 3. Performance & Feed */}
            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <SalesWeekChart data={stats.salesLast7Days} />
                <RecentActivityTable data={stats.recentActivity} />
            </section>
        </div>
    );
}
