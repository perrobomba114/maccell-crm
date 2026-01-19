import { getCurrentUser } from "@/actions/auth-actions";
import { getBranchProducts, getStockHealthPercentage } from "@/lib/actions/stock-actions";
import { checkStockControlCompliance } from "@/lib/actions/compliance-actions";
import { StockTable } from "@/components/products/stock-table";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

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

    // Fetch paginated products and health metric
    const [branchData, healthPercentage] = await Promise.all([
        getBranchProducts(user.branch.id, currentPage, 25, query),
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
        <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Control de Stock</h2>
                    <p className="text-muted-foreground max-w-2xl">
                        Verifica el stock físico. Los productos con existencias deben controlarse cada 30 días para evitar alertas.
                    </p>
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

            <div className="bg-card rounded-lg border shadow-sm p-6 overflow-hidden">
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

