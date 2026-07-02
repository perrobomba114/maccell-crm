"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getImgUrl, isValidImg } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ImageOff, Images, Maximize2 } from "lucide-react";
import { ImagePreviewModal } from "./image-preview-modal";

export type RepairImagesDialogRepair = {
    id: string;
    ticketNumber: string;
    deviceBrand: string;
    deviceModel: string;
    deviceImages?: string[] | null;
    customer: {
        name: string;
    };
};

type RepairImagesDialogProps = {
    repair: RepairImagesDialogRepair | null;
    isOpen: boolean;
    onClose: () => void;
};

export function RepairImagesDialog({ repair, isOpen, onClose }: RepairImagesDialogProps) {
    const images = useMemo(
        () => (repair?.deviceImages ?? []).filter(isValidImg),
        [repair?.deviceImages]
    );
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedIndex(0);
        setIsPreviewOpen(false);
    }, [isOpen, repair?.id]);

    useEffect(() => {
        if (selectedIndex < images.length) return;
        setSelectedIndex(Math.max(images.length - 1, 0));
    }, [images.length, selectedIndex]);

    if (!repair) return null;

    const selectedImage = images[selectedIndex] ?? null;
    const hasMultipleImages = images.length > 1;

    const goToPrevious = () => {
        if (!hasMultipleImages) return;
        setSelectedIndex((current) => (current - 1 + images.length) % images.length);
    };

    const goToNext = () => {
        if (!hasMultipleImages) return;
        setSelectedIndex((current) => (current + 1) % images.length);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="grid max-h-[94dvh] w-[calc(100%-1rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
                    <DialogHeader className="border-b px-4 py-4 pr-12 sm:px-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs font-black">
                                #{repair.ticketNumber}
                            </Badge>
                            <Badge variant="secondary" className="font-semibold">
                                <Images />
                                {images.length} {images.length === 1 ? "imagen" : "imágenes"}
                            </Badge>
                        </div>
                        <DialogTitle>Imágenes de vendedor y técnico</DialogTitle>
                        <DialogDescription>
                            {repair.deviceBrand} {repair.deviceModel} · {repair.customer.name}
                        </DialogDescription>
                    </DialogHeader>

                    {images.length === 0 ? (
                        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
                            <div className="flex size-14 items-center justify-center rounded-full border bg-muted">
                                <ImageOff className="size-6" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="font-semibold text-foreground">Esta reparación no tiene imágenes visibles.</p>
                                <p className="max-w-sm text-sm">
                                    Puede que las fotos hayan sido eliminadas o que todavía no se hayan sincronizado.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:grid-rows-1 sm:p-4">
                            <div className="flex min-h-0 flex-col gap-3">
                                <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
                                    {hasMultipleImages && (
                                        <>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="icon"
                                                aria-label="Imagen anterior"
                                                onClick={goToPrevious}
                                                className="absolute left-3 top-1/2 z-10 size-11 -translate-y-1/2 rounded-full bg-background/90 shadow-lg backdrop-blur"
                                            >
                                                <ChevronLeft />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="icon"
                                                aria-label="Imagen siguiente"
                                                onClick={goToNext}
                                                className="absolute right-3 top-1/2 z-10 size-11 -translate-y-1/2 rounded-full bg-background/90 shadow-lg backdrop-blur"
                                            >
                                                <ChevronRight />
                                            </Button>
                                        </>
                                    )}

                                    {selectedImage && (
                                        <button
                                            type="button"
                                            className="relative flex h-full min-h-[260px] w-full items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            onClick={() => setIsPreviewOpen(true)}
                                            aria-label={`Ampliar imagen ${selectedIndex + 1}`}
                                        >
                                            <Image
                                                src={getImgUrl(selectedImage)}
                                                alt={`Imagen ${selectedIndex + 1} de reparación ${repair.ticketNumber}`}
                                                fill
                                                sizes="(min-width: 640px) calc(100vw - 260px), 100vw"
                                                unoptimized
                                                className="object-contain p-2"
                                            />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {selectedIndex + 1} / {images.length}
                                    </Badge>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsPreviewOpen(true)}
                                        className="min-h-11 sm:min-h-8"
                                    >
                                        <Maximize2 />
                                        Ampliar
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="h-28 rounded-lg border bg-muted/20 sm:h-full sm:max-h-[70dvh]">
                                <div className="grid auto-cols-[80px] grid-flow-col gap-2 p-2 sm:grid-flow-row sm:grid-cols-1">
                                    {images.map((image, index) => (
                                        <button
                                            key={`${image}-${index}`}
                                            type="button"
                                            aria-label={`Ver imagen ${index + 1}`}
                                            onClick={() => setSelectedIndex(index)}
                                            className={cn(
                                                "relative aspect-square min-h-20 overflow-hidden rounded-md border bg-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                selectedIndex === index ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/60"
                                            )}
                                        >
                                            <Image
                                                src={getImgUrl(image)}
                                                alt={`Miniatura ${index + 1}`}
                                                fill
                                                sizes="80px"
                                                unoptimized
                                                className="object-cover"
                                            />
                                            <span className="absolute bottom-1 right-1 rounded-full bg-background/90 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-foreground shadow">
                                                {index + 1}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ImagePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                images={images}
                currentIndex={selectedIndex}
                onIndexChange={setSelectedIndex}
            />
        </>
    );
}
