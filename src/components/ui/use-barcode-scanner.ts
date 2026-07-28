"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Quagga from "@ericblade/quagga2";
import type { QuaggaJSResultObject } from "@ericblade/quagga2";
import { createBarcodeDetectionStabilizer } from "@/lib/barcode-detection-stability";
import {
    BarcodeTrackCapabilities,
    buildBarcodeTrackConstraints,
    createBarcodeScannerShutdown,
    queueBarcodeCameraTransition,
} from "@/lib/barcode-scanner-lifecycle";

interface UseBarcodeScannerOptions {
    onResult: (result: string) => boolean | void | Promise<boolean | void>;
    onClose: () => void;
}

export function useBarcodeScanner({ onResult, onClose }: UseBarcodeScannerOptions) {
    const quaggaRef = useRef<typeof Quagga | null>(null);
    const readerRef = useRef<HTMLDivElement | null>(null);
    const onResultRef = useRef(onResult);
    const onCloseRef = useRef(onClose);
    const stopScannerRef = useRef<() => Promise<void>>(async () => undefined);
    const closingRef = useRef(false);
    const stabilizerRef = useRef(createBarcodeDetectionStabilizer({ requiredMatches: 3, minLength: 4 }));
    const hasScannedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [canUseTorch, setCanUseTorch] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [detectedCode, setDetectedCode] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        onResultRef.current = onResult;
        onCloseRef.current = onClose;
    }, [onClose, onResult]);

    const shutdownAndClose = useCallback(async () => {
        if (closingRef.current) return;

        closingRef.current = true;
        setIsClosing(true);
        try {
            const stopScanner = stopScannerRef.current;
            await stopScanner();
            onCloseRef.current();
        } catch (shutdownError) {
            console.warn("Scanner shutdown warning:", shutdownError);
            closingRef.current = false;
            setIsClosing(false);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && window.isSecureContext === false) {
            setError("La cámara requiere una conexión segura (HTTPS/Localhost).");
            setIsScanning(false);
            return;
        }

        let mounted = true;

        const handleDecodedText = async (decodedText: string) => {
            const code = decodedText.trim();
            if (!mounted || !code || hasScannedRef.current) return;

            hasScannedRef.current = true;
            setDetectedCode(code);
            setIsResolving(true);

            try {
                const shouldKeepLocked = await onResultRef.current(code);
                if (mounted && shouldKeepLocked === true) {
                    await shutdownAndClose();
                } else if (mounted && shouldKeepLocked === false) {
                    hasScannedRef.current = false;
                    stabilizerRef.current.reset();
                    setDetectedCode(null);
                    setIsResolving(false);
                }
            } catch (resultError) {
                if (!mounted) return;
                console.warn("Scanner result warning:", resultError);
                hasScannedRef.current = false;
                stabilizerRef.current.reset();
                setDetectedCode(null);
                setIsResolving(false);
            }
        };

        const handleDetected = (result: QuaggaJSResultObject) => {
            if (hasScannedRef.current) return;
            const code = stabilizerRef.current.push(result.codeResult?.code);
            if (code) void handleDecodedText(code);
        };

        const startScanner = async () => {
            const scannerTarget = readerRef.current;
            if (!scannerTarget) return;

            try {
                setIsScanning(false);
                const quaggaModule = await import("@ericblade/quagga2");
                const quagga = quaggaModule.default;
                if (!mounted) return;

                quaggaRef.current = quagga;
                stabilizerRef.current.reset();
                const stopScanner = createBarcodeScannerShutdown(quagga, handleDetected);
                stopScannerRef.current = stopScanner;

                await queueBarcodeCameraTransition(() => quagga.init({
                    inputStream: {
                        type: "LiveStream",
                        target: scannerTarget,
                        willReadFrequently: true,
                        constraints: {
                            facingMode: "environment",
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            frameRate: { ideal: 24, max: 30 },
                        },
                        area: { top: "28%", right: "4%", bottom: "28%", left: "4%" },
                    },
                    locate: true,
                    frequency: 8,
                    numOfWorkers: Math.max(0, Math.min((navigator.hardwareConcurrency || 2) - 1, 2)),
                    decoder: { readers: ["code_128_reader"], multiple: false },
                    locator: { patchSize: "medium", halfSample: false, willReadFrequently: true },
                    canvas: { createOverlay: false },
                }));

                if (!mounted) {
                    await stopScanner();
                    return;
                }

                quagga.onDetected(handleDetected);
                quagga.start();
                setIsScanning(true);

                try {
                    const track = quagga.CameraAccess.getActiveTrack();
                    const capabilities = track?.getCapabilities();
                    setCanUseTorch(Boolean(capabilities && "torch" in capabilities));

                    if (track && capabilities) {
                        const constraints = buildBarcodeTrackConstraints(
                            capabilities as MediaTrackCapabilities & BarcodeTrackCapabilities,
                        );
                        if (constraints) await track.applyConstraints(constraints);
                    }
                } catch (capabilityError) {
                    console.warn("Scanner camera capability warning:", capabilityError);
                }
            } catch (startError) {
                if (!mounted) return;
                console.error("Camera start error:", startError);
                const message = String(startError);

                if (message.includes("not supported") || message.includes("Insecure context")) {
                    setError("Requisito: HTTPS o Localhost.");
                } else if (message.includes("Permission denied") || message.includes("NotAllowedError")) {
                    setError("Permiso de cámara denegado.");
                } else if (message.includes("already in use") || message.includes("NotReadableError")) {
                    setError("La cámara ya está en uso por otra app.");
                } else if (!message.includes("AbortError")) {
                    setError("No se pudo iniciar la cámara.");
                }
                setIsScanning(false);
            }
        };

        void startScanner();

        return () => {
            mounted = false;
            void stopScannerRef.current().catch(cleanupError => {
                console.warn("Scanner cleanup warning:", cleanupError);
            });
            stabilizerRef.current.reset();
            quaggaRef.current = null;
        };
    }, [shutdownAndClose]);

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

    return {
        readerRef,
        error,
        isScanning,
        canUseTorch,
        torchOn,
        isResolving,
        detectedCode,
        isClosing,
        shutdownAndClose,
        handleToggleTorch,
    };
}
