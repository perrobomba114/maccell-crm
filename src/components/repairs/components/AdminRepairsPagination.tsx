"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminRepairsPaginationProps {
    currentPage: number;
    totalPages: number;
    startIndex: number;
    itemsPerPage: number;
    totalFiltered: number;
    updateParams: (updates: Record<string, string | null>) => void;
}

export function AdminRepairsPagination({
    currentPage,
    totalPages,
    startIndex,
    itemsPerPage,
    totalFiltered,
    updateParams
}: AdminRepairsPaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
            <div className="text-sm text-muted-foreground font-medium tabular-nums shadow-sm border px-3 py-1 rounded-full bg-muted/20">
                Mostrando <span className="text-foreground font-bold">{startIndex + 1}</span> a <span className="text-foreground font-bold">{Math.min(startIndex + itemsPerPage, totalFiltered)}</span> de <span className="text-foreground font-bold">{totalFiltered}</span> reparaciones
            </div>
            <div className="flex items-center space-x-3">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateParams({ page: "1" })}
                    disabled={currentPage === 1}
                    className="h-10 w-10 hover:border-primary/50 transition-colors"
                >
                    <ChevronsLeft className="h-5 w-5" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateParams({ page: (currentPage - 1).toString() })}
                    disabled={currentPage === 1}
                    className="h-10 w-10 hover:border-primary/50 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-1 bg-background/50 border rounded-lg px-3 py-2 shadow-inner h-10">
                    <span className="text-xs text-muted-foreground uppercase font-bold pr-2">Página</span>
                    <span className="text-sm font-extrabold tabular-nums w-4 text-center">{currentPage}</span>
                    <span className="text-xs text-muted-foreground/50 px-1 font-bold">/</span>
                    <span className="text-sm font-extrabold tabular-nums w-4 text-center">{totalPages}</span>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateParams({ page: (currentPage + 1).toString() })}
                    disabled={currentPage === totalPages}
                    className="h-10 w-10 hover:border-primary/50 transition-colors"
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateParams({ page: totalPages.toString() })}
                    disabled={currentPage === totalPages}
                    className="h-10 w-10 hover:border-primary/50 transition-colors"
                >
                    <ChevronsRight className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
