import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Printer, RefreshCw, Check } from "lucide-react";
import type { Product } from "@prisma/client";

type PrinterScanResult = { ip: string };

interface ProductsPrinterDialogsProps {
    printProduct: Product | null;
    setPrintProduct: (val: Product | null) => void;
    printQuantity: number;
    setPrintQuantity: (val: number) => void;
    printPrefix: string;
    setPrintPrefix: (val: string) => void;
    printerIp: string;
    setPrinterIp: (val: string) => void;
    isConfiguringPrinter: boolean;
    setIsConfiguringPrinter: (val: boolean) => void;
    scannedPrinters: PrinterScanResult[];
    isScanning: boolean;
    is300Dpi: boolean;
    manualOffset: number;
    handleScanPrinters: () => void;
    handleSelectPrinter: (ip: string) => void;
    handleToggleDpi: (val: boolean) => void;
    handleOffsetChange: (vals: number[]) => void;
    handlePrintConfirm: () => void;
}

export function ProductsPrinterDialogs({
    printProduct, setPrintProduct, printQuantity, setPrintQuantity, printPrefix, setPrintPrefix,
    printerIp, setPrinterIp, isConfiguringPrinter, setIsConfiguringPrinter,
    scannedPrinters, isScanning, is300Dpi, manualOffset,
    handleScanPrinters, handleSelectPrinter, handleToggleDpi, handleOffsetChange, handlePrintConfirm
}: ProductsPrinterDialogsProps) {
    return (
        <>
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
            </Dialog>

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
                                <label htmlFor="dpi-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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

                        <Button variant="secondary" className="w-full" onClick={handleScanPrinters} disabled={isScanning}>
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
        </>
    );
}
