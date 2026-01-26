"use client";

import { Zap, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cleanupCorruptedImagesAction } from "@/actions/maintenance-actions";

export function DashboardHeader() {
    return (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-zinc-900/50 pb-6">
            <div className="flex items-center gap-4">
                <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 shadow-sm">
                    <Zap size={24} className="text-white" fill="currentColor" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Ejecutivo</h1>
                    <p className="text-zinc-500 text-sm">Visión general del negocio</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={async () => {
                        if (!confirm("¿Seguro que quieres limpiar las imágenes corruptas de toda la base de datos?")) return;
                        const res = await cleanupCorruptedImagesAction();
                        if (res.success) toast.success(res.message);
                        else toast.error(res.error);
                    }}
                    className="p-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all flex items-center gap-2 text-sm font-medium"
                >
                    <Trash2 size={16} />
                    Limpiar Fotos
                </button>
            </div>
        </header>
    );
}
