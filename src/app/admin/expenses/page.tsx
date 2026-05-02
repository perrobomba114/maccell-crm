import { getUserData } from "@/actions/get-user";
import { redirect } from "next/navigation";
import { getExpensesAction } from "@/actions/admin-expenses";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ExpensesFilter } from "@/components/expenses/expenses-filter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CalendarDays, ChevronLeft, ChevronRight, DollarSign, Receipt, TrendingDown } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/date-utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
});

function buildExpensesHref(params: { date?: string; view?: string }, page: number) {
    const query = new URLSearchParams();
    if (params.date) query.set("date", params.date);
    if (params.view) query.set("view", params.view);
    query.set("page", String(page));
    return `/admin/expenses?${query.toString()}`;
}

export default async function AdminExpensesPage({
    searchParams
}: {
    searchParams: Promise<{ date?: string; page?: string; view?: string }>
}) {
    const user = await getUserData();
    if (user?.role !== "ADMIN") redirect("/");

    const resolvedParams = await searchParams;

    // Default to Today in LOCAL time if no date AND not explicitly viewing all
    const isViewAll = resolvedParams.view === "all";
    if (!resolvedParams.date && !isViewAll) {
        const today = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
        redirect(`/admin/expenses?date=${today}`);
    }

    const date = isViewAll ? undefined : (resolvedParams.date || undefined);
    const page = parseInt(resolvedParams.page || "1");

    const { expenses, totalAmount, monthlyTotal, totalCount, totalPages, currentPage, branchSummary } = await getExpensesAction({
        date,
        page,
        limit: 25
    });
    const periodLabel = date ? "día seleccionado" : "vista completa";
    const topBranch = branchSummary[0];

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
                <div className="border-b bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--muted))_100%)] p-5 sm:p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-2xl">
                            <Badge variant="outline" className="mb-3 rounded-md border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                                Control de egresos
                            </Badge>
                            <h2 className="text-3xl font-black tracking-tight">Gastos</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Auditoría de gastos cargados por vendedores, con totales por fecha, mes y sucursal.
                            </p>
                        </div>
                        <ExpensesFilter />
                    </div>
                </div>

                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-4">
                    <Card className="border-rose-200 bg-rose-50/70 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold text-rose-900 dark:text-rose-100">
                                <DollarSign className="h-4 w-4" />
                                Gastos del {periodLabel}
                            </CardTitle>
                            <CardDescription>{totalCount} registros filtrados</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black tracking-tight text-rose-950 dark:text-rose-50">
                                - {currencyFormatter.format(totalAmount)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-orange-200 bg-orange-50/70 shadow-sm dark:border-orange-900/50 dark:bg-orange-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold text-orange-900 dark:text-orange-100">
                                <CalendarDays className="h-4 w-4" />
                                Total del mes
                            </CardTitle>
                            <CardDescription>Acumulado mensual Argentina</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black tracking-tight text-orange-950 dark:text-orange-50">
                                - {currencyFormatter.format(monthlyTotal)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-slate-50/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold">
                                <TrendingDown className="h-4 w-4" />
                                Promedio
                            </CardTitle>
                            <CardDescription>Por registro filtrado</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black tracking-tight">
                                {currencyFormatter.format(totalCount > 0 ? totalAmount / totalCount : 0)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50/70 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-100">
                                <Building2 className="h-4 w-4" />
                                Sucursal principal
                            </CardTitle>
                            <CardDescription>Mayor gasto del mes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="truncate text-xl font-black tracking-tight text-blue-950 dark:text-blue-50">
                                {topBranch?.branchName || "Sin datos"}
                            </div>
                            <p className="mt-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                                {topBranch ? `- ${currencyFormatter.format(topBranch.total)} · ${topBranch.count} registros` : "Sin gastos mensuales"}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <Card className="border bg-card shadow-sm">
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Receipt className="h-5 w-5 text-rose-600" />
                        Listado de Gastos
                        </CardTitle>
                        <CardDescription>Movimientos ordenados del más reciente al más antiguo.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <ExpensesTable expenses={expenses} />

                    {totalPages > 1 && (
                        <div className="mt-5 flex items-center justify-center gap-2">
                            <Button
                                variant="outline"
                                disabled={currentPage <= 1}
                                asChild={currentPage > 1}
                            >
                                {currentPage > 1 ? (
                                    <Link href={buildExpensesHref(resolvedParams, currentPage - 1)}>
                                        <ChevronLeft className="mr-2 h-4 w-4" />
                                        Anterior
                                    </Link>
                                ) : "Anterior"}
                            </Button>
                            <div className="flex h-10 items-center rounded-md border bg-muted/30 px-4 text-sm font-bold">
                                Página {currentPage} de {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                disabled={currentPage >= totalPages}
                                asChild={currentPage < totalPages}
                            >
                                {currentPage < totalPages ? (
                                    <Link href={buildExpensesHref(resolvedParams, currentPage + 1)}>
                                        Siguiente
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </Link>
                                ) : "Siguiente"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
