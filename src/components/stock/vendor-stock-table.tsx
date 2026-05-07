
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, MinusCircle } from "lucide-react";
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

type VendorStockItem = {
    id: string;
    sku: string;
    name: string;
    brand: string;
    categoryName: string;
    pricePos: number | string | null;
    stockLocal: number;
};

interface VendorStockTableProps {
    data: VendorStockItem[];
    totalPages: number;
    currentPage: number;
    totalItems: number;
    userBranchName: string;
}

export function VendorStockTable({ data, totalPages, currentPage, totalItems, userBranchName }: VendorStockTableProps) {
    const router = useRouter();
    const [itemToRemove, setItemToRemove] = useState<VendorStockItem | null>(null);
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
            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader className="border-b-2 border-border bg-muted/70 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="text-center w-[120px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">SKU</TableHead>
                            <TableHead className="text-center px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Nombre</TableHead>
                            <TableHead className="text-center w-[150px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Marca</TableHead>
                            <TableHead className="text-center w-[150px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Categoría</TableHead>
                            <TableHead className="text-center w-[100px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Precio Fijo</TableHead>
                            <TableHead className="text-center w-[100px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Stock</TableHead>
                            {isMaccell2 && <TableHead className="text-center w-[100px] px-3 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground h-12">Acciones</TableHead>}
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
                                <TableRow key={item.id} className="border-b border-border/60 transition-colors hover:bg-muted/40 group">
                                    <TableCell className="text-center font-mono font-bold text-base text-foreground">
                                        <div className="inline-flex items-center justify-center bg-muted/50 px-2 py-1 rounded-md border border-border/50 tabular-nums">
                                            {item.sku}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-[13px] text-foreground uppercase tracking-tight leading-tight group-hover:text-blue-500 transition-colors duration-300">{item.name}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className="font-black bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 border border-blue-500/50 uppercase tracking-widest text-[10px] px-3 py-1">
                                            {item.brand}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="font-black bg-muted/50 text-muted-foreground hover:bg-muted/70 border-border uppercase tracking-widest text-[10px] px-3 py-1">
                                            {item.categoryName}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-base tabular-nums">
                                        ${Number(item.pricePos || 0).toLocaleString('es-AR')}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {isMaccell2 ? (
                                            /* MACCELL 2: Show Exact Number */
                                            item.stockLocal > 0 ? (
                                                <Badge className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 font-black px-4 py-1 text-base tabular-nums">
                                                    {item.stockLocal}
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/50 font-black px-4 py-1 text-base tabular-nums">
                                                    0
                                                </Badge>
                                            )
                                        ) : (
                                            /* OTHERS: Show Status Text */
                                            item.stockLocal > 0 ? (
                                                <Badge className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 font-black px-3 py-1 text-[10px] uppercase tracking-widest">
                                                    DISPONIBLE
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/50 font-black px-3 py-1 text-[10px] uppercase tracking-widest">
                                                    AGOTADO
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
