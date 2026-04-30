import { toast } from "sonner";
import { getAllSparePartsForExport, bulkUpsertSpareParts, type SparePartImportRow } from "@/actions/spare-parts";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export async function handleExport() {
    toast.promise(
        async () => {
            const { spareParts, success, error } = await getAllSparePartsForExport();
            if (!success || !spareParts) throw new Error(error || "Error al exportar");

            const headers = ["SKU", "Nombre", "Marca", "Categoria", "Stock Local", "Stock Deposito", "Max Stock Local", "Precio USD", "Precio ARG", "Precio POS"];

            const rows = spareParts.map(p => {
                const row = [
                    p.sku,
                    p.name,
                    p.brand,
                    p.category?.name || "Sin categoria",
                    p.stockLocal,
                    p.stockDepot,
                    p.maxStockLocal,
                    p.priceUsd,
                    p.priceArg,
                    p.pricePos
                ];

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
            link.setAttribute("download", `repuestos_${new Date().toISOString().split("T")[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        {
            loading: "Generando CSV...",
            success: "Repuestos exportados correctamente",
            error: (err) => `Error: ${err.message}`
        }
    );
}

const parseCSVLine = (line: string, delimiter: string): string[] => {
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
        } else if (char === delimiter && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
};

export async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, router: AppRouterInstance) {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = ""; // Reset

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) {
        toast.error("El archivo CSV parece estar vacío o sin datos.");
        return;
    }

    const toastId = toast.loading("Procesando archivo...");

    try {
        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semiCount = (firstLine.match(/;/g) || []).length;
        const delimiter = semiCount > commaCount ? ";" : ",";

        const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase());

        const skuIdx = headers.findIndex(h => h === "sku");
        const nameIdx = headers.findIndex(h => h === "nombre");
        const brandIdx = headers.findIndex(h => h === "marca");

        if (skuIdx === -1 || nameIdx === -1) {
            toast.dismiss(toastId);
            toast.error(`Faltan columnas requeridas (SKU, Nombre). Detectado separador: "${delimiter}"`);
            return;
        }

        const catIdx = headers.findIndex(h => h.includes("categor"));
        const stockLocalIdx = headers.findIndex(h =>
            (h.includes("local") && h.includes("stock") && !h.includes("max")) ||
            h === "stock"
        );
        const stockDepotIdx = headers.findIndex(h => h.includes("depo") && h.includes("stock"));
        const maxStockIdx = headers.findIndex(h => h.includes("max") && h.includes("stock"));
        const priceUsdIdx = headers.findIndex(h => h.includes("precio") && h.includes("usd"));
        const pricePosIdx = headers.findIndex(h => h.includes("pos") && h.includes("precio"));

        const parsedParts: SparePartImportRow[] = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i], delimiter);
            if (cols.length < headers.length && cols.length < 2) continue;

            const getVal = (idx: number) => idx !== -1 && cols[idx] ? cols[idx].trim() : "";

            const sku = getVal(skuIdx);
            const name = getVal(nameIdx);
            if (!sku || !name) continue;

            const brand = brandIdx !== -1 ? getVal(brandIdx) : "Generico";
            const categoryName = catIdx !== -1 ? getVal(catIdx) : undefined;

            const parseNum = (val: string, isInt: boolean = true) => {
                if (!val) return 0;
                let clean = val.replace(/[^0-9.,-]/g, "").trim();
                if (clean.includes(",") && !clean.includes(".")) {
                    clean = clean.replace(",", ".");
                } else if (clean.includes(",") && clean.includes(".")) {
                    clean = clean.replace(/\./g, "").replace(",", ".");
                }
                const num = parseFloat(clean);
                return isNaN(num) ? 0 : (isInt ? Math.round(num) : num);
            };

            const stockLocal = parseNum(getVal(stockLocalIdx));
            const stockDepot = parseNum(getVal(stockDepotIdx));
            const maxStockLocal = parseNum(getVal(maxStockIdx));
            const priceUsd = parseNum(getVal(priceUsdIdx), false);
            const pricePosRaw = getVal(pricePosIdx);
            const pricePos = pricePosRaw ? parseNum(pricePosRaw, false) : undefined;

            parsedParts.push({
                sku,
                name,
                brand,
                categoryName,
                stockLocal,
                stockDepot,
                maxStockLocal,
                priceUsd,
                ...(pricePos !== undefined ? { pricePos } : {})
            });
        }

        toast.dismiss(toastId);
        toast.promise(bulkUpsertSpareParts(parsedParts), {
            loading: `Importando ${parsedParts.length} repuestos...`,
            success: (data) => {
                if (data.success) {
                    router.refresh();
                    return `Importación exitosa: ${data.count} procesados. ${data.errors?.length ? `(${data.errors.length} errores)` : ""}`;
                } else {
                    throw new Error(data.error);
                }
            },
            error: (err) => `Error: ${err.message}`
        });

    } catch (error) {
        console.error(error);
        toast.dismiss(toastId);
        toast.error("Error al procesar CSV");
    }
}
