"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Settings, RefreshCw, Check, Upload } from "lucide-react";
import { toast } from "sonner";
import type { SparePartWithCategory } from "@/types/spare-parts";

type PrinterScanResult = { ip: string };
type UploadFontResult = { success: boolean; error?: string };

interface SparePartsPrinterDialogsProps {
    printPart: SparePartWithCategory | null;
    setPrintPart: (part: SparePartWithCategory | null) => void;
    printQuantity: number;
    setPrintQuantity: (qty: number) => void;
    printPrefix: string;
    setPrintPrefix: (prefix: string) => void;
    printerIp: string;
    setPrinterIp: (ip: string) => void;
    isConfiguringPrinter: boolean;
    setIsConfiguringPrinter: (open: boolean) => void;
    scannedPrinters: PrinterScanResult[];
    isScanning: boolean;
    handleScanPrinters: () => void;
    handleSelectPrinter: (ip: string) => void;
    handlePrintConfirm: () => void;
    uploadFontToPrinter: (ip: string) => Promise<UploadFontResult>;
}

export function SparePartsPrinterDialogs({
    printPart,
    setPrintPart,
    printQuantity,
    setPrintQuantity,
    printPrefix,
    setPrintPrefix,
    printerIp,
    setPrinterIp,
    isConfiguringPrinter,
    setIsConfiguringPrinter,
    scannedPrinters,
    isScanning,
    handleScanPrinters,
    handleSelectPrinter,
    handlePrintConfirm,
    uploadFontToPrinter
}: SparePartsPrinterDialogsProps) {
    return (
        <>
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
        </>
    );
}
