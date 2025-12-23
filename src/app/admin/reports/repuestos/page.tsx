import { Suspense } from "react";
import { getSpareParts } from "@/actions/spare-parts";
import { SparePartsReportClient } from "@/components/admin/reports/spare-parts-report-client";

export default async function SparePartsReportPage() {
    // Fetch all spare parts (no pagination limit for report essentially, or high limit)
    // getSpareParts usually returns all non-deleted.
    const { spareParts } = await getSpareParts();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Informe de Repuestos</h1>
                    <p className="text-muted-foreground">
                        Reporte detallado de valorización de inventario de repuestos.
                    </p>
                </div>
            </div>

            <Suspense fallback={<div>Generando reporte...</div>}>
                <SparePartsReportClient spareParts={spareParts || []} />
            </Suspense>
        </div>
    );
}
