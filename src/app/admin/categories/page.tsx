import { Suspense } from "react";
import { getCategories } from "@/actions/categories";
import { CategoriesClient } from "@/components/admin/categories/categories-client";

export default async function CategoriesPage() {
    const { categories } = await getCategories();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
                    <p className="text-muted-foreground">
                        Gestiona las categorías de productos y repuestos.
                    </p>
                </div>
            </div>

            <Suspense fallback={<div>Cargando categorías...</div>}>
                <CategoriesClient initialCategories={categories || []} />
            </Suspense>
        </div>
    );
}
