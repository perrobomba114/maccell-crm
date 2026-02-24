"use client";

import { Category, Product, ProductStock, Branch } from "@prisma/client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Download,
    Upload,
    FileBarChart,
    Filter,
    Printer,
    Settings,
    RefreshCw,
    Check,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from "lucide-react";
import { ProductForm } from "./product-form";
import { deleteProduct, getAllProductsForExport, bulkUpsertProducts, ProductImportRow } from "@/actions/products";
import { scanForPrinters, printLabelZPL } from "@/actions/printer";
import { generateProductZpl } from "@/utils/zpl-generator";
import { toast } from "sonner";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import * as React from "react";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import JsBarcode from "jsbarcode";

// Extended type to include relations if needed, though initial fetch might return basic Product
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

// Helper to get consistent colors for branches
const getBranchColor = (branchName: string) => {
    const name = branchName.toLowerCase();
    if (name.includes("maccell 1")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (name.includes("maccell 2")) return "bg-violet-100 text-violet-800 border-violet-200";
    if (name.includes("maccell 3")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (name.includes("8 bit")) return "bg-pink-100 text-pink-800 border-pink-200";
    // Fallback for others
    return "bg-cyan-100 text-cyan-800 border-cyan-200";
};

export function ProductsClient({ initialProducts, categories, branches, totalPages, currentPage }: ProductsClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams(); // Hook to read URL params

    // Initialize state from URL params
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "all");

    // Sort state extraction
    const currentSortColumn = searchParams.get("sort") || "sku";
    const currentSortDirection = searchParams.get("order") || "desc";

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);
    const [printProduct, setPrintProduct] = useState<Product | null>(null);
    const [printQuantity, setPrintQuantity] = useState(1);
    const [printPrefix, setPrintPrefix] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

    // Printer Config State (Products specific)
    const [printerIp, setPrinterIp] = useState("");
    const [isConfiguringPrinter, setIsConfiguringPrinter] = useState(false);
    const [scannedPrinters, setScannedPrinters] = useState<{ ip: string }[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [is300Dpi, setIs300Dpi] = useState(false);
    const [manualOffset, setManualOffset] = useState(0);

    useEffect(() => {
        // Use separate key for products printer in case they have a different label roll/printer
        const saved = localStorage.getItem("zebra_printer_ip_products");
        if (saved) setPrinterIp(saved);
        else {
            // Fallback to generic if not found (maybe they have a 1 printer for all)
            const generic = localStorage.getItem("zebra_printer_ip");
            if (generic) setPrinterIp(generic);
        }

        const savedDpi = localStorage.getItem("zebra_printer_is_300dpi");
        if (savedDpi === "true") setIs300Dpi(true);

        const savedOffset = localStorage.getItem("zebra_printer_x_offset");
        if (savedOffset) setManualOffset(parseInt(savedOffset));
    }, []);

    const handleScanPrinters = async () => {
        setIsScanning(true);
        setScannedPrinters([]);
        try {
            const res = await scanForPrinters();
            if (res.success) {
                setScannedPrinters(res.printers);
                if (res.printers.length === 0) toast.info("No se encontraron dispositivos en el puerto 9100");
            } else {
                toast.error(res.error);
            }
        } catch (e) {
            toast.error("Error al escanear");
        }
        setIsScanning(false);
    };

    const handleSelectPrinter = (ip: string) => {
        setPrinterIp(ip);
        localStorage.setItem("zebra_printer_ip_products", ip);
        toast.success(`Impresora de PRODUCTOS configurada: ${ip}`);
        setIsConfiguringPrinter(false);
    };

    const handleToggleDpi = (checked: boolean) => {
        setIs300Dpi(checked);
        localStorage.setItem("zebra_printer_is_300dpi", String(checked));
    };

    const handleOffsetChange = (val: number[]) => {
        setManualOffset(val[0]);
        localStorage.setItem("zebra_printer_x_offset", String(val[0]));
    };

    // Since page.tsx passes filtered products, we use initialProducts directly.
    const filteredProducts = initialProducts;
    console.log('ProductsClient Params:', { totalPages, currentPage, productsLength: filteredProducts.length });

    // Effect to debounce search term changes and push to URL
    React.useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            const currentSearch = params.get("search") || "";

            // Only push if value is actually different
            if (currentSearch !== searchTerm) {
                if (searchTerm) params.set("search", searchTerm);
                else params.delete("search");
                params.set("page", "1"); // Reset to page 1 on search
                router.push(`?${params.toString()}`);
            }
        }, 500); // Debounce for 500ms
        return () => clearTimeout(timeoutId);
    }, [searchTerm, router, searchParams]);

    const pathname = usePathname();

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    const handleCategoryChange = (value: string) => {
        setSelectedCategory(value);
        const params = new URLSearchParams(searchParams.toString());
        if (value !== "all") params.set("category", value);
        else params.delete("category");
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleSort = (column: string) => {
        const params = new URLSearchParams(searchParams.toString());

        // If same column, toggle direction
        if (column === currentSortColumn) {
            const newOrder = currentSortDirection === "asc" ? "desc" : "asc";
            params.set("order", newOrder);
        } else {
            // New column, default to asc for names/text, desc for numbers usually, but let's stick to asc default
            params.set("sort", column);
            params.set("order", "asc"); // Default new sort to ascending
        }

        // Reset to page 1 on sort change
        params.set("page", "1");

        router.push(`${pathname}?${params.toString()}`);
    };

    const renderSortArrow = (column: string) => {
        if (currentSortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        if (currentSortDirection === "asc") return <ArrowUp className="ml-2 h-4 w-4 text-primary" />;
        return <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
    };




    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        setProductToDelete(id);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;

        const res = await deleteProduct(productToDelete);
        if (res.success) {
            toast.success("Producto eliminado");
            router.refresh();
        } else {
            toast.error(res.error);
        }
        setProductToDelete(null);
    };

    const handleCreate = () => {
        setEditingProduct(undefined);
        setIsFormOpen(true);
    };

    // Placeholder actions
    const handleExport = async () => {
        toast.promise(
            async () => {
                const { products, success, error } = await getAllProductsForExport();
                if (!success || !products) throw new Error(error || "Error al exportar");

                // Headers
                const headers = ["SKU", "Nombre", "Descripcion", "Categoria", "Costo", "Precio", ...branches.map(b => `Stock ${b.name}`)];



                // Rows
                const rows = products.map(p => {
                    const row = [
                        p.sku,
                        p.name,
                        p.description || "",
                        p.category?.name || "Sin categoria",
                        p.costPrice,
                        p.price,
                        ...branches.map(b => {
                            const s = p.stock.find(st => st.branchId === b.id);
                            return s ? s.quantity : 0;
                        })
                    ];
                    // Clean strings for CSV (escape quotes)
                    return row.map(cell => {
                        const cellStr = String(cell);
                        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
                            return `"${cellStr.replace(/"/g, '""')}"`;
                        }
                        return cellStr;
                    }).join(",");
                });

                const csvContent = [headers.join(","), ...rows].join("\n");
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `maccell_productos_${new Date().toISOString().split("T")[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            {
                loading: "Generando CSV...",
                success: "Catálogo exportado correctamente",
                error: (err) => `Error: ${err.message}`
            }
        );
    };

    const handleImport = () => {
        fileInputRef.current?.click();
    };

    const parseCSVLine = (line: string): string[] => {
        const result = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = "";
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input so same file can be selected again if needed
        e.target.value = "";

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) {
            toast.error("El archivo CSV parece estar vacío o sin datos.");
            return;
        }

        const toastId = toast.loading("Procesando archivo...");

        try {
            const headers = parseCSVLine(lines[0]).map(h => h.trim());

            // Map headers to field indices
            const skuIdx = headers.findIndex(h => h.toLowerCase() === "sku");
            const nameIdx = headers.findIndex(h => h.toLowerCase() === "nombre");
            const catIdx = headers.findIndex(h => h.toLowerCase() === "categoria");
            const costIdx = headers.findIndex(h => h.toLowerCase().includes("costo"));
            const priceIdx = headers.findIndex(h => h.toLowerCase() === "precio");
            const descIdx = headers.findIndex(h => h.toLowerCase().includes("descripcion"));

            if (skuIdx === -1) {
                toast.dismiss(toastId);
                toast.error("Formato CSV inválido. Falta columna requerida (SKU).");
                return;
            }

            // Detect Branch columns: "Stock [BranchName]" or "Stock Maccell 1"
            const branchMap: { index: number; branchId: string }[] = [];
            headers.forEach((header, idx) => {
                if (header.toLowerCase().includes("stock")) {
                    const branchName = header.replace(/stock/i, "").trim().replace(/[\[\]]/g, "");
                    const branch = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase());
                    if (branch) {
                        branchMap.push({ index: idx, branchId: branch.id });
                    }
                }
            });

            const parsedProducts: ProductImportRow[] = [];

            for (let i = 1; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                if (cols.length < headers.length) continue; // Skip malformed lines

                const sku = cols[skuIdx].trim();
                if (!sku) continue;

                const name = nameIdx !== -1 ? cols[nameIdx].trim() : undefined;
                const categoryName = catIdx !== -1 ? cols[catIdx].trim() : undefined;

                // Parse numbers safely. If NaN, undefined.
                const rawCost = costIdx !== -1 ? cols[costIdx].replace(/[^0-9.-]+/g, "") : "";
                const costPrice = rawCost ? parseFloat(rawCost) : undefined;

                const rawPrice = priceIdx !== -1 ? cols[priceIdx].replace(/[^0-9.-]+/g, "") : "";
                const price = rawPrice ? parseFloat(rawPrice) : undefined;

                const description = descIdx !== -1 ? cols[descIdx].trim() : undefined;

                const stocks = branchMap.map(bm => {
                    const cellValue = cols[bm.index]?.trim();
                    // If cell is empty, return null (to filter out later)
                    if (!cellValue) return null;

                    const quantity = parseInt(cellValue.replace(/[^0-9-]+/g, "") || "0");
                    return {
                        branchId: bm.branchId,
                        quantity
                    };
                }).filter((s): s is { branchId: string; quantity: number } => s !== null);

                parsedProducts.push({
                    sku,
                    name,
                    categoryName,
                    costPrice,
                    price,
                    description,
                    stocks
                });
            }

            toast.dismiss(toastId);
            const BATCH_SIZE = 50;
            const total = parsedProducts.length;
            let processed = 0;
            let errorCount = 0;
            let globalSkippedSkus: string[] = [];

            const progressToastId = toast.loading(`Iniciando importación de ${total} productos...`);

            try {
                for (let i = 0; i < total; i += BATCH_SIZE) {
                    const chunk = parsedProducts.slice(i, i + BATCH_SIZE);
                    const res = await bulkUpsertProducts(chunk);

                    if (!res.success) {
                        console.error(`Error en lote ${i}-${i + BATCH_SIZE}:`, res.error);
                        errorCount += chunk.length;
                        toast.error(`Error en lote: ${res.error}`, { id: progressToastId, duration: 2000 });
                    } else {
                        processed += (res.count || 0);
                        if (res.skippedSkus && res.skippedSkus.length > 0) {
                            globalSkippedSkus = [...globalSkippedSkus, ...res.skippedSkus];
                        }
                    }

                    // Update progress
                    toast.loading(`Importando... ${Math.min(processed + errorCount + globalSkippedSkus.length, total)}/${total} (${Math.round(((processed + errorCount + globalSkippedSkus.length) / total) * 100)}%)`, {
                        id: progressToastId
                    });
                }

                toast.dismiss(progressToastId);

                if (globalSkippedSkus.length > 0) {
                    toast.success(`Importación completada. Se omitieron ${globalSkippedSkus.length} productos por falta de datos.`);
                    toast.custom((t: any) => (
                        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                            <div className="flex-1 w-0 p-4">
                                <div className="flex flex-col gap-2">
                                    <span className="font-semibold text-sm text-gray-900">SKUs Omitidos</span>
                                    <p className="text-xs text-gray-500">Estos productos nuevos no tienen Nombre, Precio o Costo.</p>
                                    <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs break-all border border-gray-200 text-gray-700">
                                        {globalSkippedSkus.join(", ")}
                                    </div>
                                </div>
                            </div>
                            <div className="flex border-l border-gray-200">
                                <button
                                    onClick={() => toast.dismiss(t.id)}
                                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    ), { duration: 15000 });
                } else if (errorCount > 0) {
                    toast.error(`Proceso finalizado con ${errorCount} errores fatales.`, { duration: 5000 });
                } else {
                    toast.success(`Importación exitosa: ${processed} productos procesados.`, { duration: 4000 });
                }

                router.refresh();

            } catch (error) {
                console.error(error);
                toast.error(`Error crítico durante la importación: ${error instanceof Error ? error.message : "Desconocido"}`, { id: progressToastId });
            }

        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            toast.error("Error al procesar el archivo CSV.");
        }
    };

    const handlePrintClick = (product: Product) => {
        setPrintProduct(product);
        setPrintQuantity(1);
        setPrintPrefix("");
    };



    const handlePrintConfirm = async () => {
        if (!printProduct) return;

        if (!printerIp) {
            toast.error("Por favor configure la IP de la impresora primero.");
            setIsConfiguringPrinter(true);
            return;
        }

        try {
            const zpl = generateProductZpl(printProduct, printQuantity, printPrefix, is300Dpi, manualOffset);

            // INTENTO 1: Directo desde el navegador al printer (Obligatorio para entornos Cloud/Producción)
            let printSuccess = false;
            try {
                // Las impresoras Zebra escuchan POST HTTP en /pstprnt
                // mode 'no-cors' porque las impresoras no envían cabeceras CORS de vuelta
                await fetch(`http://${printerIp}/pstprnt`, {
                    method: 'POST',
                    body: zpl,
                    mode: 'no-cors'
                });
                printSuccess = true;
                toast.success(`Enviado desde Navegador (ZPL ${is300Dpi ? "300DPI" : "203DPI"} | X+${manualOffset})`);
                setPrintProduct(null);
            } catch (fallbackError) {
                console.warn("No se pudo imprimir vía HTTP fetch, intentado TCP...", fallbackError);
            }

            // INTENTO 2: Desde el Servidor vía TCP (Funciona si el Servidor está en la misma red local que la impresora)
            if (!printSuccess) {
                const res = await printLabelZPL(printerIp, zpl);

                if (res.success) {
                    toast.success(`Enviado desde Servidor Local (ZPL ${is300Dpi ? "300DPI" : "203DPI"} | X+${manualOffset})`);
                    setPrintProduct(null);
                } else {
                    toast.error("Error: " + res.error);
                }
            }
        } catch (e) {
            console.error(e);
            toast.error("Error inesperado al imprimir");
        }
    };

    const handleReport = () => {
        toast.info("Generando informe contable...");
        router.push("/admin/reports");
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex gap-2 w-full sm:w-auto flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o SKU..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white" size="sm" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={handleImport}>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar
                    </Button>
                    {/* Hidden Input for Import */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv"
                        onChange={handleFileChange}
                    />
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={handleReport}>
                        <FileBarChart className="mr-2 h-4 w-4" />
                        Informe
                    </Button>
                    <Button onClick={handleCreate} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo
                    </Button>
                </div>
            </div>

            {/* Table */}
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
                        {filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6 + branches.length} className="h-24 text-center">
                                    No se encontraron productos.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product) => {
                                // Calculate total stock across all branches
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
                                            const branchStock = product.stock?.find(s => s.branchId === branch.id)?.quantity || 0;
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
                                        })
                                        }
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
            </div >

            {/* Pagination Controls */}
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
                                        <PaginationLink
                                            href={createPageURL(p)}
                                            isActive={currentPage === p}
                                        >
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

            <Dialog open={!!printProduct} onOpenChange={(open) => !open && setPrintProduct(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            Imprimir Etiquetas de Producto
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsConfiguringPrinter(true)}
                                className={!printerIp ? "border-destructive text-destructive animate-pulse" : ""}
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                {printerIp ? "Configurar" : "CONFIGURAR IMPRESORA"}
                            </Button>
                        </DialogTitle>
                        <DialogDescription>
                            Producto: {printProduct?.name} <br />
                            SKU: {printProduct?.sku}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Status Bar */}
                    <div className={`text-xs px-3 py-1 rounded-sm flex items-center gap-2 border ${printerIp ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        <Printer className="h-3 w-3" />
                        {printerIp ? `Impresora: ${printerIp}` : "Impresora NO configurada"}
                    </div>

                    <div className="py-4">
                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium">Prefijo (opc):</label>
                            <Input
                                type="text"
                                maxLength={4}
                                placeholder="ABCD"
                                value={printPrefix}
                                onChange={(e) => setPrintPrefix(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                            <label className="text-sm font-medium">Cantidad:</label>
                            <Input
                                type="number"
                                min={1}
                                value={printQuantity || ""}
                                onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPrintProduct(null)}>Cancelar</Button>
                        <Button onClick={handlePrintConfirm} disabled={!printerIp}>Imprimir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >


            {/* Config Dialog */}
            <Dialog open={isConfiguringPrinter} onOpenChange={setIsConfiguringPrinter}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Configuración de Impresora térmica (Product)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            El sistema buscará impresoras Zebra (Puerto 9100).
                            <br />
                            <strong>Nota:</strong> Esta configuración es independiente de la sección de Repuestos, por si usa otra impresora/rollo.
                        </p>

                        <div className="flex gap-2">
                            <Input
                                placeholder="IP Manual (ej: 192.168.1.200)"
                                value={printerIp}
                                onChange={(e) => setPrinterIp(e.target.value)}
                            />
                            <Button onClick={() => handleSelectPrinter(printerIp)} disabled={!printerIp}>
                                Guardar
                            </Button>
                        </div>

                        <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/20">
                            <Checkbox
                                id="dpi-mode"
                                checked={is300Dpi}
                                onCheckedChange={(c) => handleToggleDpi(c as boolean)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="dpi-mode"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Modo Alta Resolución (300 DPI)
                                </label>
                                <p className="text-[10px] text-muted-foreground">
                                    Activar si la impresión sale muy pequeña o corrida hacia la izquierda.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 border p-3 rounded-md bg-muted/20">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Corrección Horizontal (Puntos)</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={manualOffset}
                                    onChange={(e) => handleOffsetChange([parseInt(e.target.value) || 0])}
                                    className="w-full"
                                    placeholder="0"
                                />
                                <span className="text-xs text-muted-foreground w-12 text-center">
                                    {manualOffset > 0 ? "+" : ""}{manualOffset} px
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Si sale cortado a la izquierda, aumente este valor (ej. 50, 100).
                            </p>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">O escanear red</span>
                            </div>
                        </div>

                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={handleScanPrinters}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Escaneando red local...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Buscar Impresoras Automáticamente
                                </>
                            )}
                        </Button>

                        {scannedPrinters.length > 0 && (
                            <div className="border rounded-md divide-y max-h-[150px] overflow-y-auto">
                                {scannedPrinters.map(p => (
                                    <div key={p.ip} className="p-3 flex justify-between items-center hover:bg-muted/50 cursor-pointer" onClick={() => handleSelectPrinter(p.ip)}>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{p.ip}</span>
                                            <span className="text-xs text-muted-foreground">Zebra / RAW Port 9100</span>
                                        </div>
                                        {printerIp === p.ip && <Check className="h-4 w-4 text-green-600" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Hidden Canvas for Generation (Legacy/State preservation) */}
            <div className="hidden">
                {/* No longer strictly needed for ZPL but keeping for safe refactor */}
            </div>

        </div >
    );
}
