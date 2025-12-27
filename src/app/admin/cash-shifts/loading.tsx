import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Loading() {
    return (
        <div className="p-6 md:p-8 space-y-8 w-full max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-6 w-96" />
            </div>

            <div className="space-y-8">
                {/* Header/Filter Skeleton */}
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-48" />
                </div>

                {/* KPI Skeletons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden border-l-4 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-32 mb-2" />
                                <Skeleton className="h-3 w-40" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Calendar Skeleton */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden h-[500px]">
                    <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <div className="grid grid-cols-7 h-full">
                        {Array.from({ length: 7 * 5 }).map((_, i) => (
                            <div key={i} className="border-r border-b p-2">
                                <Skeleton className="h-4 w-4 rounded-full mb-2" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
