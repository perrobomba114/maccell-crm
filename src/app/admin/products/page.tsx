import { Suspense } from "react";
import { getProducts } from "@/actions/products";
import { getCategories } from "@/actions/categories";
import { getAllBranches } from "@/actions/get-branches";
import { ProductsClient } from "@/components/admin/products/products-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string; category?: string; sort?: string; order?: string }>;
}) {
    const { page: pageStr, search: searchStr, category: categoryStr, sort: sortStr, order: orderStr } = await searchParams;
    const page = Number(pageStr) || 1;
    const search = searchStr || "";
    const categoryId = categoryStr || "all";
    const limit = 25;

    // Determine Sort
    const sortColumn = sortStr || "sku";
    const sortDirection = (orderStr === "asc" ? "asc" : "desc") as "asc" | "desc";

    console.log("ProductsPage Params:", { page, search, categoryId, sortColumn, sortDirection });

    // Initial data fetch
    const { products, totalPages, total } = await getProducts({
        page,
        limit,
        search,
        categoryId,
        sortColumn,
        sortDirection
    });

    // Fetch options
    const { categories } = await getCategories();
    const branches = await getAllBranches();

    // Sort branches by specific order
    const sortOrder = ["maccell 1", "maccell 2", "maccell 3", "8 bit accesorios"];

    if (branches) {
        branches.sort((a, b) => {
            const indexA = sortOrder.indexOf(a.name.toLowerCase());
            const indexB = sortOrder.indexOf(b.name.toLowerCase());

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            return 0;
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
                    <p className="text-muted-foreground">
                        Gestiona el catálogo global de productos ({total} total).
                    </p>
                </div>
            </div>

            <Suspense fallback={<div>Cargando productos...</div>}>
                <ProductsClient
                    initialProducts={(products as any) || []}
                    categories={categories || []}
                    branches={branches || []}
                    totalPages={totalPages || 1}
                    currentPage={page}
                />
            </Suspense>
        </div>
    );
}
