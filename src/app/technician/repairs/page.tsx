import { getUserData } from "@/actions/get-user";
import { getActiveRepairsAction } from "@/lib/actions/repairs";
import { ActiveRepairsTable } from "@/components/repairs/active-repairs-table";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TechnicianRepairsPage() {
    const user = await getUserData();
    if (!user || user.role !== "TECHNICIAN") redirect("/");

    // Filter by statuses: 2, 3, 4, 7, 8, 9
    // And ensure assigned to current user!
    const allRepairs = await getActiveRepairsAction(user.branch?.id || "", [2, 3, 4, 7, 8, 9]);
    const repairs = allRepairs.filter((r: { assignedUserId?: string | null, statusId: number }) =>
        r.assignedUserId === user.id ||
        (r.statusId === 2 && !r.assignedUserId) // Show unassigned Status 2 repairs
    );

    return (
        <div className="space-y-6 pb-24">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
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
