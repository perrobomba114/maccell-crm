import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TechnicianDashboardLoading() {
    return (
        <div className="space-y-8 container mx-auto p-6 pb-20 max-w-7xl animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-6 w-80" />
            </div>

            {/* KPI Grid Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <Skeleton className="h-4 w-24" />
                            </CardTitle>
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-1" />
                            <Skeleton className="h-3 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Active Workspace Skeleton */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-96" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-xl" />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Queue & Analytics Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="col-span-2">
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-2">
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-end gap-2 px-4 pb-4">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${Math.random() * 60 + 20}%` }} />
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
