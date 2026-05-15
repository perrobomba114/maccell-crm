import { getUserData } from "@/actions/get-user";
import { getActiveRepairsAction } from "@/lib/actions/repairs";
import { getTechnicianStats } from "@/actions/dashboard-actions";
import { ActiveRepairsTable } from "@/components/repairs/active-repairs-table";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TechnicianRepairsPage() {
    const user = await getUserData();
    if (!user || user.role !== "TECHNICIAN") redirect("/");

    // Filter by statuses: 2, 3, 4, 7, 8, 9
    // And ensure assigned to current user!
    const [allRepairs, stats] = await Promise.all([
        getActiveRepairsAction(user.branch?.id || "", [2, 3, 4, 7, 8, 9]),
        getTechnicianStats(user.id)
    ]);

    const repairs = allRepairs.filter((r: { assignedUserId?: string | null, statusId: number }) =>
        r.assignedUserId === user.id ||
        (r.statusId === 2 && !r.assignedUserId)
    );

    return (
        <div className="space-y-6 pb-24">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500">
                                <Wrench className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Reparaciones en Curso</h2>
                                <p className="text-sm text-muted-foreground">
                                    Gestioná tus reparaciones activas y cambiá sus estados.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex flex-col items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Finalizados Hoy</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black tabular-nums leading-none">{stats?.completedToday || 0}</span>
                                    <span className="text-[10px] font-bold opacity-70 uppercase">Units</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 border border-orange-400/30">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Ingresos Globales</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black tabular-nums leading-none">{stats?.globalPendingCount || 0}</span>
                                    <span className="text-[10px] font-bold opacity-70 uppercase">Pend</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-5 sm:p-6">
                    <ActiveRepairsTable
                        repairs={repairs}
                        currentUserId={user.id}
                        enableTakeover={false}
                        enableManagement={true}
                        showIssueSummary={true}
                    />
                </div>
            </section>
        </div>
    );
}
