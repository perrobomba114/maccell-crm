import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function Loading() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 justify-between items-center mb-6">
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800" />
                    <Skeleton className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <Skeleton className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Card key={i} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                            <CardTitle className="text-sm font-medium">
                                <Skeleton className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700" />
                            </CardTitle>
                            <Wrench className="h-4 w-4 text-zinc-300" />
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            <Skeleton className="h-4 w-3/4 bg-zinc-100 dark:bg-zinc-900" />
                            <div className="flex justify-between">
                                <Skeleton className="h-3 w-16 bg-zinc-100 dark:bg-zinc-900" />
                                <Skeleton className="h-3 w-16 bg-zinc-100 dark:bg-zinc-900" />
                            </div>
                            <Skeleton className="h-8 w-full rounded-md bg-zinc-50 dark:bg-zinc-900" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
