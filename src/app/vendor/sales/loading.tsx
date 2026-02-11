import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export default function Loading() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Mis Ventas</h2>
                    <p className="text-muted-foreground">
                        Historial y gestión de tus ventas.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-[140px]" />
                    <Skeleton className="h-10 w-[140px]" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800" />
                            <ShoppingCart className="h-4 w-4 text-zinc-300" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 mb-1" />
                            <Skeleton className="h-3 w-12 bg-zinc-100 dark:bg-zinc-900" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Listado de Ventas
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="m-4 space-y-4">
                        {/* Filter Bar */}
                        <div className="flex gap-4">
                            <Skeleton className="h-10 w-full max-w-sm" />
                            <Skeleton className="h-10 w-[100px]" />
                        </div>

                        {/* Table Header */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-t-xl grid grid-cols-6 gap-4 border border-zinc-200 dark:border-zinc-800">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} className="h-4 w-full bg-zinc-200 dark:bg-zinc-700" />
                            ))}
                        </div>

                        {/* Table Rows */}
                        <div className="space-y-1">
                            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                <div key={i} className="p-4 grid grid-cols-6 gap-4 border-b border-zinc-100 dark:border-zinc-800/50">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-8 w-full rounded-md" />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
