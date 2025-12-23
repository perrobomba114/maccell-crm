"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerProps {
    onResult: (result: string) => void;
    onClose: () => void;
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined" && window.isSecureContext === false) {
            setError("La cámara requiere una conexión segura (HTTPS/Localhost).");
            setIsScanning(false);
            return;
        }

        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        let mounted = true;
        let isStarted = false;

        const config = {
            fps: 15, // Higher FPS for faster scanning
            // qrbox: { width: 300, height: 150 }, // Removed to allow full-screen scanning
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.CODE_93,
                Html5QrcodeSupportedFormats.CODABAR,
                Html5QrcodeSupportedFormats.ITF,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.QR_CODE,
            ]
        };

        const startScanner = async () => {
            try {
                await scanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        if (mounted) {
                            console.log("Scanned:", decodedText);
                            onResult(decodedText);
                            // We don't stop here. Parent unmounts us.
                        }
                    },
                    (_) => { }
                );

                // Mark as successfully started
                isStarted = true;

                // Check if we unmounted while starting
                if (!mounted) {
                    console.log("Unmounted during start, stopping scanner...");
                    await scanner.stop();
                }

            } catch (err) {
                if (!mounted) return;

                console.error("Camera start error:", err);
                const msg = err?.toString() || "";

                if (msg.includes("AbortError")) return;

                if (msg.includes("not supported") || msg.includes("Insecure context")) {
                    setError("Requisito: HTTPS o Localhost.");
                } else if (msg.includes("Permission denied")) {
                    setError("Permiso de cámara denegado.");
                } else if (msg.includes("Is the camera already in use")) {
                    setError("La cámara ya está en uso por otra app.");
                } else {
                    setError("No se pudo iniciar la cámara.");
                }
                setIsScanning(false);
            }
        };

        const timer = setTimeout(startScanner, 100);

        return () => {
            mounted = false;
            clearTimeout(timer);

            // Only stop if we know it started successfully.
            // If it's still starting (isStarted == false), the startScanner function
            // will detect !mounted and stop it.
            if (isStarted && scannerRef.current) {
                scannerRef.current.stop().catch(err => {
                    // Suppress "not running" errors which happen if we cleanup before start finishes
                    // or if start failed.
                    const msg = err?.toString() || "";
                    if (!msg.includes("not running")) {
                        console.warn("Scanner cleanup warning:", err);
                    }
                });
            }
            scannerRef.current = null;
        };
    }, [onResult]);

    return (
        <div className="flex flex-col items-center gap-4 p-4 text-center">
            <h3 className="font-semibold text-lg">Escanear Código de Barras</h3>
            <p className="text-sm text-muted-foreground">Apunte la cámara al código del repuesto.</p>

            <div id="reader" className="w-[300px] h-[300px] bg-black rounded-lg overflow-hidden relative">
                {!isScanning && !error && <div className="absolute inset-0 flex items-center justify-center text-white"><Loader2 className="animate-spin h-8 w-8" /></div>}
            </div>

            {error && <p className="text-destructive text-sm font-medium">{error}</p>}

            <Button variant="secondary" onClick={onClose} className="w-full">
                Cancelar
            </Button>
        </div>
    );
}
