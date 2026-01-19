"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { StockCheckButtons } from "./stock-check-buttons";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Package2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { checkLatestStockUpdate } from "@/actions/stock-check-actions";

interface Product {
    id: string;
    sku: string;
    name: string;
    categoryName: string;
    price: number;
    stockId: string;
    quantity: number;
    lastCheckedAt: Date | null;
}

interface StockTableProps {
    products: Product[];
    userId: string;
    branchId: string;
    currentPage: number;
    totalPages: number;
    initialQuery: string;
}

type SortKey = keyof Product | 'lastCheckedAt';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

export function StockTable({ products, userId, branchId, currentPage, totalPages, initialQuery }: StockTableProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [isSearching, setIsSearching] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== initialQuery) {
                const params = new URLSearchParams(window.location.search);
                if (searchTerm) {
                    params.set("q", searchTerm);
                } else {
                    params.delete("q");
                }
                params.set("page", "1"); // Reset to page 1 on search
                router.push(`?${params.toString()}`, { scroll: false });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, router, initialQuery]);

    // Update local state if URL changes (e.g. back button)
    useEffect(() => {
        if (!isSearching) {
            setSearchTerm(initialQuery);
        }
    }, [initialQuery, isSearching]);

    // Smart Polling
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    useEffect(() => {
        if (!branchId) return;

        const intervalId = setInterval(async () => {
            try {
                const latestUpdate = await checkLatestStockUpdate(branchId);

                if (latestUpdate && new Date(latestUpdate) > lastRefreshed) {
                    // Only refresh if the user is NOT actively typing to prevent focus loss/text interruption
                    if (!isSearching) {
                        console.log("New stock data detected, refreshing...");
                        router.refresh();
                        setLastRefreshed(new Date());
                    } else {
                        console.log("New data available but user is searching, skipping refresh for stability.");
                    }
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(intervalId);
    }, [router, branchId, lastRefreshed]);

    // Handle Sort
    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Pagination Handlers
    const goToPage = (page: number) => {
        const params = new URLSearchParams(window.location.search);
        params.set("page", page.toString());
        router.push(`?${params.toString()}`);
    };

    // Sort
    const sorted = [...products].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="ml-2 h-4 w-4 text-primary" />
            : <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
    };

    const SortableHeader = ({ label, column, className }: { label: string, column: SortKey, className?: string }) => (
        <TableHead className={className}>
            <Button
                variant="ghost"
                onClick={() => handleSort(column)}
                className="-ml-4 h-8 data-[state=open]:bg-accent hover:bg-transparent hover:text-foreground font-bold text-xs uppercase tracking-wider"
            >
                {label}
                <SortIcon column={column} />
            </Button>
        </TableHead>
    );

    return (
        <div className="space-y-4">
            {/* Header / Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-background/50 backdrop-blur-sm p-1 rounded-lg">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, SKU o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearching(true)}
                        onBlur={() => setIsSearching(false)}
                        className="pl-9 bg-background border-muted-foreground/20 focus-visible:ring-primary/20"
                    />
                </div>
                <div className="text-xs text-muted-foreground font-medium px-2 bg-muted/30 py-1.5 rounded-full border">
                    {sorted.length} productos listados (Total: {totalPages} págs)
                </div>
            </div>

            {/* Modern Table Card */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent border-b border-border/60">
                            <SortableHeader label="SKU" column="sku" />
                            <SortableHeader label="Producto" column="name" className="w-[30%]" />
                            <SortableHeader label="Categoría" column="categoryName" />
                            <SortableHeader label="Stock" column="quantity" />
                            <SortableHeader label="Último Control" column="lastCheckedAt" />
                            <TableHead className="text-right font-bold text-xs uppercase tracking-wider pr-6">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <Package2 className="h-8 w-8 opacity-20" />
                                        <p>No se encontraron productos que coincidan.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sorted.map((product) => (
                                <TableRow key={product.id} className="group hover:bg-muted/30 transition-colors border-border/40">
                                    <TableCell className="font-mono text-base font-bold text-foreground group-hover:text-primary transition-colors">
                                        {product.sku}
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground">
                                        {product.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        <Badge variant="outline" className="font-normal bg-background/50">
                                            {product.categoryName}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn(
                                            "font-mono font-bold text-sm bg-background border rounded px-2 py-0.5 inline-block min-w-[2.5rem] text-center shadow-sm",
                                            product.quantity <= 0 ? "text-red-500 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900" :
                                                product.quantity < 5 ? "text-orange-500 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900" :
                                                    "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900"
                                        )}>
                                            {product.quantity}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {product.lastCheckedAt ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground/90">
                                                    {format(new Date(product.lastCheckedAt), "dd/MM/yyyy", { locale: es })}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                                    {format(new Date(product.lastCheckedAt), "HH:mm", { locale: es })} hs
                                                </span>
                                            </div>
                                        ) : (
                                            <Badge variant="destructive" className="text-[10px] px-2 py-0.5 h-auto">
                                                Sin Control
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <StockCheckButtons
                                            stockId={product.stockId}
                                            productName={product.name}
                                            quantity={product.quantity}
                                            userId={userId}
                                            lastCheckedAt={product.lastCheckedAt}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage <= 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                        >
                            Siguiente
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex justify-end text-xs text-muted-foreground italic">
                * Haz clic en los encabezados para ordenar la tabla.
            </div>
        </div>
    );
}
