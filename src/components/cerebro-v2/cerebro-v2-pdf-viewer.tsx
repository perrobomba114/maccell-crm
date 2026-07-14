"use client";

/* eslint-disable @next/next/no-img-element -- PDF pages have authenticated dynamic URLs and unknown source dimensions. */

import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { CerebroPublicSource } from "@/lib/cerebro-v2/types";

type PdfViewerProps = {
    source: CerebroPublicSource;
    onClose: () => void;
};

const MIN_ZOOM = 50;
const MAX_ZOOM = 400;
const ZOOM_STEP = 25;

export function CerebroV2PdfViewer({ source, onClose }: PdfViewerProps) {
    const [page, setPage] = useState(source.pageNumber ?? 1);
    const [zoom, setZoom] = useState(100);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setPage(source.pageNumber ?? 1);
        setZoom(100);
        setImageError(false);
    }, [source]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [onClose]);

    const changePage = (nextPage: number) => {
        setPage(Math.max(1, nextPage));
        setImageError(false);
    };
    const imageUrl = `/api/cerebro-v2/documents/${source.documentId}/pages/${page}`;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cerebro-pdf-title"
            className="fixed inset-0 z-[100] flex h-dvh w-screen flex-col overflow-hidden bg-[#070b0f] text-slate-100"
        >
            <header className="flex min-h-16 items-center gap-3 border-b border-slate-700/80 bg-[#0d141b] px-3 py-2 shadow-lg md:px-5">
                <div className="min-w-0 flex-1">
                    <h2 id="cerebro-pdf-title" className="truncate text-sm font-semibold text-slate-100 md:text-base">
                        {source.title}
                    </h2>
                    <p className="truncate font-mono text-[10px] uppercase tracking-wider text-cyan-300 md:text-xs">
                        {source.brand} · {source.model} · página {page}
                    </p>
                </div>
                <button
                    autoFocus
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar visor PDF"
                    className="flex h-10 items-center gap-2 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                    <X size={18} />
                    <span className="hidden sm:inline">Cerrar</span>
                </button>
            </header>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#101820] px-3 py-2 md:px-5">
                <div className="flex items-center gap-1" aria-label="Navegación de páginas">
                    <button type="button" onClick={() => changePage(page - 1)} aria-label="Página anterior" className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40" disabled={page <= 1}>
                        <ChevronLeft size={18} />
                    </button>
                    <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        Página
                        <input
                            value={page}
                            inputMode="numeric"
                            onChange={(event) => {
                                const value = Number(event.target.value);
                                if (Number.isInteger(value) && value > 0) changePage(value);
                            }}
                            className="h-9 w-16 rounded-md border border-slate-700 bg-slate-950 text-center font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                            aria-label="Número de página"
                        />
                    </label>
                    <button type="button" onClick={() => changePage(page + 1)} aria-label="Página siguiente" className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-1" aria-label="Controles de zoom">
                    <button type="button" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))} aria-label="Reducir zoom" className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                        <Minus size={17} />
                    </button>
                    <span className="w-14 text-center font-mono text-xs text-cyan-200" aria-live="polite">{zoom}%</span>
                    <button type="button" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))} aria-label="Ampliar zoom" className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                        <Plus size={17} />
                    </button>
                    <button type="button" onClick={() => setZoom(100)} aria-label="Restablecer zoom" title="Restablecer zoom" className="ml-1 rounded-md border border-slate-700 p-2 text-slate-300 hover:border-cyan-500/60 hover:bg-slate-800 hover:text-white">
                        <Maximize2 size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto overscroll-contain bg-[radial-gradient(circle_at_center,_#18232d_0,_#070b0f_72%)]">
                {imageError ? (
                    <div className="flex h-full min-h-72 items-center justify-center p-6 text-center text-sm text-slate-400">
                        <div>
                            <p>No se pudo renderizar esta página.</p>
                            <p className="mt-1 text-xs text-slate-600">Verificá el número o esperá a que el PDF termine de indexarse.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-full min-w-full items-start justify-center p-4 md:p-8">
                        <img
                            key={imageUrl}
                            src={imageUrl}
                            alt={`${source.title}, página ${page}`}
                            onError={() => setImageError(true)}
                            className="h-auto max-w-none flex-none bg-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
                            style={{ width: `${zoom}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
