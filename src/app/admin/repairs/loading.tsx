import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-9 w-64" /> {/* Header Title */}
                <Button disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Reparación
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-5 mb-6">
                        <Skeleton className="h-12 w-full max-w-md" /> {/* Search */}
                        <div className="flex gap-2.5">
                            <Skeleton className="h-9 w-24" />
                            <Skeleton className="h-9 w-24" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </div>
                    <TableSkeleton columnCount={9} rowCount={10} />
                </CardContent>
            </Card>
        </div>
    );
}
