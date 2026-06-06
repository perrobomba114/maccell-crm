"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats, type Html5QrcodeCameraScanConfig } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Flashlight, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
    onResult: (result: string) => void;
    onClose: () => void;
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const hasScannedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [canUseTorch, setCanUseTorch] = useState(false);
    const [torchOn, setTorchOn] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined" && window.isSecureContext === false) {
            setError("La cámara requiere una conexión segura (HTTPS/Localhost).");
            setIsScanning(false);
            return;
        }

        const scanner = new Html5Qrcode("reader", {
            verbose: false,
            formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128],
            useBarCodeDetectorIfSupported: true,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        });
        scannerRef.current = scanner;
        let mounted = true;
        let isStarted = false;

        const config: Html5QrcodeCameraScanConfig = {
            fps: 12,
            disableFlip: true,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const width = Math.floor(Math.min(viewfinderWidth * 0.86, 420));
                const height = Math.floor(Math.max(86, Math.min(viewfinderHeight * 0.22, 130)));
                return { width, height };
            },
            videoConstraints: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30, max: 30 }
            }
        };

        const startScanner = async () => {
            try {
                setIsScanning(false);
                await scanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        const code = decodedText.trim();
                        if (mounted && code && !hasScannedRef.current) {
                            hasScannedRef.current = true;
                            onResult(code);
                        }
                    },
                    () => undefined
                );

                isStarted = true;
                setIsScanning(true);

                try {
                    const capabilities = scanner.getRunningTrackCameraCapabilities();
                    setCanUseTorch(capabilities.torchFeature().isSupported());

                    const zoom = capabilities.zoomFeature();
                    if (zoom.isSupported()) {
                        const targetZoom = Math.min(Math.max(zoom.value() || 1.6, zoom.min()), zoom.max(), 2);
                        await zoom.apply(targetZoom);
                    }
                } catch (capabilityError) {
                    console.warn("Scanner camera capability warning:", capabilityError);
                }

                if (!mounted) {
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

    const handleToggleTorch = async () => {
        if (!scannerRef.current) return;

        try {
            const torch = scannerRef.current.getRunningTrackCameraCapabilities().torchFeature();
            const nextValue = !torchOn;
            await torch.apply(nextValue);
            setTorchOn(nextValue);
        } catch (torchError) {
            console.warn("Scanner torch warning:", torchError);
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6 text-center bg-slate-950 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-blue-600 animate-pulse z-20" />

            <div className="space-y-1.5 pt-2">
                <h3 className="font-black text-xl text-white uppercase italic tracking-tighter">Escanear Repuesto</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Código 128 del repuesto</p>
            </div>

            <div className="relative w-full max-w-[380px] sm:max-w-md aspect-[4/3] rounded-2xl overflow-hidden border-2 border-slate-800 bg-black group transition-all hover:border-blue-500/50">
                <div id="reader" className="w-full h-full" />

                {/* Visual Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                    {/* Scanner Lines */}
                    <div className="w-[86%] h-[24%] border-2 border-blue-500/40 rounded-lg relative overflow-hidden shadow-[0_0_0_999px_rgba(2,6,23,0.38)]">
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_linear_infinite]" />
                    </div>
                </div>

                {!isScanning && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
                        <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-2" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Iniciando Cámara...</span>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(15vh); }
                }
                #reader video {
                    object-fit: cover !important;
                }
                #reader__scan_region {
                    min-height: 100% !important;
                }
            `}</style>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                    <p className="text-red-400 text-xs font-black uppercase tracking-widest leading-relaxed">{error}</p>
                </div>
            )}

            {canUseTorch && (
                <Button
                    variant="secondary"
                    onClick={handleToggleTorch}
                    className="w-full h-11 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-100 font-black uppercase tracking-widest rounded-2xl text-[11px]"
                >
                    <Flashlight className="mr-2 h-4 w-4" />
                    {torchOn ? "Apagar luz" : "Prender luz"}
                </Button>
            )}

            <Button
                variant="outline"
                onClick={onClose}
                className="w-full h-12 border-2 border-slate-800 hover:bg-slate-900 text-slate-400 font-black uppercase tracking-widest rounded-2xl text-[11px] transition-all"
            >
                Cancelar
            </Button>
        </div>
    );
}
