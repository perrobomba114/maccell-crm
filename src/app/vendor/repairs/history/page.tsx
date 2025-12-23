
import { getRepairHistoryAction } from "@/lib/actions/repairs";
import { getUserData } from "@/actions/get-user";
import { HistoryRepairsTable } from "@/components/repairs/history-repairs-table";
import { redirect } from "next/navigation";

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

    const { q } = await searchParams;
    const query = q || "";
    const repairs = await getRepairHistoryAction(user.branch.id, query);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Historial de Reparaciones</h1>
            </div>

            <HistoryRepairsTable
                repairs={repairs}
                currentPage={1}
                totalPages={1}
            />
        </div>
    );
}
