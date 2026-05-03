
import { Suspense } from "react";
import { getSparePartsHistory } from "@/actions/spare-parts";
import { HistoryClient } from "@/components/admin/spare-parts/history-client";
import { Badge } from "@/components/ui/badge";
import { getDailyRange, TIMEZONE } from "@/lib/date-utils";
import { formatInTimeZone } from "date-fns-tz";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SparePartsHistoryPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;

    const { start } = getDailyRange();
    const todayStr = formatInTimeZone(start, TIMEZONE, "yyyy-MM-dd");
    const date = typeof params.date === 'string' ? params.date : todayStr;
    const limit = 25;

    const { success, history, pagination } = await getSparePartsHistory({
        page,
        limit,
        date
    });

    const data = success && history ? history : [];
    const totalPages = pagination?.totalPages || 0;
    const total = pagination?.total || 0;

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-orange-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <History className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Historial de Repuestos</h1>
                            <p className="text-sm text-muted-foreground">
                                Registro de bajas, controles y movimientos manuales de stock.
                            </p>
                        </div>
                    </div>
                    <Badge variant="secondary">{total} movimientos</Badge>
                </div>
            </section>

            <Suspense fallback={<div>Cargando historial...</div>}>
                <HistoryClient
                    data={data}
                    totalPages={totalPages}
                    currentPage={page}
                    total={total}
                />
            </Suspense>
        </div>
    );
}
