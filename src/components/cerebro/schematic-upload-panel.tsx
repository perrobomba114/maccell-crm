"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, FileText, Loader2, CheckCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface Schematic {
    id: string;
    device_brand: string;
    device_model: string;
    filename: string;
    uploaded_by: string | null;
    created_at: string;
}

export function SchematicUploadPanel({ userId }: { userId: string }) {
    const [schematics, setSchematics] = useState<Schematic[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // Form state
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchSchematics = async () => {
        try {
            const res = await fetch("/api/cerebro/schematics");
            if (res.ok) setSchematics(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchSchematics(); }, []);

    const handleFile = (f: File | null) => {
        if (!f) return;
        if (f.type !== "application/pdf") { toast.error("Solo se aceptan archivos PDF."); return; }
        setFile(f);
        // Auto-rellenar nombre del modelo desde el nombre del archivo si está vacío
        if (!model) {
            const name = f.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");
            setModel(name.slice(0, 50));
        }
    };

    const handleUpload = async () => {
        if (!file || !brand.trim() || !model.trim()) {
            toast.error("Completá marca, modelo y seleccioná un PDF.");
            return;
        }
        setUploading(true);
        try {
            const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const res = await fetch("/api/cerebro/schematics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    deviceBrand: brand.trim(),
                    deviceModel: model.trim(),
                    filename: file.name,
                    pdfDataUrl: dataUrl,
                    uploadedBy: userId,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al subir");

            toast.success(`✅ Schematic indexado: ${brand} ${model} (${data.chars?.toLocaleString()} chars)`);
            setBrand(""); setModel(""); setFile(null);
            if (fileRef.current) fileRef.current.value = "";
            await fetchSchematics();
        } catch (err: any) {
            toast.error(err.message);
        } finally { setUploading(false); }
    };

    const handleDelete = async (id: string, label: string) => {
        if (!confirm(`¿Eliminar schematic "${label}"?`)) return;
        try {
            const res = await fetch("/api/cerebro/schematics", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error("Error al eliminar");
            toast.success("Schematic eliminado.");
            setSchematics(s => s.filter(x => x.id !== id));
        } catch (err: any) { toast.error(err.message); }
    };

    return (
        <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 h-full overflow-y-auto">
            <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Biblioteca de Schematics</h3>
                <span className="ml-auto text-xs text-slate-500">{schematics.length} indexados</span>
            </div>

            {/* Upload form */}
            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                    <input
                        placeholder="Marca (ej: Samsung)"
                        value={brand}
                        onChange={e => setBrand(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                    />
                    <input
                        placeholder="Modelo (ej: A10)"
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                    />
                </div>

                {/* Drop zone */}
                <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-1 py-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${dragOver ? 'border-violet-500 bg-violet-500/10' : file ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                        }`}
                >
                    {file ? (
                        <>
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                            <span className="text-xs text-emerald-300 font-medium">{file.name}</span>
                            <span className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</span>
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5 text-slate-500" />
                            <span className="text-xs text-slate-400">Arrastrá un PDF o <span className="text-violet-400 underline">seleccioná</span></span>
                        </>
                    )}
                    <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
                </div>

                <button
                    onClick={handleUpload}
                    disabled={uploading || !file || !brand || !model}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Indexando...</> : <><Upload className="w-3.5 h-3.5" /> Subir e indexar</>}
                </button>
            </div>

            {/* Lista de schematics */}
            <div className="flex flex-col gap-1.5">
                {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-500" /></div>
                ) : schematics.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No hay schematics indexados todavía.</p>
                ) : (
                    schematics.map(s => (
                        <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 group">
                            <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-200 truncate">{s.device_brand} {s.device_model}</p>
                                <p className="text-[10px] text-slate-500 truncate">{s.filename}</p>
                            </div>
                            <button
                                onClick={() => handleDelete(s.id, `${s.device_brand} ${s.device_model}`)}
                                className="shrink-0 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
