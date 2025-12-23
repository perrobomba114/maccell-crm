import { getTechnicianHistory } from "@/actions/repairs/technician-history";
import { HistoryRepairsTable } from "@/components/repairs/history-repairs-table";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";

export default async function TechnicianHistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; q?: string }>;
}) {
    const params = await searchParams;
    const page = params.page ? parseInt(params.page) : 1;
    const query = params.q || "";

    const user = await getUserData();

    if (!user) {
        redirect("/auth/login"); // Or handles error elegantly
    }

    const { success, data, error } = await getTechnicianHistory(user.id, page, 25, query);

    if (!success || !data) {
        return (
            <div className="p-8 text-center text-red-500">
                {error || "Error al cargar historial o datos no disponibles"}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Historial de Reparaciones</h1>
                <p className="text-muted-foreground">
                    Mis reparaciones finalizadas, entregadas o irrepares.
                </p>
            </div>

            <HistoryRepairsTable
                repairs={data.repairs}
                currentPage={data.currentPage}
                totalPages={data.totalPages}
            />
        </div>
    );
}
