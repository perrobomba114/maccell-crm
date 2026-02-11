import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Banknote, Calendar } from "lucide-react";

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mis Gastos</h2>
                    <p className="text-muted-foreground">
                        Historial de tus gastos registrados.
                    </p>
                </div>
                <Skeleton className="h-10 w-[200px]" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-red-600 border-red-500 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/80">Total Gastos</CardTitle>
                        <Banknote className="h-4 w-4 text-red-200" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-24 bg-red-400 mb-1" />
                        <Skeleton className="h-3 w-16 bg-red-400" />
                    </CardContent>
                </Card>

                <Card className="bg-red-700 border-red-600 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-white/80">Mi Acumulado Mensual</CardTitle>
                        <Calendar className="h-4 w-4 text-red-200" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-24 bg-red-500 mb-1" />
                        <Skeleton className="h-3 w-16 bg-red-500" />
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Listado de Gastos
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden m-4">
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 grid grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-4 w-full" />
                            ))}
                        </div>
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="p-4 grid grid-cols-5 gap-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
