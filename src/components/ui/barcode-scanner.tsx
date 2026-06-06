"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Flashlight, Loader2 } from "lucide-react";
import type Quagga from "@ericblade/quagga2";
import type { QuaggaJSResultObject } from "@ericblade/quagga2";

interface BarcodeScannerProps {
    onResult: (result: string) => boolean | void | Promise<boolean | void>;
    onClose: () => void;
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
    const quaggaRef = useRef<typeof Quagga | null>(null);
    const readerRef = useRef<HTMLDivElement | null>(null);
    const onResultRef = useRef(onResult);
    const hasScannedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [canUseTorch, setCanUseTorch] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [detectedCode, setDetectedCode] = useState<string | null>(null);

    useEffect(() => {
        onResultRef.current = onResult;
    }, [onResult]);

    useEffect(() => {
        if (typeof window !== "undefined" && window.isSecureContext === false) {
            setError("La cámara requiere una conexión segura (HTTPS/Localhost).");
            setIsScanning(false);
            return;
        }

        let mounted = true;
        let isStarted = false;

        const handleDecodedText = async (decodedText: string) => {
            const code = decodedText.trim();
            if (!mounted || !code || hasScannedRef.current) return;

            hasScannedRef.current = true;
            setDetectedCode(code);
            setIsResolving(true);

            try {
                const shouldKeepLocked = await onResultRef.current(code);
                if (mounted && shouldKeepLocked === false) {
                    hasScannedRef.current = false;
                    setDetectedCode(null);
                    setIsResolving(false);
                }
            } catch (resultError) {
                if (!mounted) return;
                console.warn("Scanner result warning:", resultError);
                hasScannedRef.current = false;
                setDetectedCode(null);
                setIsResolving(false);
            }
        };

        const handleDetected = (result: QuaggaJSResultObject) => {
            const code = result.codeResult?.code?.trim();
            if (!code) return;

            void handleDecodedText(code);
        };

        const startScanner = async () => {
            if (!readerRef.current) return;

            try {
                setIsScanning(false);
                const quaggaModule = await import("@ericblade/quagga2");
                const quagga = quaggaModule.default;
                quaggaRef.current = quagga;

                await quagga.init({
                    inputStream: {
                        type: "LiveStream",
                        target: readerRef.current,
                        willReadFrequently: true,
                        constraints: {
                            facingMode: "environment",
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30, max: 30 }
                        },
                        area: {
                            top: "28%",
                            right: "4%",
                            bottom: "28%",
                            left: "4%"
                        }
                    },
                    locate: true,
                    frequency: 8,
                    numOfWorkers: Math.max(0, Math.min((navigator.hardwareConcurrency || 2) - 1, 2)),
                    decoder: {
                        readers: ["code_128_reader"],
                        multiple: false
                    },
                    locator: {
                        patchSize: "medium",
                        halfSample: false,
                        willReadFrequently: true
                    },
                    canvas: {
                        createOverlay: false
                    }
                });

                quagga.onDetected(handleDetected);
                quagga.start();

                isStarted = true;
                setIsScanning(true);

                try {
                    const track = quagga.CameraAccess.getActiveTrack();
                    const capabilities = track?.getCapabilities();
                    setCanUseTorch(Boolean(capabilities && "torch" in capabilities));

                    if (track && capabilities && "zoom" in capabilities) {
                        const zoomCapability = capabilities.zoom;
                        if (typeof zoomCapability === "object" && zoomCapability && "min" in zoomCapability && "max" in zoomCapability) {
                            const min = Number(zoomCapability.min) || 1;
                            const max = Number(zoomCapability.max) || 1;
                            const targetZoom = Math.min(Math.max(1.4, min), max, 1.8);
                            await track.applyConstraints({ advanced: [{ zoom: targetZoom } as MediaTrackConstraintSet] });
                        }
                    }
                } catch (capabilityError) {
                    console.warn("Scanner camera capability warning:", capabilityError);
                }

                if (!mounted) {
                    quagga.offDetected(handleDetected);
                    await quagga.stop();
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
            if (isStarted && quaggaRef.current) {
                quaggaRef.current.offDetected(handleDetected);
                quaggaRef.current.stop().catch(err => {
                    console.warn("Scanner cleanup warning:", err);
                });
            }
            quaggaRef.current = null;
        };
    }, []);

    const handleToggleTorch = async () => {
        if (!quaggaRef.current) return;

        try {
            if (torchOn) {
                await quaggaRef.current.CameraAccess.disableTorch();
                setTorchOn(false);
            } else {
                await quaggaRef.current.CameraAccess.enableTorch();
                setTorchOn(true);
            }
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
                <div id="reader" ref={readerRef} className="relative h-full w-full overflow-hidden" />

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

                {isResolving && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20 px-4">
                        <Loader2 className="mb-3 h-10 w-10 animate-spin text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Buscando repuesto</span>
                        {detectedCode && <span className="mt-2 max-w-full truncate font-mono text-xs font-bold text-white/80">{detectedCode}</span>}
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(15vh); }
                }
                #reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                }
                #reader canvas {
                    position: absolute !important;
                    inset: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
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
