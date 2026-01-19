import { getCurrentUser } from "@/actions/auth-actions";
import { getBranchProducts } from "@/lib/actions/stock-actions";
import { checkStockControlCompliance } from "@/lib/actions/compliance-actions";
import { StockTable } from "@/components/products/stock-table";
import { redirect } from "next/navigation";

export default async function VendorProductsPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    if (!user.branch?.id) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                No tienes una sucursal asignada.
            </div>
        );
    }

    // Parse params
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;
    const query = typeof searchParams.q === 'string' ? searchParams.q : "";
    const currentPage = isNaN(page) || page < 1 ? 1 : page;

    // Trigger compliance check (side-effect)
    await checkStockControlCompliance(user.id);

    // Fetch paginated products
    const { products, total, totalPages } = await getBranchProducts(
        user.branch.id,
        currentPage,
        25, // Limit 25
        query
    );

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">Control de Stock</h2>
                <p className="text-muted-foreground">
                    Verifica el stock físico y repórtalo. Los productos no verificados en 30 días activarán alertas.
                </p>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-6">
                <StockTable
                    products={products}
                    userId={user.id}
                    branchId={user.branch.id}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    initialQuery={query}
                />
            </div>
        </div>
    );
}
