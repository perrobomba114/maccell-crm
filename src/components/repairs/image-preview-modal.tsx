"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
}

export function ImagePreviewModal({ isOpen, onClose, imageUrl }: ImagePreviewModalProps) {
    const [scale, setScale] = useState(1);

    if (!imageUrl) return null;

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 1));
    const handleReset = () => setScale(1);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl w-full h-[80vh] p-0 overflow-hidden bg-black/95 border-none flex flex-col">
                <DialogTitle className="sr-only">Vista previa de imagen</DialogTitle>
                {/* Header / Controls */}
                <div className="absolute top-2 right-2 z-50 flex gap-2">
                    <div className="bg-black/50 rounded-md flex p-1 backdrop-blur-sm">
                        <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={handleZoomOut}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={handleReset}>
                            <span className="text-xs font-bold">{Math.round(scale * 100)}%</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={handleZoomIn}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8 bg-black/50 backdrop-blur-sm rounded-full" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Image Container */}
                <div className="flex-1 w-full h-full flex items-center justify-center overflow-auto p-4 cursor-grab active:cursor-grabbing">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt="Preview"
                        className="transition-transform duration-200 ease-out max-w-full max-h-full object-contain"
                        style={{ transform: `scale(${scale})` }}
                        draggable={false}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
