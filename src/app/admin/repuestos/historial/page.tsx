
import { Suspense } from "react";
import { getSparePartsHistory } from "@/actions/spare-parts";
import { HistoryClient } from "@/components/admin/spare-parts/history-client";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SparePartsHistoryPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;

    // Default to today if no date provided
    // Important: Use Argentina timezone logic if needed, but for simplicity server-side "now" 
    // formatted as YYYY-MM-DD usually works if server is UTC or local. 
    // Ideally we want the USER's today. 
    // If we assume the business is in one timezone, we can force it or just use simple date.

    const today = new Date();
    // Format to YYYY-MM-DD
    const todayStr = format(today, "yyyy-MM-dd");

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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Historial de Repuestos</h1>
                <p className="text-muted-foreground">
                    Registro de bajas y movimientos manuales de stock.
                </p>
            </div>

            <Suspense fallback={<div>Cargando historial...</div>}>
                <HistoryClient
                    data={data as any}
                    totalPages={totalPages}
                    currentPage={page}
                    total={total}
                />
            </Suspense>
        </div>
    );
}
