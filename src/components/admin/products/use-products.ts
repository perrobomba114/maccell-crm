import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Product, Branch } from "@prisma/client";
import { deleteProduct, getAllProductsForExport, bulkUpsertProducts, ProductImportRow } from "@/actions/products";
import React from "react";

export function useProducts(branches: Branch[]) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "all");

    const currentSortColumn = searchParams.get("sort") || "sku";
    const currentSortDirection = searchParams.get("order") || "desc";

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            const currentSearch = params.get("search") || "";
            if (currentSearch !== searchTerm) {
                if (searchTerm) params.set("search", searchTerm);
                else params.delete("search");
                params.set("page", "1");
                router.push(`?${params.toString()}`);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, router, searchParams]);

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
        if (column === currentSortColumn) {
            const newOrder = currentSortDirection === "asc" ? "desc" : "asc";
            params.set("order", newOrder);
        } else {
            params.set("sort", column);
            params.set("order", "asc");
        }
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
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
        try {
            const res = await deleteProduct(productToDelete);
            if (res.success) {
                toast.success("Producto eliminado");
                router.refresh();
            } else {
                toast.error(res.error || "Error al eliminar producto");
            }
        } catch (error) {
            toast.error("Error inesperado al eliminar producto");
        } finally {
            setProductToDelete(null);
        }
    };

    const handleCreate = () => {
        setEditingProduct(undefined);
        setIsFormOpen(true);
    };

    const handleExport = async () => {
        toast.promise(
            async () => {
                const { products, success, error } = await getAllProductsForExport();
                if (!success || !products) throw new Error(error || "Error al exportar");

                const headers = ["SKU", "Nombre", "Descripcion", "Categoria", "Costo", "Precio", ...branches.map(b => `Stock ${b.name}`)];

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
                    return row.map(cell => {
                        const cellStr = String(cell);
                        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\\n")) {
                            return `"${cellStr.replace(/"/g, '""')}"`;
                        }
                        return cellStr;
                    }).join(",");
                });

                const csvContent = [headers.join(","), ...rows].join("\\n");
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

        e.target.value = "";
        const text = await file.text();
        const lines = text.split(/\\r?\\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) {
            toast.error("El archivo CSV parece estar vacío o sin datos.");
            return;
        }

        const toastId = toast.loading("Procesando archivo...");
        try {
            const headers = parseCSVLine(lines[0]).map(h => h.trim());
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

            const branchMap: { index: number; branchId: string }[] = [];
            headers.forEach((header, idx) => {
                if (header.toLowerCase().includes("stock")) {
                    const branchName = header.replace(/stock/i, "").trim().replace(/[\\[\\]]/g, "");
                    const branch = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase());
                    if (branch) {
                        branchMap.push({ index: idx, branchId: branch.id });
                    }
                }
            });

            const parsedProducts: ProductImportRow[] = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                if (cols.length < headers.length) continue;

                const sku = cols[skuIdx].trim();
                if (!sku) continue;

                const name = nameIdx !== -1 ? cols[nameIdx].trim() : undefined;
                const categoryName = catIdx !== -1 ? cols[catIdx].trim() : undefined;
                const rawCost = costIdx !== -1 ? cols[costIdx].replace(/[^0-9.-]+/g, "") : "";
                const costPrice = rawCost ? parseFloat(rawCost) : undefined;
                const rawPrice = priceIdx !== -1 ? cols[priceIdx].replace(/[^0-9.-]+/g, "") : "";
                const price = rawPrice ? parseFloat(rawPrice) : undefined;
                const description = descIdx !== -1 ? cols[descIdx].trim() : undefined;

                const stocks = branchMap.map(bm => {
                    const cellValue = cols[bm.index]?.trim();
                    if (!cellValue) return null;
                    const quantity = parseInt(cellValue.replace(/[^0-9-]+/g, "") || "0");
                    return { branchId: bm.branchId, quantity };
                }).filter((s): s is { branchId: string; quantity: number } => s !== null);

                parsedProducts.push({ sku, name, categoryName, costPrice, price, description, stocks });
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
                        errorCount += chunk.length;
                        toast.error(`Error en lote: ${res.error}`, { id: progressToastId, duration: 2000 });
                    } else {
                        processed += (res.count || 0);
                        if (res.skippedSkus && res.skippedSkus.length > 0) {
                            globalSkippedSkus = [...globalSkippedSkus, ...res.skippedSkus];
                        }
                    }

                    toast.loading(`Importando... ${Math.min(processed + errorCount + globalSkippedSkus.length, total)}/${total}`, {
                        id: progressToastId
                    });
                }

                toast.dismiss(progressToastId);

                if (globalSkippedSkus.length > 0) {
                    toast.success(`Importación completada. Se omitieron ${globalSkippedSkus.length} productos.`);
                } else if (errorCount > 0) {
                    toast.error(`Proceso finalizado con ${errorCount} errores fatales.`, { duration: 5000 });
                } else {
                    toast.success(`Importación exitosa: ${processed} productos procesados.`, { duration: 4000 });
                }

                router.refresh();

            } catch (error) {
                console.error(error);
                toast.error("Error crítico durante la importación", { id: progressToastId });
            }

        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            toast.error("Error al procesar el archivo CSV.");
        }
    };

    const handleReport = () => {
        toast.info("Generando informe contable...");
        router.push("/admin/reports");
    };

    return {
        searchTerm, setSearchTerm,
        selectedCategory, setSelectedCategory,
        currentSortColumn, currentSortDirection: currentSortDirection as "asc" | "desc",
        isFormOpen, setIsFormOpen,
        editingProduct, setEditingProduct,
        productToDelete, setProductToDelete,
        createPageURL, handleCategoryChange, handleSort,
        handleEdit, handleDelete, confirmDelete, handleCreate, handleReport,
        handleExport, handleFileChange,
        router, searchParams, pathname
    };
}
