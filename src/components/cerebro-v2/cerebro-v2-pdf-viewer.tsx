"use client";

import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { CerebroPublicSource } from "@/lib/cerebro-v2/types";

export function CerebroV2PdfViewer({ source, onClose }: { source: CerebroPublicSource; onClose: () => void }) {
    const [page, setPage] = useState(source.pageNumber ?? 1);
    const [zoom, setZoom] = useState(100);
    const [imageError, setImageError] = useState(false);
    useEffect(() => { setPage(source.pageNumber ?? 1); setZoom(100); setImageError(false); }, [source]);
    const imageUrl = `/api/cerebro-v2/documents/${source.documentId}/pages/${page}`;
    return (
        <aside className="absolute inset-y-0 right-0 z-50 flex w-full flex-col border-l border-slate-700 bg-[#0d141b] shadow-2xl md:relative md:z-0 md:w-[46%] md:min-w-[420px] md:shadow-none">
            <div className="flex items-center gap-3 border-b border-slate-700 px-3 py-3">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-100">{source.title}</p><p className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">{source.brand} · {source.model} · página {page}</p></div>
                <button type="button" onClick={onClose} className="rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#101820] px-3 py-2">
                <div className="flex items-center gap-1"><button type="button" onClick={() => { setPage((value) => Math.max(1, value - 1)); setImageError(false); }} className="rounded p-2 text-slate-300 hover:bg-slate-800"><ChevronLeft size={17} /></button><input value={page} onChange={(event) => { const value = Number(event.target.value); if (Number.isInteger(value) && value > 0) { setPage(value); setImageError(false); } }} className="h-8 w-16 rounded border border-slate-700 bg-slate-950 text-center font-mono text-xs text-white" aria-label="Número de página" /><button type="button" onClick={() => { setPage((value) => value + 1); setImageError(false); }} className="rounded p-2 text-slate-300 hover:bg-slate-800"><ChevronRight size={17} /></button></div>
                <div className="flex items-center gap-1"><button type="button" onClick={() => setZoom((value) => Math.max(50, value - 25))} className="rounded p-2 text-slate-300 hover:bg-slate-800"><Minus size={16} /></button><span className="w-12 text-center font-mono text-[10px] text-slate-400">{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(300, value + 25))} className="rounded p-2 text-slate-300 hover:bg-slate-800"><Plus size={16} /></button></div>
            </div>
            <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_center,_#1a2530_0,_#080d12_70%)] p-5">
                {imageError ? <div className="flex h-full items-center justify-center text-center text-sm text-slate-400"><div><p>No se pudo renderizar esta página.</p><p className="mt-1 text-xs text-slate-600">Verificá el número o esperá a que el PDF termine de indexarse.</p></div></div> : <img key={imageUrl} src={imageUrl} alt={`${source.title}, página ${page}`} onError={() => setImageError(true)} className="mx-auto max-w-none bg-white shadow-2xl" style={{ width: `${zoom}%`, minWidth: zoom > 100 ? "100%" : undefined }} />}
            </div>
        </aside>
    );
}
