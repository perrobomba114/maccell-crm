import { useState } from "react";
import { X } from "lucide-react";

interface SafeImageThumbnailProps {
    src: string;
    alt: string;
    onClick: () => void;
    onDelete: () => void;
}

export function SafeImageThumbnail({ src, alt, onClick, onDelete }: SafeImageThumbnailProps) {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div className="relative aspect-square border-2 border-dashed border-red-300 rounded-lg flex flex-col items-center justify-center bg-red-50 group">
                <span className="text-xs text-red-500 font-bold mb-1">Error</span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 transition-opacity z-10 hover:bg-red-600"
                    title="Eliminar imagen rota"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        );
    }

    return (
        <div className="relative aspect-square border rounded-lg overflow-hidden group cursor-pointer">
            <img
                src={src}
                alt={alt}
                className="object-cover w-full h-full transition-transform hover:scale-105"
                onClick={onClick}
                onError={() => setHasError(true)}
            />
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    );
}
