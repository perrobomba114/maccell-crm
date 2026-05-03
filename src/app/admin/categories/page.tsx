import { Suspense } from "react";
import { getCategories } from "@/actions/categories";
import { CategoriesClient } from "@/components/admin/categories/categories-client";
import { Badge } from "@/components/ui/badge";
import { Tags } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
    const { categories } = await getCategories();

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Tags className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Categorías</h1>
                            <p className="text-sm text-muted-foreground">
                                Organizá productos y repuestos para búsquedas, reportes y reposición.
                            </p>
                        </div>
                    </div>
                    <Badge variant="secondary">{categories?.length || 0} categorías</Badge>
                </div>
            </section>

            <Suspense fallback={<div>Cargando categorías...</div>}>
                <CategoriesClient initialCategories={categories || []} />
            </Suspense>
        </div>
    );
}
