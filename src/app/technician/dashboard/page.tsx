import { getCurrentUser } from "@/actions/auth-actions";
import { getTechnicianStats } from "@/actions/dashboard-actions";
import { TechnicianKPIGrid } from "@/components/technician/dashboard/TechnicianKPIGrid";
import { WeeklyOutputChart, MyStatusPieChart } from "@/components/technician/dashboard/TechnicianCharts";
import { ActiveWorkspaceTable, QueueTable } from "@/components/technician/dashboard/TechnicianTables";

export default async function TechnicianDashboardPage() {
    const user = await getCurrentUser();
    if (!user) return null;

    const stats = await getTechnicianStats(user.id);

    return (
        <div className="space-y-8 container mx-auto p-6 pb-20 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-300 bg-clip-text text-transparent">
                    Panel Técnico
                </h2>
                <p className="text-lg text-muted-foreground">
                    Hola <span className="font-semibold text-foreground">{user.name}</span>, vamos a reparar.
                </p>
            </div>

            {/* 1. KPIs */}
            <section>
                <TechnicianKPIGrid stats={stats} />
            </section>

            {/* 2. Active Workspace (Critical Focus) */}
            <section>
                <ActiveWorkspaceTable data={stats.activeWorkspace} />
            </section>

            {/* 3. Queue & Analytics */}
            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <QueueTable data={stats.queue} />
                <div className="col-span-4 lg:col-span-2 grid gap-6">
                    <WeeklyOutputChart data={stats.weeklyOutput} />
                    {/* <MyStatusPieChart data={stats.statusDistribution} /> */}
                </div>
            </section>
        </div>
    );
}
