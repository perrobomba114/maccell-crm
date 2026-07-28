"use client";

import { ChangeEvent, useState, useRef, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X, ImagePlus, Camera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

// Detects mobile browsers where the native camera app gives a far better UX
// than the WebRTC stream API (correct rear camera, full resolution, etc.)
const isMobileBrowser = () =>
    typeof window !== "undefined" &&
    /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

export function RepairImages() {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Camera State (desktop WebRTC only)
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Sync files state to the hidden input using DataTransfer
    useEffect(() => {
        if (inputRef.current) {
            const dataTransfer = new DataTransfer();
            files.filter(f => f && f.size > 0).forEach(file => dataTransfer.items.add(file));
            inputRef.current.files = dataTransfer.files;
        }
    }, [files]);

    // Generate object URL previews — revoke on cleanup to avoid memory leaks
    useEffect(() => {
        const objectUrls = files.map(file => URL.createObjectURL(file));
        setPreviews(objectUrls);
        return () => { objectUrls.forEach(url => URL.revokeObjectURL(url)); };
    }, [files]);

    useEffect(() => {
        if (!isCameraOpen || !cameraStream || !videoRef.current) return;

        const video = videoRef.current;
        video.srcObject = cameraStream;
        void video.play().catch(() => {
            toast.error("No se pudo iniciar la vista previa de la cámara.");
        });

        return () => {
            if (video.srcObject === cameraStream) {
                video.srcObject = null;
            }
        };
    }, [cameraStream, isCameraOpen]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleRemove = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // ── Camera Handlers (desktop WebRTC) ──────────────────────────────────
    const startCamera = async (mode: "user" | "environment" = facingMode) => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setCameraStream(null);
        }
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: mode },
                    width: { ideal: 4096 },
                    height: { ideal: 2160 },
                }
            });
            streamRef.current = stream;
            setCameraStream(stream);
        } catch {
            toast.error("No se pudo acceder a la cámara. Verifique los permisos.");
            setIsCameraOpen(false);
        }
    };

    const toggleCamera = () => {
        const newMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(newMode);
        startCamera(newMode);
    };

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraStream(null);
        setIsCameraOpen(false);
    }, []);

    const capturePhoto = useCallback(() => {
        if (videoRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
                        setFiles(prev => [...prev, file]);
                        toast.success("Foto capturada");
                        stopCamera();
                    }
                }, "image/jpeg", 0.9);
            }
        }
    }, [stopCamera]);

    return (
        <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ImagePlus aria-hidden="true" className="h-4 w-4 text-primary" />
                Fotos del dispositivo
            </Label>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {/* Upload from gallery */}
                <div className="group relative flex aspect-square min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/50 transition-colors hover:border-primary/50 hover:bg-primary/5">
                    <ImagePlus aria-hidden="true" className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span className="mt-1 text-xs font-medium text-muted-foreground">Subir fotos</span>
                    <Input
                        ref={inputRef}
                        name="images"
                        type="file"
                        accept="image/*"
                        multiple
                        aria-label="Subir fotos del dispositivo"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        onChange={handleChange}
                    />
                </div>

                {/*
                  Camera Button strategy:
                  - Mobile: <input capture="environment"> → opens native OS camera app
                    (guaranteed rear camera, full resolution, no permissions API needed)
                  - Desktop: custom WebRTC dialog (facingMode toggle, canvas capture)
                */}
                {isMobileBrowser() ? (
                    <div className="group relative flex aspect-square min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/50 transition-colors hover:border-primary/50 hover:bg-primary/5">
                        <Camera aria-hidden="true" className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                        <span className="mt-1 text-xs font-medium text-muted-foreground">Cámara</span>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            aria-label="Tomar foto del dispositivo"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            onChange={handleChange}
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => startCamera()}
                        aria-label="Abrir cámara para fotografiar el dispositivo"
                        className="group relative flex aspect-square min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/50 transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                        <Camera aria-hidden="true" className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                        <span className="mt-1 text-xs font-medium text-muted-foreground">Cámara</span>
                    </button>
                )}

                {/* Previews */}
                {previews.map((src, idx) => (
                    <div key={src} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Foto ${idx + 1} del dispositivo`} className="h-full w-full object-cover" />
                        <button
                            type="button"
                            onClick={() => handleRemove(idx)}
                            aria-label={`Eliminar foto ${idx + 1}`}
                            className="absolute right-1 top-1 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white opacity-100 transition-colors hover:bg-destructive sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                        >
                            <X aria-hidden="true" className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>

            {files.length > 0 ? (
                <p aria-live="polite" className="text-center text-xs text-muted-foreground animate-in fade-in">
                    {files.length} {files.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}
                </p>
            ) : null}

            {/* Camera Dialog — desktop only */}
            <Dialog open={isCameraOpen} onOpenChange={(open) => !open && stopCamera()}>
                <DialogContent className="w-screen max-w-screen-sm p-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle>Tomar Foto</DialogTitle>
                    </DialogHeader>
                    <div className="relative bg-black overflow-hidden" style={{ aspectRatio: "4/3" }}>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        <Button
                            size="icon"
                            variant="secondary"
                            type="button"
                            className="absolute bottom-4 right-4 rounded-full w-12 h-12 shadow-lg bg-black/50 border-white/20 text-white hover:bg-black/70"
                            onClick={toggleCamera}
                            title="Cambiar cámara"
                        >
                            <RefreshCw className="h-6 w-6" />
                        </Button>
                    </div>
                    <DialogFooter className="flex sm:justify-between gap-2 p-4">
                        <Button variant="outline" onClick={stopCamera}>Cancelar</Button>
                        <Button onClick={capturePhoto} className="bg-primary text-primary-foreground">
                            <Camera className="mr-2 h-4 w-4" /> Capturar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
