import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-9 w-48" />
                <Button disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Descuento
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <Skeleton className="h-10 w-full max-w-sm" /> {/* Search */}
                    </div>
                    <TableSkeleton columnCount={5} rowCount={8} />
                </CardContent>
            </Card>
        </div>
    );
}
