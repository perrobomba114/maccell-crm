import { Suspense } from "react";
import { getProducts } from "@/actions/products";
import { getAllBranches } from "@/actions/branch-actions";
import { InventoryReportClient } from "@/components/admin/reports/inventory-report-client";

export default async function InventoryReportPage() {
    // Fetch data for report (all products and branches)
    const { products } = await getProducts({ limit: 1000 }); // Adjust limit as needed or handle pagination
    const { branches } = await getAllBranches();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Informe de Inventario</h1>
                    <p className="text-muted-foreground">
                        Reporte detallado de valorización de stock y rentabilidad.
                    </p>
                </div>
            </div>

            <Suspense fallback={<div>Generando reporte...</div>}>
                <InventoryReportClient
                    products={products || []}
                    branches={branches || []}
                />
            </Suspense>
        </div>
    );
}
