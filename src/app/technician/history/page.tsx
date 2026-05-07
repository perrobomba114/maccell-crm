import { getTechnicianHistory } from "@/actions/repairs/technician-history";
import { HistoryRepairsTable } from "@/components/repairs/history-repairs-table";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";
import { History } from "lucide-react";

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
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <History className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Historial de Reparaciones</h2>
                            <p className="text-sm text-muted-foreground">
                                Mis reparaciones finalizadas, entregadas o irrepares.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    <HistoryRepairsTable
                        repairs={data.repairs}
                        currentPage={data.currentPage}
                        totalPages={data.totalPages}
                    />
                </div>
            </section>
        </div>
    );
}
