import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardLoading() {
    return (
        <div className="space-y-6">
            {/* Header and Filter Skeleton */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-[200px]" />
            </div>

            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <Skeleton className="h-4 w-24" />
                            </CardTitle>
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-32 mb-1" />
                            <Skeleton className="h-3 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Section Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                <Card className="col-span-1 lg:col-span-4 h-[400px]">
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="h-[320px] flex items-end gap-2 p-6">
                        {/* Fake Bar Chart */}
                        {Array.from({ length: 7 }).map((_, i) => (
                            <Skeleton key={i} className="flex-1 w-full" style={{ height: `${Math.random() * 80 + 20}%` }} />
                        ))}
                    </CardContent>
                </Card>
                <Card className="col-span-1 lg:col-span-3 h-[400px]">
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-[300px]">
                        <Skeleton className="h-48 w-48 rounded-full" />
                    </CardContent>
                </Card>
            </div>

            {/* Recent Sales Skeleton */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
