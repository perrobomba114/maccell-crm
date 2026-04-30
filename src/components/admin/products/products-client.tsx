"use client";

import { Category, Product, ProductStock, Branch } from "@prisma/client";
import { useRef } from "react";
import { ProductForm } from "./product-form";
import { useProducts } from "./use-products";
import { useProductsPrinter } from "./use-products-printer";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductsToolbar } from "./components/ProductsToolbar";
import { ProductsTable } from "./components/ProductsTable";
import { ProductsPrinterDialogs } from "./components/ProductsPrinterDialogs";

interface ProductWithRelations extends Product {
    category?: Category | null;
    stock?: ProductStock[];
}

interface ProductsClientProps {
    initialProducts: ProductWithRelations[];
    categories: Category[];
    branches: Branch[];
    totalPages: number;
    currentPage: number;
}

export function ProductsClient({ initialProducts, categories, branches, totalPages, currentPage }: ProductsClientProps) {
    const {
        searchTerm, setSearchTerm,
        selectedCategory,
        currentSortColumn, currentSortDirection,
        isFormOpen, setIsFormOpen,
        editingProduct,
        productToDelete, setProductToDelete,
        createPageURL, handleCategoryChange, handleSort,
        handleEdit, handleDelete, confirmDelete, handleCreate, handleReport,
        handleExport, handleFileChange,
    } = useProducts(branches);

    const {
        printProduct, setPrintProduct,
        printQuantity, setPrintQuantity,
        printPrefix, setPrintPrefix,
        printerIp, setPrinterIp,
        isConfiguringPrinter, setIsConfiguringPrinter,
        scannedPrinters, isScanning, is300Dpi, manualOffset,
        handleScanPrinters, handleSelectPrinter, handleToggleDpi,
        handleOffsetChange, handlePrintClick, handlePrintConfirm
    } = useProductsPrinter();

    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-4">
            <ProductsToolbar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCategory={selectedCategory}
                categories={categories}
                handleCategoryChange={handleCategoryChange}
                handleExport={handleExport}
                handleImport={() => fileInputRef.current?.click()}
                handleReport={handleReport}
                handleCreate={handleCreate}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
            />

            <ProductsTable
                products={initialProducts}
                branches={branches}
                currentSortColumn={currentSortColumn}
                currentSortDirection={currentSortDirection}
                handleSort={handleSort}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                handlePrintClick={handlePrintClick}
            />

            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href={currentPage > 1 ? createPageURL(currentPage - 1) : "#"}
                                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let p = i + 1;
                                if (totalPages > 5) {
                                    if (currentPage > 3) p = currentPage - 2 + i;
                                    if (p > totalPages) p = totalPages - (4 - i);
                                }
                                if (p > 0 && p <= totalPages) return (
                                    <PaginationItem key={p}>
                                        <PaginationLink href={createPageURL(p)} isActive={currentPage === p}>
                                            {p}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                                return null;
                            })}
                            <PaginationItem>
                                <PaginationNext
                                    href={currentPage < totalPages ? createPageURL(currentPage + 1) : "#"}
                                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}

            <ProductForm
                key={editingProduct?.id ?? 'new_product'}
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                product={editingProduct}
                categories={categories}
                branches={branches}
            />

            <AlertDialog open={!!productToDelete} onOpenChange={(open: boolean) => !open && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. El producto se moverá a la papelera.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ProductsPrinterDialogs
                printProduct={printProduct}
                setPrintProduct={setPrintProduct}
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
                is300Dpi={is300Dpi}
                manualOffset={manualOffset}
                handleScanPrinters={handleScanPrinters}
                handleSelectPrinter={handleSelectPrinter}
                handleToggleDpi={handleToggleDpi}
                handleOffsetChange={handleOffsetChange}
                handlePrintConfirm={handlePrintConfirm}
            />
        </div>
    );
}
