import { Suspense } from "react";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";
import { getExpensesAction } from "@/actions/admin-expenses";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ExpensesFilter } from "@/components/expenses/expenses-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage({
    searchParams
}: {
    searchParams: { date?: string; page?: string }
}) {
    const user = await getUserData();
    if (user?.role !== "ADMIN") redirect("/");

    const date = searchParams.date || new Date().toISOString();
    const page = parseInt(searchParams.page || "1");

    const { expenses, totalAmount, totalCount, totalPages, currentPage } = await getExpensesAction({
        date,
        page,
        limit: 50 // Higher limit for expenses usually
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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Gastos (Día)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            - ${totalAmount.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {totalCount} registros encontrados
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

                    {/* Pagination could be added here if needed, sticking to simple list for now as per req "list all expenses" */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-4">
                            <p className="text-sm text-muted-foreground">
                                Página {currentPage} de {totalPages}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
