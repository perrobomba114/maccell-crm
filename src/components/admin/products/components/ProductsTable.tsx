import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Printer, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Branch, Product, ProductStock } from "@prisma/client";

type ProductWithStock = Product & {
    stock?: ProductStock[];
};

interface ProductsTableProps {
    products: ProductWithStock[];
    branches: Branch[];
    currentSortColumn: string;
    currentSortDirection: "asc" | "desc";
    handleSort: (column: string) => void;
    handleEdit: (product: ProductWithStock) => void;
    handleDelete: (id: string) => void;
    handlePrintClick: (product: ProductWithStock) => void;
}

export function ProductsTable({
    products, branches, currentSortColumn, currentSortDirection,
    handleSort, handleEdit, handleDelete, handlePrintClick
}: ProductsTableProps) {
    const renderSortArrow = (column: string) => {
        if (currentSortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        if (currentSortDirection === "asc") return <ArrowUp className="ml-2 h-4 w-4 text-primary" />;
        return <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
    };

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("sku")}>
                            <div className="flex items-center justify-center">
                                SKU {renderSortArrow("sku")}
                            </div>
                        </TableHead>
                        <TableHead className="text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("name")}>
                            <div className="flex items-center justify-center">
                                Producto {renderSortArrow("name")}
                            </div>
                        </TableHead>
                        <TableHead className="text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("costPrice")}>
                            <div className="flex items-center justify-center">
                                Costo {renderSortArrow("costPrice")}
                            </div>
                        </TableHead>
                        <TableHead className="text-center font-bold cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("price")}>
                            <div className="flex items-center justify-center">
                                Precio Venta {renderSortArrow("price")}
                            </div>
                        </TableHead>
                        <TableHead className="text-center">Stock Total</TableHead>
                        {branches.map(branch => (
                            <TableHead
                                key={branch.id}
                                className="text-center text-xs whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleSort(`stock_${branch.id}`)}
                            >
                                <div className="flex items-center justify-center">
                                    {branch.name} {renderSortArrow(`stock_${branch.id}`)}
                                </div>
                            </TableHead>
                        ))}
                        <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6 + branches.length} className="h-24 text-center">
                                No se encontraron productos.
                            </TableCell>
                        </TableRow>
                    ) : (
                        products.map((product) => {
                            const totalStock = product.stock?.reduce((acc, s) => acc + s.quantity, 0) || 0;

                            return (
                                <TableRow key={product.id}>
                                    <TableCell className="font-mono text-sm text-center">{product.sku}</TableCell>
                                    <TableCell className="font-medium text-center">
                                        <div className="flex flex-col items-center">
                                            <span>{product.name}</span>
                                            {product.description && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-muted-foreground">
                                        ${product.costPrice.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-green-600 dark:text-green-400">
                                        ${product.price.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={cn(
                                            "text-base font-bold",
                                            totalStock > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                        )}>
                                            {totalStock}
                                        </span>
                                    </TableCell>
                                    {branches.map(branch => {
                                        const branchStock = product.stock?.find((s) => s.branchId === branch.id)?.quantity || 0;
                                        return (
                                            <TableCell key={branch.id} className="text-center">
                                                <span className={cn(
                                                    "text-base font-bold",
                                                    branchStock > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                                )}>
                                                    {branchStock}
                                                </span>
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handlePrintClick(product)} title="Imprimir Etiqueta">
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
