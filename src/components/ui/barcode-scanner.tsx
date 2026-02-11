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
        <div className="flex flex-col items-center gap-6 p-6 text-center bg-slate-950 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-blue-600 animate-pulse z-20" />

            <div className="space-y-1.5 pt-2">
                <h3 className="font-black text-xl text-white uppercase italic tracking-tighter">Escanear Repuesto</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Apunte al código de barras</p>
            </div>

            <div className="relative w-full max-w-[340px] sm:max-w-md aspect-square rounded-2xl overflow-hidden border-2 border-slate-800 bg-black group transition-all hover:border-blue-500/50">
                <div id="reader" className="w-full h-full" />

                {/* Visual Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                    {/* Scanner Lines */}
                    <div className="w-[80%] h-[20%] border-2 border-blue-500/30 rounded-lg relative overflow-hidden">
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
            `}</style>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                    <p className="text-red-400 text-xs font-black uppercase tracking-widest leading-relaxed">{error}</p>
                </div>
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
