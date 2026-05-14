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
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            }, 100);
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
            <Label className="text-sm font-semibold flex items-center gap-2">
                📸 Fotos del Dispositivo
            </Label>

            <div className="grid grid-cols-4 gap-2">
                {/* Upload from gallery */}
                <div className="relative aspect-square bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors group">
                    <ImagePlus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[10px] text-muted-foreground mt-1 font-medium">Subir</span>
                    <Input
                        ref={inputRef}
                        name="images"
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        multiple
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
                    <div className="relative aspect-square bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors group">
                        <Camera className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-[10px] text-muted-foreground mt-1 font-medium">Cámara</span>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            onChange={handleChange}
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => startCamera()}
                        className="relative aspect-square bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors group"
                    >
                        <Camera className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-[10px] text-muted-foreground mt-1 font-medium">Cámara</span>
                    </button>
                )}

                {/* Previews */}
                {previews.map((src, idx) => (
                    <div key={idx} className="relative aspect-square bg-black rounded-lg overflow-hidden border group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Preview" className="object-cover w-full h-full" />
                        <button
                            type="button"
                            onClick={() => handleRemove(idx)}
                            className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 transition-colors opacity-0 group-hover:opacity-100 z-10"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            {files.length > 0 && (
                <p className="text-xs text-muted-foreground text-center animate-in fade-in">
                    {files.length} imágen(es) seleccionada(s)
                </p>
            )}

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
