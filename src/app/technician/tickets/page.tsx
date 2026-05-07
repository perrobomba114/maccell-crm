
import { db } from "@/lib/db";
import { ActiveRepairsTable } from "@/components/repairs/active-repairs-table";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AvailableWorkPage() {
    const user = await getUserData();

    if (!user || user.role !== "TECHNICIAN") {
        redirect("/");
    }

    // Fetch repairs with statusId = 1 (Pending/Ingresado usually)
    // Ordered by promise date (closest first)
    const repairs = await db.repair.findMany({
        where: {
            statusId: 1,
            branchId: user?.branch?.id || undefined,
        },
        include: {
            customer: true,
            status: true,
            assignedTo: true,
        },
        orderBy: {
            promisedAt: "asc",
        },
    });

    return (
        <div className="space-y-6 pb-24">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Trabajo Disponible</h2>
                            <p className="text-sm text-muted-foreground">
                                Equipos ingresados listos para ser asignados a un técnico.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-5 sm:p-6">
                    <ActiveRepairsTable
                        repairs={repairs}
                        emptyMessage="No hay trabajo disponible en este momento."
                        enableTakeover={true}
                        currentUserId={user?.id}
                        showIssueSummary={true}
                    />
                </div>
            </section>
            <AutoRefresh intervalMs={30000} />
        </div>
    );
}
