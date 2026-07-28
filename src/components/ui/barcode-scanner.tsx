"use client";

import { Button } from "@/components/ui/button";
import { Flashlight, Loader2 } from "lucide-react";
import { useBarcodeScanner } from "@/components/ui/use-barcode-scanner";

interface BarcodeScannerProps {
    onResult: (result: string) => boolean | void | Promise<boolean | void>;
    onClose: () => void;
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
    const scanner = useBarcodeScanner({ onResult, onClose });

    return (
        <div className="flex flex-col items-center gap-6 p-6 text-center bg-slate-950 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-blue-600 animate-pulse z-20" />

            <div className="space-y-1.5 pt-2">
                <h3 className="font-black text-xl text-white uppercase italic tracking-tighter">Escanear Repuesto</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Código 128 del repuesto</p>
                <p className="text-xs font-semibold text-blue-300/80">Se cerrará automáticamente al leer el repuesto.</p>
            </div>

            <div className="relative w-full max-w-[380px] sm:max-w-md aspect-[4/3] rounded-2xl overflow-hidden border-2 border-slate-800 bg-black group transition-all hover:border-blue-500/50">
                <div id="reader" ref={scanner.readerRef} className="relative h-full w-full overflow-hidden" />

                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                    <div className="w-[86%] h-[24%] border-2 border-blue-500/40 rounded-lg relative overflow-hidden shadow-[0_0_0_999px_rgba(2,6,23,0.38)]">
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_linear_infinite]" />
                    </div>
                </div>

                {!scanner.isScanning && !scanner.error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
                        <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-2" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Iniciando Cámara...</span>
                    </div>
                )}

                {scanner.isResolving && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20 px-4">
                        <Loader2 className="mb-3 h-10 w-10 animate-spin text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Buscando repuesto</span>
                        {scanner.detectedCode && <span className="mt-2 max-w-full truncate font-mono text-xs font-bold text-white/80">{scanner.detectedCode}</span>}
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

            {scanner.error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                    <p className="text-red-400 text-xs font-black uppercase tracking-widest leading-relaxed">{scanner.error}</p>
                </div>
            )}

            {scanner.canUseTorch && (
                <Button
                    variant="secondary"
                    onClick={() => void scanner.handleToggleTorch()}
                    className="w-full h-11 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-100 font-black uppercase tracking-widest rounded-2xl text-[11px]"
                >
                    <Flashlight className="mr-2 h-4 w-4" />
                    {scanner.torchOn ? "Apagar luz" : "Prender luz"}
                </Button>
            )}

            <Button
                variant="outline"
                onClick={() => void scanner.shutdownAndClose()}
                disabled={scanner.isClosing}
                className="w-full h-12 border-2 border-slate-800 hover:bg-slate-900 text-slate-400 font-black uppercase tracking-widest rounded-2xl text-[11px] transition-all"
            >
                {scanner.isClosing ? "Cerrando cámara..." : "Cancelar"}
            </Button>
        </div>
    );
}
