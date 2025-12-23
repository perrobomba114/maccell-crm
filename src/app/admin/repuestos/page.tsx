
import { Suspense } from "react";
import { getSpareParts } from "@/actions/spare-parts";
import { getCategories } from "@/actions/categories";
import { SparePartsClient } from "@/components/admin/spare-parts/spare-parts-client";
import { CategoryType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function SparePartsPage() {
    // Fetch data in parallel
    const [sparePartsRes, categoriesRes] = await Promise.all([
        getSpareParts(),
        getCategories(CategoryType.PART) // "aca solamente vamos a ver las categorias de repuesto"
    ]);

    const spareParts = sparePartsRes.success ? sparePartsRes.spareParts : [];
    const categories = categoriesRes.success ? categoriesRes.categories : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Repuestos</h1>
                    <p className="text-muted-foreground">
                        Gestiona el inventario de repuestos, precios y reposición.
                    </p>
                </div>
            </div>

            <Suspense fallback={<div>Cargando repuestos...</div>}>
                <SparePartsClient
                    initialData={spareParts || []}
                    categories={categories || []}
                />
            </Suspense>
        </div>
    );
}
