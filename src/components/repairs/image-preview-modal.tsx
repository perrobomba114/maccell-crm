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

    if (!images || images.length === 0) return null;

    const imageUrl = images[currentIndex];

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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[100vw] w-screen h-screen p-0 m-0 overflow-hidden bg-black/98 border-none flex flex-col items-center justify-center outline-none">
                <DialogTitle className="sr-only">Vista previa de imagen</DialogTitle>

                {/* Header / Controls */}
                <div className="absolute top-6 right-6 z-[60] flex gap-3">
                    <div className="bg-black/80 rounded-2xl flex p-1.5 backdrop-blur-xl border border-white/10 shadow-2xl">
                        <Button size="icon" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 h-10 w-10 transition-colors" onClick={handleZoomOut}>
                            <ZoomOut className="h-5 w-5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 px-4 w-auto h-10 transition-colors" onClick={handleReset}>
                            <span className="text-xs font-black uppercase tracking-tighter italic">{Math.round(scale * 100)}%</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 h-10 w-10 transition-colors" onClick={handleZoomIn}>
                            <ZoomIn className="h-5 w-5" />
                        </Button>
                        <div className="w-px h-6 bg-white/10 mx-1 self-center" />
                        <Button size="icon" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 h-10 w-10 transition-colors" onClick={handleReset}>
                            <RotateCcw className="h-5 w-5" />
                        </Button>
                    </div>
                    <Button size="icon" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 h-10 w-10 bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl" onClick={onClose}>
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

                {/* Image Counter */}
                {images.length > 1 && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] bg-black/80 backdrop-blur-xl border border-white/10 px-8 py-2.5 rounded-full text-white/90 font-black italic text-sm tracking-widest uppercase shadow-2xl">
                        {currentIndex + 1} <span className="opacity-30 mx-2 text-xs">/</span> {images.length}
                    </div>
                )}

                {/* Main View Area */}
                <div
                    ref={containerRef}
                    className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-move select-none"
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
