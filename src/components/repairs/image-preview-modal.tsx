"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { getImgUrl } from "@/lib/utils";

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    currentIndex: number;
    onIndexChange: (index: number) => void;
}

export function ImagePreviewModal({ isOpen, onClose, images, currentIndex, onIndexChange }: ImagePreviewModalProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen, currentIndex]);


    const imageUrl = images?.[currentIndex];

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 5));
    const handleZoomOut = () => {
        const newScale = Math.max(scale - 0.5, 1);
        setScale(newScale);
        if (newScale === 1) setPosition({ x: 0, y: 0 });
    };

    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const handlePrevious = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const nextIndex = (currentIndex - 1 + images.length) % images.length;
        onIndexChange(nextIndex);
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const nextIndex = (currentIndex + 1) % images.length;
        onIndexChange(nextIndex);
    };

    // Drag Logic
    const onMouseDown = (e: React.MouseEvent) => {
        if (scale <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || scale <= 1) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "ArrowLeft") handlePrevious();
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, currentIndex, images.length]);

    if (!images || images.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="m-0 flex h-screen w-screen max-w-[100vw] flex-col items-center justify-center overflow-hidden border-none bg-black/98 p-0 outline-none"
            >
                <DialogTitle className="sr-only">Vista previa de imagen</DialogTitle>

                {/* Header / Controls */}
                <div className="absolute inset-x-4 top-4 z-[60] grid grid-cols-[64px_1fr_56px] items-center gap-2 sm:inset-x-6 sm:top-6">
                    <div className="whitespace-nowrap justify-self-start rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-center text-xs font-black tracking-wide text-white/90 shadow-2xl backdrop-blur-xl">
                        {currentIndex + 1} <span className="mx-1 text-white/30">/</span> {images.length}
                    </div>

                    <div className="flex justify-self-center rounded-2xl border border-white/10 bg-black/80 p-1 shadow-2xl backdrop-blur-xl">
                        <Button size="icon" variant="ghost" className="size-9 text-white/70 transition-colors hover:bg-white/10 hover:text-white" onClick={handleZoomOut} aria-label="Alejar imagen">
                            <ZoomOut className="h-5 w-5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-auto min-w-14 px-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white" onClick={handleReset} aria-label="Restablecer zoom">
                            <span className="text-xs font-black uppercase tracking-tighter italic">{Math.round(scale * 100)}%</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="size-9 text-white/70 transition-colors hover:bg-white/10 hover:text-white" onClick={handleZoomIn} aria-label="Acercar imagen">
                            <ZoomIn className="h-5 w-5" />
                        </Button>
                        <div className="mx-1 h-6 w-px self-center bg-white/10" />
                        <Button size="icon" variant="ghost" className="size-9 text-white/70 transition-colors hover:bg-white/10 hover:text-white" onClick={handleReset} aria-label="Restablecer imagen">
                            <RotateCcw className="h-5 w-5" />
                        </Button>
                    </div>

                    <Button size="icon" variant="ghost" className="size-10 justify-self-end rounded-xl border border-white/10 bg-black/80 text-white/70 shadow-2xl backdrop-blur-xl hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Cerrar visor">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Desktop Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute left-8 top-1/2 -translate-y-1/2 z-[60] text-white/50 hover:text-white hover:bg-white/10 h-20 w-20 transition-all rounded-full border border-white/5 hidden md:flex"
                            onClick={handlePrevious}
                        >
                            <ChevronLeft className="h-12 w-12" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-8 top-1/2 -translate-y-1/2 z-[60] text-white/50 hover:text-white hover:bg-white/10 h-20 w-20 transition-all rounded-full border border-white/5 hidden md:flex"
                            onClick={handleNext}
                        >
                            <ChevronRight className="h-12 w-12" />
                        </Button>
                    </>
                )}

                {/* Main View Area */}
                <div
                    ref={containerRef}
                    className="relative flex h-full w-full cursor-move select-none items-center justify-center overflow-hidden px-3 pb-12 pt-20 sm:px-20 sm:pb-14 sm:pt-24"
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onWheel={(e) => {
                        if (e.deltaY < 0) handleZoomIn();
                        else handleZoomOut();
                    }}
                >
                    {/* Mobile Navigation Areas */}
                    <div className="absolute inset-0 z-0 flex md:hidden pointer-events-none">
                        <div className="w-1/3 h-full pointer-events-auto" onClick={handlePrevious} />
                        <div className="w-2/3 h-full" />
                        <div className="w-1/3 h-full pointer-events-auto" onClick={handleNext} />
                    </div>

                    {/* The Image */}
                    <img
                        src={getImgUrl(imageUrl)}
                        alt={`Preview ${currentIndex + 1}`}
                        className={`max-w-full max-h-full object-contain pointer-events-none transition-transform ${isDragging ? "duration-0" : "duration-300"} ease-out`}
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        }}
                    />
                </div>

                {/* Help Overlay (Temporary) */}
                <div className="absolute bottom-6 text-white/20 text-[10px] font-black tracking-[0.3em] uppercase pointer-events-none select-none">
                    Arrastrá para mover • Rueda para Zoom
                </div>
            </DialogContent>
        </Dialog>
    );
}
