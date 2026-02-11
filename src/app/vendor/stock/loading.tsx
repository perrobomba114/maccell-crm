import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Search } from "lucide-react";

export default function Loading() {
    return (
        <div className="space-y-6 pb-24 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Consulta de Stock</h1>
            </div>

            {/* Search Bar Skeleton */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Skeleton className="h-10 w-full md:w-[400px] rounded-md bg-zinc-100 dark:bg-zinc-800" />
            </div>

            {/* Table Skeleton */}
            <Card className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Listado de Productos
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-4 w-full bg-zinc-200 dark:bg-zinc-700" />
                        ))}
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="p-4 grid grid-cols-5 gap-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
