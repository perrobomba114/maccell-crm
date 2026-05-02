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

                <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-lg">
                        <CardContent className="flex min-h-[198px] flex-col p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="mb-1 text-sm font-medium text-rose-100">Gastos del {periodLabel}</p>
                                    <h3 className="text-3xl font-bold leading-none tracking-tight tabular-nums">- {currencyFormatter.format(totalAmount)}</h3>
                                </div>
                                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                                    <DollarSign className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div className="mt-auto pt-4 text-sm text-rose-100">{totalCount} registros filtrados</div>
                        </CardContent>
                        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    </Card>

                    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg">
                        <CardContent className="flex min-h-[198px] flex-col p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="mb-1 text-sm font-medium text-amber-100">Total del mes</p>
                                    <h3 className="text-3xl font-bold leading-none tracking-tight tabular-nums">- {currencyFormatter.format(monthlyTotal)}</h3>
                                </div>
                                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                                    <CalendarDays className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div className="mt-auto pt-4 text-sm text-amber-100">Acumulado mensual Argentina</div>
                        </CardContent>
                        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    </Card>

                    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                        <CardContent className="flex min-h-[198px] flex-col p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="mb-1 text-sm font-medium text-blue-100">Promedio</p>
                                    <h3 className="text-3xl font-bold leading-none tracking-tight tabular-nums">{currencyFormatter.format(totalCount > 0 ? totalAmount / totalCount : 0)}</h3>
                                </div>
                                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                                    <TrendingDown className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div className="mt-auto pt-4 text-sm text-blue-100">Por registro filtrado</div>
                        </CardContent>
                        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    </Card>

                    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
                        <CardContent className="flex min-h-[198px] flex-col p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="mb-1 text-sm font-medium text-purple-100">Sucursal principal</p>
                                    <h3 className="truncate text-2xl font-bold leading-none tracking-tight">{topBranch?.branchName || "Sin datos"}</h3>
                                </div>
                                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                                    <Building2 className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <p className="mt-auto pt-4 text-xs font-semibold tabular-nums text-purple-100">
                                {topBranch ? `- ${currencyFormatter.format(topBranch.total)} · ${topBranch.count} registros` : "Sin gastos mensuales"}
                            </p>
                        </CardContent>
                        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
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
