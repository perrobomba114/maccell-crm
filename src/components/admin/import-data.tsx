"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, FileUp, Loader2, CheckCircle2, AlertCircle, Table as TableIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { importHistoricalSalesAction, clearAllHistoricalDataAction } from "@/actions/import-actions";
import { cn } from "@/lib/utils";

interface AdminImportDataProps {
    branches: { id: string, name: string }[];
}

export function AdminImportData({ branches }: AdminImportDataProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);

    const downloadTemplate = () => {
        const template = [
            {
                fecha: "2022-01-31",
                sucursal: branches[0]?.name || "Nombre Sucursal",
                monto: 500000,
                cantidad: 150
            },
            {
                fecha: "2023-05-20",
                sucursal: branches[1]?.name || "Nombre Sucursal",
                monto: 750000,
                cantidad: 210
            },
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ventas");

        // Add instructions sheet
        const instructions = [
            ["INSTRUCCIONES DE IMPORTACIÓN"],
            ["1. fecha: Debe estar en formato AAAA-MM-DD (Año-Mes-Día)"],
            ["2. sucursal: Debe coincidir exactamente con el nombre en el sistema"],
            ["3. monto: Total de ventas del periodo (sin signos de $ ni puntos de miles)"],
            ["4. cantidad: Cantidad de tickets/ventas realizadas (opcional)"],
            [""],
            ["SUCURSALES DISPONIBLES EN TU SISTEMA:"],
            ...branches.map(b => [b.name])
        ];
        const wsInst = XLSX.utils.aoa_to_sheet(instructions);
        XLSX.utils.book_append_sheet(wb, wsInst, "Instrucciones");

        XLSX.writeFile(wb, "Plantilla_Historico_MacCell.xlsx");
        toast.success("Plantilla descargada");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error("El archivo está vacío");
                    return;
                }

                // Sanitize data: Ensure all values are plain strings or numbers, no complex objects or NaNs
                const sanitized = data.map((row: any) => ({
                    fecha: row.fecha ? String(row.fecha).trim() : null,
                    sucursal: row.sucursal ? String(row.sucursal).trim() : null,
                    monto: isNaN(parseFloat(row.monto)) ? 0 : parseFloat(row.monto),
                    cantidad: isNaN(parseInt(row.cantidad)) ? 1 : parseInt(row.cantidad)
                }));

                setPreviewData(sanitized);
                toast.success(`${sanitized.length} filas detectadas`);
            } catch (err) {
                toast.error("Error al leer el archivo. Asegúrese de que sea un Excel válido.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const processImport = async () => {
        if (previewData.length === 0) return;

        setIsLoading(true);
        try {
            // Split into chunks of 500 to avoid server timeouts and transaction limits
            const chunkSize = 500;
            let totalImported = 0;

            for (let i = 0; i < previewData.length; i += chunkSize) {
                const chunk = previewData.slice(i, i + chunkSize);
                const toastId = toast.loading(`Importando lote ${Math.floor(i / chunkSize) + 1}...`);

                const result = await importHistoricalSalesAction(chunk);
                toast.dismiss(toastId);

                if (result.success) {
                    totalImported += (result.count || 0);
                } else {
                    toast.error(`Error en lote ${Math.floor(i / chunkSize) + 1}: ${result.error}`);
                    throw new Error(result.error);
                }
            }

            toast.success(`¡Importación exitosa! Se cargaron ${totalImported} registros históricos.`);
            setPreviewData([]);
            setFileName(null);
        } catch (err: any) {
            console.error("Import client error:", err);
            // toast.error is already handled inside the loop for specific chunks
            if (!err.message) toast.error("Error al procesar el archivo masivo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm("¿Estás seguro de que querés borrar TODO el historial importado? Esta acción no se puede deshacer.")) return;

        setIsLoading(true);
        try {
            const result = await clearAllHistoricalDataAction();
            if (result.success) {
                toast.success("Historial limpiado correctamente");
                setPreviewData([]);
            } else {
                toast.error(result.error);
            }
        } catch (err) {
            toast.error("Error al limpiar historial");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Danger Zone / Clear History */}
            <div className="flex justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 text-[10px] font-bold uppercase tracking-widest gap-2"
                    onClick={handleClearHistory}
                    disabled={isLoading}
                >
                    <Trash2 className="h-3 w-3" />
                    Limpiar Todo el Historial Importado
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Template Card */}
                <Card className="border-2 border-dashed bg-muted/5">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <FileDown className="h-5 w-5 text-primary" />
                            Paso 1: Descargar Plantilla
                        </CardTitle>
                        <CardDescription>
                            Baja el archivo Excel con las columnas configuradas y los nombres de tus sucursales actuales.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-xl border border-dashed flex flex-col gap-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Al descargar la plantilla, verás una pestaña con las <b>Instrucciones</b> y los nombres de las <b>Sucursales</b> que tenés creadas actualmente. Asegurate de que los nombres coincidan exactamente.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full h-12 border-primary/20 hover:border-primary hover:bg-primary/5 group"
                                onClick={downloadTemplate}
                            >
                                <FileDown className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                                Descargar Plantilla (.xlsx)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Upload Card */}
                <Card className={cn(
                    "border-2 transition-all duration-500",
                    fileName ? "border-primary/50 shadow-lg shadow-primary/5" : "border-muted"
                )}>
                    <CardHeader>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <FileUp className="h-5 w-5 text-primary" />
                            Paso 2: Subir y Procesar
                        </CardTitle>
                        <CardDescription>
                            Carga el archivo Excel completado. El sistema procesará los datos automáticamente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={isLoading}
                            />
                            <div className={cn(
                                "h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors",
                                fileName ? "bg-primary/5 border-primary" : "bg-muted/30 border-muted-foreground/20 hover:bg-muted/50"
                            )}>
                                <FileUp className={cn("h-8 w-8", fileName ? "text-primary" : "text-muted-foreground")} />
                                <span className="text-sm font-medium">
                                    {fileName || "Seleccionar o soltar archivo"}
                                </span>
                            </div>
                        </div>

                        {previewData.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between bg-primary/10 p-3 rounded-lg border border-primary/20">
                                    <div className="flex items-center gap-2 text-sm font-bold text-primary italic uppercase">
                                        <TableIcon className="h-4 w-4" />
                                        {previewData.length} Filas listas para importar
                                    </div>
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                </div>

                                <Button
                                    className="w-full h-12 text-lg font-black italic uppercase tracking-tighter"
                                    onClick={processImport}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Importando...
                                        </>
                                    ) : (
                                        "Confirmar Carga al Sistema"
                                    )}
                                </Button>
                            </div>
                        )}

                        {!fileName && (
                            <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-amber-500/5 p-3 rounded-lg border border-amber-500/20">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <p>
                                    <b>Importante:</b> Todas las ventas se cargarán como pago en <b>Efectivo</b> y se asociarán a tu usuario administrador para generar los cierres de caja históricos.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Preview Section */}
                {previewData.length > 0 && (
                    <Card className="lg:col-span-2 overflow-hidden border-orange-500/20">
                        <CardHeader className="bg-orange-500/5 border-b border-orange-500/10">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic text-orange-600">
                                Previsualización de Datos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[300px] overflow-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted sticky top-0">
                                        <tr>
                                            <th className="p-3">Fecha</th>
                                            <th className="p-3">Sucursal</th>
                                            <th className="p-3">Monto</th>
                                            <th className="p-3">Cant. Ventas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                                                <td className="p-3 font-medium">{row.fecha}</td>
                                                <td className="p-3">{row.sucursal}</td>
                                                <td className="p-3 font-bold text-emerald-600">${row.monto}</td>
                                                <td className="p-3">{row.cantidad || 1}</td>
                                            </tr>
                                        ))}
                                        {previewData.length > 10 && (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-muted-foreground italic">
                                                    Y {previewData.length - 10} filas más...
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
