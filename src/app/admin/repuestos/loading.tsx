import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileBarChart, Plus } from "lucide-react";

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-9 w-48 mb-2" />
                    <Skeleton className="h-5 w-96" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <Skeleton className="h-10 w-full max-w-md" />
                    <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end">
                        <Button disabled size="sm" variant="outline"><Download className="mr-2 h-4 w-4" /></Button>
                        <Button disabled size="sm" variant="outline"><Upload className="mr-2 h-4 w-4" /></Button>
                        <Button disabled size="sm" variant="outline"><FileBarChart className="mr-2 h-4 w-4" /></Button>
                        <Button disabled size="sm"><Plus className="mr-2 h-4 w-4" /> Nuevo</Button>
                    </div>
                </div>

                <div className="rounded-md border bg-card p-0">
                    <TableSkeleton columnCount={8} rowCount={10} />
                </div>
            </div>
        </div>
    );
}
