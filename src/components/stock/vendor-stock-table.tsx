
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { removeStockUnitAction } from "@/actions/stock";
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

interface VendorStockTableProps {
    data: any[];
    totalPages: number;
    currentPage: number;
    totalItems: number;
    userBranchName: string;
}

export function VendorStockTable({ data, totalPages, currentPage, totalItems, userBranchName }: VendorStockTableProps) {
    const router = useRouter();
    const [itemToRemove, setItemToRemove] = useState<any>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const isMaccell2 = userBranchName?.toUpperCase().includes("MACCELL 2");

    const handleRemoveStock = async () => {
        if (!itemToRemove) return;

        setIsRemoving(true);
        try {
            const result = await removeStockUnitAction(itemToRemove.id);
            if (result.success) {
                toast.success("Unidad dada de baja correctamente");
                setItemToRemove(null);
                // Router refresh handled in action by revalidatePath, but triggering refresh here ensures UI sync 
                router.refresh();
            } else {
                toast.error(result.error || "Error al dar de baja");
            }
        } catch (error) {
            toast.error("Error inesperado");
        } finally {
            setIsRemoving(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        // We use window.location.search to preserve existing query params (like search query)
        const params = new URLSearchParams(window.location.search);
        params.set("page", newPage.toString());
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[120px] text-center">SKU</TableHead>
                            <TableHead className="text-center">Nombre</TableHead>
                            <TableHead className="w-[150px] text-center">Marca</TableHead>
                            <TableHead className="w-[150px] text-center">Categoría</TableHead>
                            <TableHead className="w-[100px] text-center">Precio Fijo</TableHead>
                            <TableHead className="w-[100px] text-center">Stock</TableHead>
                            {isMaccell2 && <TableHead className="w-[100px] text-center">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isMaccell2 ? 7 : 6} className="h-24 text-center text-muted-foreground">
                                    No se encontraron productos.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.id} className="hover:bg-muted/10">
                                    <TableCell className="text-center font-mono font-bold text-base bg-muted/5">{item.sku}</TableCell>
                                    <TableCell className="text-center font-medium text-base">{item.name}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="font-bold bg-blue-600 text-white hover:bg-blue-700 border-none">
                                            {item.brand}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="font-bold bg-slate-700 text-white hover:bg-slate-800 border-none">
                                            {item.categoryName}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-base">
                                        ${Number(item.pricePos || 0).toLocaleString('es-AR')}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {isMaccell2 ? (
                                            /* MACCELL 2: Show Exact Number */
                                            item.stockLocal > 0 ? (
                                                <Badge className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-1">
                                                    {item.stockLocal}
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="font-bold px-4 py-1">
                                                    0
                                                </Badge>
                                            )
                                        ) : (
                                            /* OTHERS: Show Status Text */
                                            item.stockLocal > 0 ? (
                                                <Badge className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-1">
                                                    DISPONIBLE
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="font-bold px-4 py-1">
                                                    NO DISPONIBLE
                                                </Badge>
                                            )
                                        )}
                                    </TableCell>
                                    {isMaccell2 && (
                                        <TableCell className="text-center">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                disabled={item.stockLocal <= 0}
                                                onClick={() => setItemToRemove(item)}
                                                title="Dar de baja una unidad"
                                            >
                                                <MinusCircle className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                    Total: <span className="font-medium text-foreground">{totalItems}</span> resultados
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                        </Button>
                        <div className="text-sm font-medium">
                            Página {currentPage} de {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                        >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
            {/* Remove Confirmation Dialog */}
            <AlertDialog open={!!itemToRemove} onOpenChange={(open) => !open && setItemToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar baja de unidad?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se descontará 1 unidad del stock de <strong>{itemToRemove?.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleRemoveStock(); }}
                            disabled={isRemoving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isRemoving ? "Procesando..." : "Confirmar Baja"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
