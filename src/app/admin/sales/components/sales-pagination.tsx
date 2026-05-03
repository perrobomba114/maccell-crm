"use client";

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

interface SalesPaginationProps {
    page: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    visibleItems: number;
    onPageChange: (page: number) => void;
}

function getVisiblePages(page: number, totalPages: number) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    const pages = [1];

    if (start > 2) pages.push(-1);

    for (let current = start; current <= end; current += 1) {
        pages.push(current);
    }

    if (end < totalPages - 1) pages.push(-2);
    pages.push(totalPages);

    return pages;
}

export function SalesPagination({
    page,
    totalPages,
    pageSize,
    totalItems,
    visibleItems,
    onPageChange,
}: SalesPaginationProps) {
    if (totalItems === 0) return null;

    const boundedPage = Math.min(page, totalPages);
    const firstItem = visibleItems > 0 ? (boundedPage - 1) * pageSize + 1 : 0;
    const lastItem = visibleItems > 0 ? Math.min(firstItem + visibleItems - 1, totalItems) : 0;
    const visiblePages = getVisiblePages(boundedPage, totalPages);

    return (
        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
                Mostrando {firstItem.toLocaleString("es-AR")}-{lastItem.toLocaleString("es-AR")} de{" "}
                {totalItems.toLocaleString("es-AR")} ventas
            </p>

            {totalPages > 1 && (
                <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => onPageChange(Math.max(1, boundedPage - 1))}
                                className={boundedPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {visiblePages.map((visiblePage, index) => (
                            <PaginationItem key={`${visiblePage}-${index}`}>
                                {visiblePage < 0 ? (
                                    <PaginationEllipsis />
                                ) : (
                                    <PaginationLink
                                        isActive={boundedPage === visiblePage}
                                        onClick={() => onPageChange(visiblePage)}
                                        className="cursor-pointer"
                                    >
                                        {visiblePage}
                                    </PaginationLink>
                                )}
                            </PaginationItem>
                        ))}

                        <PaginationItem>
                            <PaginationNext
                                onClick={() => onPageChange(Math.min(totalPages, boundedPage + 1))}
                                className={boundedPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
