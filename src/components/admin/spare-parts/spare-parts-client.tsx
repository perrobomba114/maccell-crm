"use client";

import { useRef, useEffect } from "react";
import { ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SparePartWithCategory } from "@/types/spare-parts";
import { Category } from "@prisma/client";
import { SparePartForm } from "./spare-part-form";
import { handleExport, handleFileChange } from "./import-export-utils";
import { handleReplenishReport } from "./replenish-report-utils";
import { uploadFontToPrinter } from "@/actions/printer";

import { useSpareParts } from "./use-spare-parts";
import { usePrinter } from "./use-printer";

// Modular components
import { SparePartsToolbar } from "./components/SparePartsToolbar";
import { SparePartsTable } from "./components/SparePartsTable";
import { SparePartsPrinterDialogs } from "./components/SparePartsPrinterDialogs";
import { SparePartsAlerts } from "./components/SparePartsAlerts";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import React from "react";

interface SparePartsClientProps {
    initialData: SparePartWithCategory[];
    categories: Category[];
}

export function SparePartsClient({ initialData, categories }: SparePartsClientProps) {
    const {
        searchTerm, handleSearchChange, currentPage, setCurrentPage, totalPages, paginatedData,
        handleSort, isCreateOpen, setIsCreateOpen, editingPart, setEditingPart, deletingId,
        setDeletingId, replenishData, setReplenishData, decrementData, setDecrementData,
        handleDelete, handleConfirmReplenish, handleConfirmDecrement, router, searchParams
    } = useSpareParts(initialData);

    const {
        printPart, setPrintPart, printQuantity, setPrintQuantity, printPrefix, setPrintPrefix,
        printerIp, setPrinterIp, isConfiguringPrinter, setIsConfiguringPrinter, scannedPrinters,
        isScanning, handleScanPrinters, handleSelectPrinter, handlePrintConfirm
    } = usePrinter();

    const getSortIcon = (column: string) => {
        const currentSort = searchParams.get("sort");
        const currentOrder = searchParams.get("order");
        if (currentSort !== column) return <ArrowDown className="w-3 h-3 opacity-0 group-hover/head:opacity-50" />;
        return <ArrowDown className={`w-3 h-3 transition-transform ${currentOrder === "asc" ? "rotate-180" : ""}`} />;
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const onExport = () => handleExport();
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e, router);
    const handleImport = () => fileInputRef.current?.click();
    const handleReport = () => router.push("/admin/reports/repuestos");
    const onReplenishReport = () => handleReplenishReport(initialData);

    return (
        <div className="space-y-4">
            <SparePartsToolbar
                searchTerm={searchTerm}
                handleSearchChange={handleSearchChange}
                onExport={onExport}
                handleImport={handleImport}
                fileInputRef={fileInputRef}
                onFileChange={onFileChange}
                handleReport={handleReport}
                onReplenishReport={onReplenishReport}
                categories={categories}
                isCreateOpen={isCreateOpen}
                setIsCreateOpen={setIsCreateOpen}
            />

            <SparePartsTable
                paginatedData={paginatedData}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                setReplenishData={setReplenishData}
                setPrintPart={setPrintPart}
                setPrintQuantity={setPrintQuantity}
                setPrintPrefix={setPrintPrefix}
                setDecrementData={setDecrementData}
                setEditingPart={setEditingPart}
                setDeletingId={setDeletingId}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                                }}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                            />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                            .map((page, index, array) => {
                                const showEllipsis = index > 0 && page - array[index - 1] > 1;
                                return (
                                    <React.Fragment key={page}>
                                        {showEllipsis && (
                                            <PaginationItem>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        )}
                                        <PaginationItem>
                                            <PaginationLink
                                                href="#"
                                                isActive={page === currentPage}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCurrentPage(page);
                                                }}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    </React.Fragment>
                                );
                            })}
                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                                }}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}

            <SparePartsPrinterDialogs
                printPart={printPart}
                setPrintPart={setPrintPart}
                printQuantity={printQuantity}
                setPrintQuantity={setPrintQuantity}
                printPrefix={printPrefix}
                setPrintPrefix={setPrintPrefix}
                printerIp={printerIp}
                setPrinterIp={setPrinterIp}
                isConfiguringPrinter={isConfiguringPrinter}
                setIsConfiguringPrinter={setIsConfiguringPrinter}
                scannedPrinters={scannedPrinters}
                isScanning={isScanning}
                handleScanPrinters={handleScanPrinters}
                handleSelectPrinter={handleSelectPrinter}
                handlePrintConfirm={handlePrintConfirm}
                uploadFontToPrinter={uploadFontToPrinter}
            />

            <SparePartsAlerts
                deletingId={deletingId}
                setDeletingId={setDeletingId}
                handleDelete={handleDelete}
                replenishData={replenishData}
                setReplenishData={setReplenishData}
                handleConfirmReplenish={handleConfirmReplenish}
                decrementData={decrementData}
                setDecrementData={setDecrementData}
                handleConfirmDecrement={handleConfirmDecrement}
            />

            {/* Edit Dialog */}
            <Dialog open={!!editingPart} onOpenChange={(open) => !open && setEditingPart(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto !rounded-none p-0">
                    <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
                        <DialogTitle>Editar Repuesto</DialogTitle>
                    </DialogHeader>
                    <div className="px-6 pb-6">
                        {editingPart && (
                            <SparePartForm
                                initialData={editingPart}
                                categories={categories}
                                onSuccess={() => setEditingPart(null)}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
