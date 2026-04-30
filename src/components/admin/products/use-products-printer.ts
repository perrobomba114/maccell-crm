import { useState, useEffect } from "react";
import { toast } from "sonner";
import { scanForPrinters, printLabelZPL } from "@/actions/printer";
import { generateProductZpl } from "@/utils/zpl-generator";
import { Product } from "@prisma/client";

export function useProductsPrinter() {
    const [printProduct, setPrintProduct] = useState<Product | null>(null);
    const [printQuantity, setPrintQuantity] = useState(1);
    const [printPrefix, setPrintPrefix] = useState("");

    const [printerIp, setPrinterIp] = useState("");
    const [isConfiguringPrinter, setIsConfiguringPrinter] = useState(false);
    const [scannedPrinters, setScannedPrinters] = useState<{ ip: string }[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [is300Dpi, setIs300Dpi] = useState(false);
    const [manualOffset, setManualOffset] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem("zebra_printer_ip_products");
        if (saved) setPrinterIp(saved);
        else {
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

            let printSuccess = false;
            try {
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

    return {
        printProduct, setPrintProduct,
        printQuantity, setPrintQuantity,
        printPrefix, setPrintPrefix,
        printerIp, setPrinterIp,
        isConfiguringPrinter, setIsConfiguringPrinter,
        scannedPrinters,
        isScanning,
        is300Dpi,
        manualOffset,
        handleScanPrinters,
        handleSelectPrinter,
        handleToggleDpi,
        handleOffsetChange,
        handlePrintClick,
        handlePrintConfirm
    };
}
