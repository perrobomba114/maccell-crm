import { useState, useEffect } from "react";
import { toast } from "sonner";
import { scanForPrinters, printLabelZPL } from "@/actions/printer";
import { generateZpl } from "@/utils/zpl-generator";
import { SparePartWithCategory } from "@/types/spare-parts";

export function usePrinter() {
    const [printPart, setPrintPart] = useState<SparePartWithCategory | null>(null);
    const [printQuantity, setPrintQuantity] = useState(1);
    const [printPrefix, setPrintPrefix] = useState("");
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

    const handlePrintConfirm = async () => {
        if (!printPart) return;
        if (!printerIp) {
            toast.error("Por favor configure la IP de la impresora primero.");
            setIsConfiguringPrinter(true);
            return;
        }

        try {
            const zpl = generateZpl(printPart, printQuantity, printPrefix);
            let printSuccess = false;
            try {
                await fetch(`http://${printerIp}/pstprnt`, { method: 'POST', body: zpl, mode: 'no-cors' });
                printSuccess = true;
                toast.success("Enviado desde el Navegador a impresora local");
                setPrintPart(null);
            } catch (fallbackError) {
                console.warn("Fallo HTTP fetch, probando TCP...", fallbackError);
            }

            if (!printSuccess) {
                const res = await printLabelZPL(printerIp, zpl);
                if (res.success) {
                    toast.success("Enviado al servidor de impresión local (TCP)");
                    setPrintPart(null);
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
        printPart, setPrintPart,
        printQuantity, setPrintQuantity,
        printPrefix, setPrintPrefix,
        printerIp, setPrinterIp,
        isConfiguringPrinter, setIsConfiguringPrinter,
        scannedPrinters,
        isScanning,
        handleScanPrinters,
        handleSelectPrinter,
        handlePrintConfirm
    };
}
