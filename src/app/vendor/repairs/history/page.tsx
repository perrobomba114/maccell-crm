
import { getRepairHistoryAction } from "@/lib/actions/repairs";
import { getUserData } from "@/actions/get-user";
import { HistoryRepairsTable } from "@/components/repairs/history-repairs-table";
import { redirect } from "next/navigation";
import { History } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function RepairHistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const user = await getUserData();

    if (!user || user.role !== "VENDOR") {
        redirect("/login");
    }

    if (!user.branch) {
        return <div>Error: Usuario sin sucursal asignada.</div>;
    }

    const resolvedParams = await searchParams;
    const query = resolvedParams.q || "";
    const currentPage = Math.max(1, parseInt(resolvedParams.page || "1"));
    const pageSize = 20;

    const { repairs, totalPages } = await getRepairHistoryAction(user.branch.id, query, currentPage, pageSize);

    return (
        <div className="space-y-6 pb-24">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500">
                            <History className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Historial de Reparaciones</h2>
                            <p className="text-sm text-muted-foreground">
                                Consulta el registro histórico de equipos reparados y entregados.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-0 sm:p-6">
                    <HistoryRepairsTable
                        repairs={repairs}
                        currentPage={currentPage}
                        totalPages={totalPages}
                    />
                </div>
            </section>
        </div>
    );
}
