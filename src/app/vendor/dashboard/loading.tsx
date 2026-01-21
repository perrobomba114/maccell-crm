import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorDashboardLoading() {
    return (
        <div className="space-y-8 container mx-auto p-6 pb-20 max-w-7xl animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-6 w-96" />
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
                            <Skeleton className="h-8 w-20 mb-1" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Grid Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Pickup Table Skeleton (Span 2) */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex justify-between">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Best Sellers Chart Skeleton (Span 2) */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        <Skeleton className="h-48 w-48 rounded-full" />
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Actions Skeleton */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="h-[400px]">
                    <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
                <Card className="h-[400px]">
                    <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
