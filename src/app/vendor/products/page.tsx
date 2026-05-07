import { getCurrentUser } from "@/actions/auth-actions";
import { getBranchProducts, getStockHealthPercentage } from "@/lib/actions/stock-actions";
import { checkStockControlCompliance } from "@/lib/actions/compliance-actions";
import { StockTable } from "@/components/products/stock-table";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, CheckCircle2, Package } from "lucide-react";

export default async function VendorProductsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
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
    const sortField = typeof searchParams.sort === 'string' ? searchParams.sort : "name";
    const sortOrder = (searchParams.dir === "desc" ? "desc" : "asc") as "asc" | "desc";
    const currentPage = isNaN(page) || page < 1 ? 1 : page;

    // Trigger compliance check (side-effect)
    await checkStockControlCompliance(user.id);

    // Fetch paginated products and health metric
    const [branchData, healthPercentage] = await Promise.all([
        getBranchProducts(user.branch.id, currentPage, 25, query, sortField, sortOrder),
        getStockHealthPercentage(user.branch.id)
    ]);

    const { products, total, totalPages } = branchData;

    // Health UI Config
    const healthConfig = {
        color: healthPercentage >= 80 ? "text-green-500" : healthPercentage >= 50 ? "text-yellow-500" : "text-red-500",
        bg: healthPercentage >= 80 ? "bg-green-500/10 border-green-500/20" : healthPercentage >= 50 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20",
        icon: healthPercentage >= 80 ? CheckCircle2 : healthPercentage >= 50 ? AlertTriangle : ShieldCheck
    };

    return (
        <div className="space-y-6 pb-24 animate-in fade-in duration-500">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500">
                                <Package className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Control de Stock</h2>
                                <p className="text-sm text-muted-foreground max-w-xl">
                                    Verifica el stock físico. Los productos con existencias deben controlarse cada 30 días.
                                </p>
                            </div>
                        </div>

                        {/* Health Metric Card */}
                        <div className={`flex flex-col gap-2 p-4 rounded-xl border ${healthConfig.bg} min-w-[240px]`}>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider opacity-70">Salud del Control</span>
                                <healthConfig.icon className={`h-4 w-4 ${healthConfig.color}`} />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-black ${healthConfig.color}`}>{healthPercentage}%</span>
                                <span className="text-[10px] font-medium opacity-60">Últimos 30 días</span>
                            </div>
                            {/* Custom Progress Bar */}
                            <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${healthPercentage >= 80 ? 'bg-green-500' : healthPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${healthPercentage}%` }}
                                />
                            </div>
                            <p className="text-[10px] leading-tight opacity-70">
                                {healthPercentage === 100
                                    ? "¡Excelente! Todo el stock está al día."
                                    : `Faltan controlar algunos productos con existencias.`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-0 sm:p-6">
                    <div className="bg-card rounded-xl border shadow-sm p-4 sm:p-6 overflow-hidden">
                        <StockTable
                            products={products}
                            userId={user.id}
                            branchId={user.branch.id}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            initialQuery={query}
                            initialSortField={sortField}
                            initialSortOrder={sortOrder}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

