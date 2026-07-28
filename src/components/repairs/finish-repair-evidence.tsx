"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, X } from "lucide-react";

import { getImgUrl } from "@/lib/utils";
import { ImagePreviewModal } from "./image-preview-modal";
import { SafeImageThumbnail } from "./safe-image-thumbnail";

interface FinishRepairEvidenceProps {
    images: string[];
    newImages: File[];
    onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveNewImage: (index: number) => void;
}

export function FinishRepairEvidence({
    images,
    newImages,
    onImageChange,
    onRemoveNewImage,
}: FinishRepairEvidenceProps) {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const newImageUrls = useMemo(
        () => newImages.map((file) => URL.createObjectURL(file)),
        [newImages],
    );
    const previewImages = useMemo(
        () => [...images, ...newImageUrls],
        [images, newImageUrls],
    );

    useEffect(() => {
        return () => newImageUrls.forEach((url) => URL.revokeObjectURL(url));
    }, [newImageUrls]);

    const openViewer = (index: number) => {
        setViewerIndex(index);
        setViewerOpen(true);
    };

    return (
        <>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-x-auto custom-scrollbar">
                {images.map((url, index) => (
                    <button
                        key={`old-${index}`}
                        type="button"
                        aria-label={`Ver evidencia ${index + 1}`}
                        className="h-8 w-8 shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-slate-700 bg-slate-950 opacity-70 transition-all hover:border-cyan-500 hover:opacity-100"
                        onClick={() => openViewer(index)}
                    >
                        <SafeImageThumbnail src={getImgUrl(url)} alt={`Evidencia ${index + 1}`} onClick={() => openViewer(index)} />
                    </button>
                ))}

                {newImageUrls.map((url, index) => (
                    <div key={url} className="group relative h-8 w-8 shrink-0">
                        <button
                            type="button"
                            aria-label={`Ver evidencia nueva ${index + 1}`}
                            className="h-full w-full cursor-zoom-in overflow-hidden rounded-md border border-emerald-500/60 bg-slate-950 transition-all hover:border-emerald-300"
                            onClick={() => openViewer(images.length + index)}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Evidencia nueva ${index + 1}`} className="h-full w-full object-cover" />
                        </button>
                        <button
                            type="button"
                            aria-label={`Eliminar evidencia nueva ${index + 1}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemoveNewImage(index);
                            }}
                            className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white shadow-md group-hover:flex"
                        >
                            <X className="h-2.5 w-2.5" />
                        </button>
                    </div>
                ))}

                {newImages.length < 3 ? (
                    <label className="group flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-900 transition-all hover:border-cyan-600 hover:bg-slate-800">
                        <Camera size={13} className="text-slate-500 group-hover:text-cyan-400" />
                        <span className="sr-only">Agregar evidencia</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={onImageChange} />
                    </label>
                ) : null}
            </div>

            <ImagePreviewModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={previewImages}
                currentIndex={viewerIndex}
                onIndexChange={setViewerIndex}
            />
        </>
    );
}
