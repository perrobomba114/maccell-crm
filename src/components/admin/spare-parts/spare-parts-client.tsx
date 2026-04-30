"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Pencil, Trash2, ArrowRightLeft, Download, Upload, FileBarChart, Printer, Settings, RefreshCw, Check, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scanForPrinters, printLabelZPL, uploadFontToPrinter } from "@/actions/printer";
import { generateZpl } from "@/utils/zpl-generator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { SparePartWithCategory } from "@/types/spare-parts";
import { Category } from "@prisma/client";
import { SparePartForm } from "./spare-part-form";
import {
    deleteSparePart,
    bulkUpsertSpareParts,
    getAllSparePartsForExport,
    replenishSparePart,
    decrementStockLocal,
    type SparePartImportRow
} from "@/actions/spare-parts";
import { toast } from "sonner";
import { handleExport, handleFileChange } from "./import-export-utils";
import { handleReplenishReport } from "./replenish-report-utils";

import { useRouter, useSearchParams } from "next/navigation";
import { BuyModal } from "./buy-modal";

interface SparePartsClientProps {
    initialData: SparePartWithCategory[];
    categories: Category[];
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import React from "react";

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export function SparePartsClient({ initialData, categories }: SparePartsClientProps) {
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get("query") || "");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    // React to URL changes (e.g. clicking a notification while already on the page)
    useEffect(() => {
        const query = searchParams.get("query");
        if (query) {
            setSearchTerm(query);
            setCurrentPage(1);
        }
    }, [searchParams]);

    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Sort handlers
    const handleSort = (column: string) => {
        const currentSort = searchParams.get("sort");
        const currentOrder = searchParams.get("order");

        const newOrder = currentSort === column && currentOrder === "asc" ? "desc" : "asc";

        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", column);
        params.set("order", newOrder);
        router.push(`?${params.toString()}`);
    };

    const getSortIcon = (column: string) => {
        const currentSort = searchParams.get("sort");
        const currentOrder = searchParams.get("order");

        if (currentSort !== column) return <ArrowDown className="w-3 h-3 opacity-0 group-hover/head:opacity-50" />;
        return <ArrowDown className={`w-3 h-3 transition-transform ${currentOrder === "asc" ? "rotate-180" : ""}`} />;
    };
    const [editingPart, setEditingPart] = useState<SparePartWithCategory | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Replenish Dialog State
    const [replenishData, setReplenishData] = useState<{ part: SparePartWithCategory, quantity: number } | null>(null);

    // Decrement Dialog State
    const [decrementData, setDecrementData] = useState<{ part: SparePartWithCategory } | null>(null);

    // Printing State
    const [printPart, setPrintPart] = useState<SparePartWithCategory | null>(null);
    const [printQuantity, setPrintQuantity] = useState(1);
    const [printPrefix, setPrintPrefix] = useState("");

    // Printer Config State
    const [printerIp, setPrinterIp] = useState("");
    const [isConfiguringPrinter, setIsConfiguringPrinter] = useState(false);
    const [scannedPrinters, setScannedPrinters] = useState<{ ip: string }[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("zebra_printer_ip");
        if (saved) setPrinterIp(saved);
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
        localStorage.setItem("zebra_printer_ip", ip);
        toast.success(`Impresora configurada: ${ip}`);
        setIsConfiguringPrinter(false);
    };
    const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

    const router = useRouter();

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Barcode effect
    useEffect(() => {
        if (printPart && barcodeCanvasRef.current) {
            try {
                // @ts-ignore
                import("jsbarcode").then(JsBarcode => {
                    if (barcodeCanvasRef.current) {
                        JsBarcode.default(barcodeCanvasRef.current, printPart.sku, {
                            format: "CODE128",
                            width: 2,
                            height: 50,
                            displayValue: true,
                            fontSize: 14,
                            margin: 0,
                            font: "monospace"
                        });
                    }
                });
            } catch (e) {
                console.error("Barcode generation failed", e);
            }
        }
    }, [printPart]);

    const filteredData = initialData.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Reset to page 1 when search changes
    if (currentPage > 1 && totalPages > 0 && currentPage > totalPages) {
        setCurrentPage(1);
    }

    // Effect to reset page when search term changes
    // We can't do this in render, so we'll use an effect or just reset in the onChange handler
    // Ideally put this in the onChange handler for setSearchTerm
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            const res = await deleteSparePart(deletingId);
            if (res.success) {
                toast.success("Repuesto eliminado");
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Error al eliminar");
            console.error(error);
        } finally {
            setDeletingId(null);
        }
    };

    
    const onExport = () => handleExport();
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e, router);

    const handleImport = () => {
        fileInputRef.current?.click();
    };


    const handleReport = () => {
        // Redirect to the new dedicated spare parts report page
        router.push("/admin/reports/repuestos");
    };

    
    const onReplenishReport = () => handleReplenishReport(initialData);


    const handleConfirmReplenish = async () => {
        if (!replenishData) return;

        try {
            const res = await replenishSparePart(replenishData.part.id, replenishData.quantity);
            if (res.success) {
                toast.success(`Se repuso ${replenishData.quantity}u de ${replenishData.part.name} con éxito`);
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al reponer");
        } finally {
            setReplenishData(null);
        }
    };

    const handleConfirmDecrement = async () => {
        if (!decrementData) return;

        try {
            const res = await decrementStockLocal(decrementData.part.id);
            if (res.success) {
                toast.success(`Se descontó 1 unidad de ${decrementData.part.name}`);
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al descontar");
        } finally {
            setDecrementData(null);
        }
    };

    // Barcode effect


    const handlePrintConfirm = async () => {
        if (!printPart) return;

        if (!printerIp) {
            toast.error("Por favor configure la IP de la impresora primero.");
            setIsConfiguringPrinter(true);
            return;
        }

        try {
            const zpl = generateZpl(printPart, printQuantity, printPrefix);

            // INTENTO 1: Directo desde el navegador (Nube -> Impresora Local)
            let printSuccess = false;
            try {
                // Zebra recibe raw ZPL por HTTP en /pstprnt
                await fetch(`http://${printerIp}/pstprnt`, {
                    method: 'POST',
                    body: zpl,
                    mode: 'no-cors'
                });
                printSuccess = true;
                toast.success("Enviado desde el Navegador a impresora local");
                setPrintPart(null);
            } catch (fallbackError) {
                console.warn("Fallo HTTP fetch, probando TCP...", fallbackError);
            }

            // INTENTO 2: Servidor (Funciona si el servidor de Next.js es local)
            if (!printSuccess) {
                const res = await printLabelZPL(printerIp, zpl);

                if (res.success) {
                    toast.success("Enviado al servidor de impresión local (TCP)");
                    setPrintPart(null); // Close dialog
                } else {
                    toast.error("Error: " + res.error);
                }
            }
        } catch (e) {
            console.error(e);
            toast.error("Error inesperado al imprimir");
        }
    };

    return (
        <div className="space-y-4">
            {/* Print Dialog */}
            <Dialog open={!!printPart} onOpenChange={(open) => !open && setPrintPart(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            Imprimir Etiquetas
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
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                        {/* Status Bar */}
                        <div className={`text-xs px-3 py-1 rounded-sm flex items-center gap-2 border ${printerIp ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                            <Printer className="h-3 w-3" />
                            {printerIp ? `Impresora: ${printerIp}` : "Impresora NO configurada"}
                        </div>

                        <div className="p-3 bg-muted rounded-md text-sm cursor-not-allowed opacity-80" title="Información del repuesto">
                            <p><strong>Producto:</strong> {printPart?.name}</p>
                            <p><strong>SKU:</strong> {printPart?.sku}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Prefijo CE (4 letras):</label>
                            <Input
                                maxLength={4}
                                placeholder="Ej: ABCD"
                                value={printPrefix}
                                onChange={(e) => setPrintPrefix(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Cantidad:</label>
                            <Input
                                type="number"
                                min={1}
                                value={printQuantity || ""}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setPrintQuantity(isNaN(val) ? 0 : val);
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Formato ZPL (55x44mm)</span>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setPrintPart(null)}>Cancelar</Button>
                            <Button onClick={handlePrintConfirm} disabled={!printerIp}>Imprimir</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Config Dialog */}
            <Dialog open={isConfiguringPrinter} onOpenChange={setIsConfiguringPrinter}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Configuración de Impresora térmica</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            El sistema buscará impresoras Zebra (Puerto 9100) en su red local.
                            Asegúrese de que el servidor tenga acceso a la red de la impresora.
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

                        <div className="pt-2">
                            <Button
                                variant="outline"
                                className="w-full text-xs h-8"
                                onClick={async () => {
                                    if (!printerIp) return toast.error("Configure IP primero");
                                    toast.promise(uploadFontToPrinter(printerIp), {
                                        loading: "Cargando fuente en memoria...",
                                        success: (res) => {
                                            if (res.success) return "Fuente instalada correctamente";
                                            throw new Error(res.error);
                                        },
                                        error: (e) => "Error al instalar fuente: " + e.message
                                    });
                                }}
                            >
                                <Upload className="h-3 w-3 mr-2" />
                                Instalar Fuente (Solo 1 vez)
                            </Button>
                            <p className="text-[10px] text-muted-foreground mt-1 text-center">
                                * Carga maccell.ttf en la memoria de la impresora.
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
                        {scannedPrinters.length === 0 && !isScanning && (
                            <div className="text-center text-xs text-muted-foreground py-2">
                                No se encontraron resultados recientes.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>



            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                <Input
                    placeholder="Buscar por nombre, SKU o marca..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="max-w-md w-full"
                />

                <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end">
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white" size="sm" onClick={onExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={handleImport}>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar
                    </Button>
                    {/* Hidden Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv"
                        onChange={onFileChange}
                    />
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={handleReport}>
                        <FileBarChart className="mr-2 h-4 w-4" />
                        Informe
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" size="sm" onClick={onReplenishReport}>
                        <FileBarChart className="mr-2 h-4 w-4" />
                        Reponer
                    </Button>
                    <BuyModal categories={categories} />

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Crear Nuevo Repuesto</DialogTitle>
                            </DialogHeader>
                            <SparePartForm
                                categories={categories}
                                onSuccess={() => setIsCreateOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className="w-[100px] text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort("sku")}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    SKU
                                    {getSortIcon("sku")}
                                </div>
                            </TableHead>
                            <TableHead
                                className="w-[300px] text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort("name")}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    Nombre
                                    {getSortIcon("name")}
                                </div>
                            </TableHead>
                            <TableHead
                                className="w-[150px] text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort("brand")}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    Marca
                                    {getSortIcon("brand")}
                                </div>
                            </TableHead>
                            <TableHead
                                className="w-[150px] text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort("category")}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    Categoría
                                    {getSortIcon("category")}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-center w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort("stockLocal")}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    Stock Local
                                    {getSortIcon("stockLocal")}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-center w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort("stockDepot")}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    Stock Dep.
                                    {getSortIcon("stockDepot")}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-center w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort("reponer")}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    Reponer
                                    {getSortIcon("reponer")}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-center w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort("priceUsd")}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    USD
                                    {getSortIcon("priceUsd")}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-center w-[120px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort("priceArg")}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    ARG
                                    {getSortIcon("priceArg")}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-center w-[100px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort("pricePos")}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    POS
                                    {getSortIcon("pricePos")}
                                </div>
                            </TableHead>
                            <TableHead className="text-center w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.map((item) => {
                            const needed = Math.max(0, item.maxStockLocal - item.stockLocal);
                            const reponer = Math.min(needed, item.stockDepot);

                            return (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono text-xs text-center">{item.sku}</TableCell>
                                    <TableCell className="font-medium text-center">{item.name}</TableCell>
                                    <TableCell className="text-center">{item.brand}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline">{item.category?.name || "Sin Cat."}</Badge>
                                    </TableCell>
                                    <TableCell className={`text-center font-bold ${item.stockLocal > 0 ? "text-green-600" : "text-destructive"}`}>
                                        {item.stockLocal}
                                    </TableCell>
                                    <TableCell className={`text-center font-bold ${item.stockDepot > 0 ? "text-green-600" : "text-destructive"}`}>
                                        {item.stockDepot}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {reponer > 0 ? (
                                            <Button
                                                variant="ghost"
                                                className="text-amber-600 font-bold flex items-center justify-center gap-1 hover:bg-amber-100 hover:text-amber-800"
                                                onClick={() => setReplenishData({ part: item, quantity: reponer })}
                                            >
                                                {reponer}
                                                <ArrowRightLeft className="h-3 w-3" />
                                            </Button>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center font-bold">
                                        ${item.priceUsd.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-green-600">
                                        ${item.priceArg.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-blue-600">
                                        ${(item.pricePos || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setPrintPart(item);
                                                    setPrintQuantity(1);
                                                    setPrintPrefix("");
                                                }}
                                                title="Imprimir Etiqueta"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDecrementData({ part: item })}
                                                disabled={item.stockLocal <= 0}
                                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                title="Descontar 1 del Local"
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingPart(item)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => setDeletingId(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {paginatedData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                                    No se encontraron repuestos.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {/* Pagination Controls */}
            {
                totalPages > 1 && (
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

                            {/* Page Numbers - Simplified logic for now */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    // Show first, last, current, and adjacent pages
                                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                                })
                                .map((page, index, array) => {
                                    // Add ellipsis if gap
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
                )
            }

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

            {/* Delete Alert */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el repuesto. Se marcará como &quot;Solo lectura&quot; en el sistema (Soft Delete).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Replenish Alert */}
            <AlertDialog open={!!replenishData} onOpenChange={(open) => !open && setReplenishData(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Reposición del Local</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Desea reponer <strong>{replenishData?.quantity}</strong> unidades de <strong>{replenishData?.part.name}</strong> al Stock Local?
                            <br /><br />
                            Esto restará {replenishData?.quantity} del Depósito y sumará {replenishData?.quantity} al Local.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmReplenish} className="bg-indigo-600 hover:bg-indigo-700">
                            Confirmar Reposición
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Decrement Alert */}
            <AlertDialog open={!!decrementData} onOpenChange={(open) => !open && setDecrementData(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar uso de Repuesto?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se descontará <strong>1 unidad</strong> de <strong>{decrementData?.part.name}</strong> del Stock Local.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDecrement} className="bg-orange-600 hover:bg-orange-700 text-white">
                            Descontar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
