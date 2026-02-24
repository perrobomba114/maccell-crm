import { Suspense } from "react";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";
import { getExpensesAction } from "@/actions/admin-expenses";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ExpensesFilter } from "@/components/expenses/expenses-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage({
    searchParams
}: {
    searchParams: Promise<{ date?: string; page?: string; view?: string }>
}) {
    const user = await getUserData();
    if (user?.role !== "ADMIN") redirect("/");

    const resolvedParams = await searchParams;

    // Default to Today if no date AND not explicitly viewing all
    const isViewAll = resolvedParams.view === "all";
    if (!resolvedParams.date && !isViewAll) {
        const today = new Date().toISOString().split('T')[0];
        redirect(`/admin/expenses?date=${today}`);
    }

    const date = isViewAll ? undefined : (resolvedParams.date || undefined);
    const page = parseInt(resolvedParams.page || "1");

    const { expenses, totalAmount, monthlyTotal, totalCount, totalPages, currentPage } = await getExpensesAction({
        date,
        page,
        limit: 25
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gastos</h2>
                    <p className="text-muted-foreground">
                        Administra los gastos registrados por los vendedores.
                    </p>
                </div>
                <ExpensesFilter />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-blue-600 border-blue-500 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/80">Total Gastos {date ? "(Día)" : "(Filtro)"}</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            - ${totalAmount.toLocaleString()}
                        </div>
                        <p className="text-xs text-blue-100">
                            {totalCount} registros
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-red-700 border-red-600 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/80">Total Mes Actual</CardTitle>
                        <Receipt className="h-4 w-4 text-red-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            - ${monthlyTotal.toLocaleString()}
                        </div>
                        <p className="text-xs text-red-100">
                            Acumulado mensual
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Listado de Gastos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ExpensesTable expenses={expenses} />

                    {totalPages > 1 && (
                        <div className="flex justify-center mt-4 gap-2">
                            <Button
                                variant="outline"
                                disabled={currentPage <= 1}
                                asChild={currentPage > 1}
                            >
                                {currentPage > 1 ? (
                                    <a href={`/admin/expenses?${new URLSearchParams({ ...resolvedParams, page: String(currentPage - 1) } as any).toString()}`}>Anterior</a>
                                ) : "Anterior"}
                            </Button>
                            <div className="flex items-center px-4 text-sm font-medium">
                                Página {currentPage} de {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                disabled={currentPage >= totalPages}
                                asChild={currentPage < totalPages}
                            >
                                {currentPage < totalPages ? (
                                    <a href={`/admin/expenses?${new URLSearchParams({ ...resolvedParams, page: String(currentPage + 1) } as any).toString()}`}>Siguiente</a>
                                ) : "Siguiente"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
