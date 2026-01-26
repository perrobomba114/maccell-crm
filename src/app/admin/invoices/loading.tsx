import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-9 w-48" />
                <div className="flex gap-2">
                    <Button disabled variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                    <Button disabled>
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Factura
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <Skeleton className="h-10 w-full sm:w-64" /> {/* Search */}
                        <Skeleton className="h-10 w-full sm:w-48" /> {/* Branch Select */}
                    </div>
                    <TableSkeleton columnCount={7} rowCount={10} />
                </CardContent>
            </Card>
        </div>
    );
}
