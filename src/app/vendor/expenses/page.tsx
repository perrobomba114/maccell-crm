import { Suspense } from "react";
import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";
import { getExpensesAction } from "@/actions/admin-expenses";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ExpensesFilter } from "@/components/expenses/expenses-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Receipt, Banknote, Calendar } from "lucide-react";

export const revalidate = 60;

export default async function VendorExpensesPage(props: {
    searchParams: Promise<{ date?: string; page?: string; view?: string }>
}) {
    const searchParams = await props.searchParams;
    const user = await getUserData();
    if (!user) redirect("/");

    // Default to Today if no date AND not explicitly viewing all
    // Vendors should primarily see their daily activity
    const isViewAll = searchParams.view === "all";

    // If no date provided and not viewing all, use today's date for the query
    // BUT DO NOT REDIRECT. This allows the page to load immediately.
    const date = isViewAll
        ? undefined
        : (searchParams.date || new Date().toISOString().split('T')[0]);

    const page = parseInt(searchParams.page || "1");

    // Fetch expenses filtered by the current user's ID
    const { expenses, totalAmount, monthlyTotal, totalCount, totalPages, currentPage } = await getExpensesAction({
        date,
        page,
        limit: 25,
        userId: user.id // Strictly filter by current user
    });

    return (
        <div className="space-y-6 pb-24">
            <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="relative flex flex-col gap-1 border-b p-5 sm:p-6">
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-500">
                                <Receipt className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Mis Gastos</h2>
                                <p className="text-sm text-muted-foreground">
                                    Historial de tus gastos registrados.
                                </p>
                            </div>
                        </div>
                        {/* Reusing ExpensesFilter */}
                        <ExpensesFilter />
                    </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-rose-500/10 border-rose-500/20 shadow-sm relative overflow-hidden group">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-rose-700 dark:text-rose-400 uppercase tracking-widest">Total Gastos {date ? "(Día)" : "(Filtro)"}</CardTitle>
                                <Banknote className="h-4 w-4 text-rose-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-rose-600 dark:text-rose-500 tracking-tighter">
                                    - ${totalAmount.toLocaleString()}
                                </div>
                                <p className="text-xs font-bold text-rose-600/70 dark:text-rose-400/70 uppercase tracking-widest mt-1">
                                    {totalCount} registros
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-red-600/10 border-red-600/20 shadow-sm relative overflow-hidden group">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-widest">Mi Acumulado Mensual</CardTitle>
                                <Calendar className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-red-600 dark:text-red-500 tracking-tighter">
                                    - ${monthlyTotal.toLocaleString()}
                                </div>
                                <p className="text-xs font-bold text-red-600/70 dark:text-red-400/70 uppercase tracking-widest mt-1">
                                    Este mes
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="pt-2">
                        <ExpensesTable expenses={expenses} />

                        {totalPages > 1 && (
                            <div className="flex justify-center mt-6 gap-2">
                                <Button
                                    variant="outline"
                                    disabled={currentPage <= 1}
                                    asChild={currentPage > 1}
                                    className="rounded-xl font-bold"
                                >
                                    {currentPage > 1 ? (
                                        <a href={`/vendor/expenses?${new URLSearchParams({ ...searchParams, page: String(currentPage - 1) }).toString()}`}>Anterior</a>
                                    ) : "Anterior"}
                                </Button>
                                <div className="flex items-center px-4 text-sm font-bold">
                                    Página {currentPage} de {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    disabled={currentPage >= totalPages}
                                    asChild={currentPage < totalPages}
                                    className="rounded-xl font-bold"
                                >
                                    {currentPage < totalPages ? (
                                        <a href={`/vendor/expenses?${new URLSearchParams({ ...searchParams, page: String(currentPage + 1) }).toString()}`}>Siguiente</a>
                                    ) : "Siguiente"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
