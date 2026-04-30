"use client";

import { Search, Plus, BookOpen, ChevronRight, Loader2, PenTool, Hash, Info, FileIcon, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useKnowledgePanel } from "./use-knowledge-panel";

interface KnowledgePanelProps {
    userId?: string;
    initialContent?: string | null;
    onClearInitial?: () => void;
}

export function KnowledgePanel({ userId, initialContent, onClearInitial }: KnowledgePanelProps) {
    const {
        search, setSearch,
        items,
        isLoading,
        selectedItem, setSelectedItem,
        showCreate, setShowCreate,
        isSaving,
        newTitle, setNewTitle,
        newContent, setNewContent,
        newBrand, setNewBrand,
        newModel, setNewModel,
        newTags, setNewTags,
        mediaFiles,
        existingMedia,
        editId,
        fileInputRef,
        handleFileChange,
        removeMedia,
        removeExistingMedia,
        handleSaveWikiEntry,
        resetForm,
        startEditAction
    } = useKnowledgePanel(userId, initialContent, onClearInitial);

    return (
        <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 w-full md:w-80 lg:w-96 overflow-hidden">
            <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) resetForm(); }}>
                <DialogContent className="bg-zinc-950 border border-zinc-800/60 text-zinc-100 sm:max-w-[500px] p-0 overflow-hidden shadow-2xl shadow-emerald-900/10">
                    <DialogHeader className="px-6 py-5 border-b border-zinc-800/60 bg-zinc-900/40">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <div className="p-1.5 bg-emerald-500/10 rounded-md border border-emerald-500/20"><PenTool className="w-5 h-5 text-emerald-400" /></div>
                            {editId ? "Editar Solución" : "Nueva Solución Técnica"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-5 px-6 py-5">
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">TÍTULO DE LA FALLA</label>
                            <Input placeholder="Ej: No carga, consumo oscilante en Hydra" className="bg-zinc-900/80 border-zinc-800 text-sm h-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">MARCA</label>
                                <Input placeholder="Ej: iPhone" className="bg-zinc-900/80 border-zinc-800 text-sm h-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50" value={newBrand} onChange={e => setNewBrand(e.target.value)} />
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">MODELO</label>
                                <Input placeholder="Ej: 11 Pro Max" className="bg-zinc-900/80 border-zinc-800 text-sm h-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50" value={newModel} onChange={e => setNewModel(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">PASOS Y RESOLUCIÓN</label>
                            <Textarea placeholder="Describe el diagnóstico, mediciones, componentes reemplazados y toda la técnica utilizada..." className="bg-zinc-900/80 border-zinc-800 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 min-h-[140px] resize-none" value={newContent} onChange={e => setNewContent(e.target.value)} />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">TAGS <span className="font-normal text-zinc-500 lowercase tracking-normal">(separados por coma)</span></label>
                            <Input placeholder="Ej: Hydra, Carga, U2, CC1" className="bg-zinc-900/80 border-zinc-800 text-sm h-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50" value={newTags} onChange={e => setNewTags(e.target.value)} />
                        </div>
                        <div className="space-y-3 pt-2">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between"><span>ADJUNTOS (WIKI)</span><span className="font-normal text-zinc-500 lowercase tracking-normal bg-zinc-800/50 px-2 py-0.5 rounded-md">JPG, PNG, PDF</span></label>
                            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-zinc-800/30 rounded-lg border border-zinc-700/50 empty:hidden">
                                {existingMedia.map((url, i) => {
                                    const isPdf = url.toLowerCase().endsWith('.pdf');
                                    return (
                                        <div key={`exist-${i}`} className="relative group w-[72px] h-[72px] bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center overflow-hidden hover:border-emerald-500/50 transition-colors">
                                            {isPdf ? <FileIcon className="text-blue-400" size={28} /> : <img src={url} alt="existing" className="w-full h-full object-cover" />}
                                            <button type="button" onClick={() => removeExistingMedia(i)} className="absolute -top-2 -right-2 bg-red-900/60 text-red-200 hover:bg-red-600 hover:text-white backdrop-blur-sm rounded-full p-1.5 border border-red-500/30 shadow-xl transition-all z-10 opacity-100"><X size={14} strokeWidth={3} /></button>
                                        </div>
                                    );
                                })}
                                {mediaFiles.map((media, i) => {
                                    const isPdf = media.file.type === "application/pdf";
                                    return (
                                        <div key={`new-${i}`} className="relative group w-[72px] h-[72px] bg-zinc-900 rounded-lg border-2 border-dashed border-emerald-500/50 flex items-center justify-center overflow-hidden">
                                            {isPdf ? <FileIcon className="text-blue-400" size={28} /> : <img src={media.base64} alt="preview" className="w-full h-full object-cover opacity-80" />}
                                            <button type="button" onClick={() => removeMedia(i)} className="absolute -top-2 -right-2 bg-red-900/60 text-red-200 hover:bg-red-600 hover:text-white backdrop-blur-sm rounded-full p-1.5 border border-red-500/30 shadow-xl transition-all z-10 opacity-100"><X size={12} strokeWidth={3} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                            <input type="file" hidden multiple accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileChange} />
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-11 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white border-dashed hover:border-emerald-500/50 transition-all font-medium"><Plus className="w-4 h-4 mr-2 text-emerald-500" /> Subir Esquemático / Imagen</Button>
                        </div>
                    </div>
                    <DialogFooter className="px-6 py-4 border-t border-zinc-800/60 bg-zinc-900/40">
                        <Button variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }} className="text-zinc-400 hover:text-white hover:bg-zinc-800 font-medium px-6">Cancelar</Button>
                        <Button onClick={handleSaveWikiEntry} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 shadow-lg shadow-emerald-900/20">{isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editId ? "Actualizar" : "Guardar en Wiki"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 font-semibold text-zinc-200"><BookOpen className="w-4 h-4 text-emerald-500" /><span>Wiki Técnica</span></div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-emerald-400 transition-colors" onClick={() => { resetForm(); setShowCreate(true); }}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="p-3 border-b border-zinc-800 shrink-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input placeholder="Buscar fallas, modelos o ICs..." className="pl-9 bg-zinc-900/50 border-zinc-800 text-sm h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </div>

            <ScrollArea className="flex-1">
                {selectedItem ? (
                    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-right-2 duration-200 overflow-x-hidden">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)} className="text-zinc-500 -ml-2 hover:bg-zinc-800"><ChevronRight className="w-4 h-4 mr-1 rotate-180" />Volver</Button>
                            <Button variant="ghost" size="sm" onClick={() => startEditAction(selectedItem)} className="text-emerald-500 hover:bg-emerald-500/10 h-8 px-2"><PenTool className="w-3.5 h-3.5 mr-1.5" />Editar</Button>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-1.5 py-0 uppercase">{selectedItem.deviceBrand}</Badge>
                                <span className="text-zinc-500 text-[10px]">{format(new Date(selectedItem.createdAt), "dd/MM/yyyy", { locale: es })}</span>
                            </div>
                            <h3 className="text-lg font-bold text-zinc-100 leading-tight">{selectedItem.title}</h3>
                            <p className="text-xs text-zinc-500 mt-1">Por: {selectedItem.author.name} — {selectedItem.deviceModel}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">{selectedItem.problemTags.map((tag, i) => (<span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Hash className="w-2.5 h-2.5" />{tag}</span>))}</div>
                        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                            <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2"><PenTool className="w-3 h-3" />RESOLUCIÓN TÉCNICA</h4>
                            <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{selectedItem.content}</div>
                        </div>
                        {selectedItem.mediaUrls && selectedItem.mediaUrls.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2"><ImageIcon className="w-3 h-3" />ESQUEMÁTICOS Y ADJUNTOS</h4>
                                <div className="flex flex-col gap-2">
                                    {selectedItem.mediaUrls.map((url, i) => {
                                        const isPdf = url.toLowerCase().endsWith('.pdf');
                                        if (isPdf) return (<a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"><FileIcon className="w-5 h-5" /><span className="text-sm font-medium">Ver Esquemático PDF</span></a>);
                                        return (<a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-zinc-700/50 bg-zinc-900 shadow-sm hover:border-emerald-500/50 transition-colors"><img src={url} alt="Adjunto técnico" className="w-full h-auto object-contain max-h-[400px]" loading="lazy" /></a>);
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="bg-violet-500/5 rounded-lg p-3 border border-violet-500/10 flex gap-3"><Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" /><p className="text-[11px] text-violet-300/70 italic">Esta solución ha sido verificada por el equipo senior. Respete los protocolos de soldadura y protección térmica.</p></div>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-12 text-zinc-600 gap-3"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs">Consultando base de datos...</span></div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-zinc-600 gap-3 text-center"><BookOpen className="w-8 h-8 opacity-20" /><span className="text-xs">No se encontraron soluciones registradas.</span></div>
                        ) : (
                            items.map((item) => (
                                <button key={item.id} onClick={() => setSelectedItem(item)} className="w-full p-4 text-left rounded-xl transition-all hover:bg-white/5 border border-transparent hover:border-zinc-800 group">
                                    <div className="flex items-center gap-2 mb-2"><Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[9px] h-4 px-1">{item.deviceBrand}</Badge><span className="text-[10px] text-zinc-500">{item.deviceModel}</span></div>
                                    <h4 className="text-sm font-semibold text-zinc-200 line-clamp-2 group-hover:text-emerald-400 transition-colors">{item.title}</h4>
                                    <p className="text-[11px] text-zinc-500 mt-2 line-clamp-2">{item.content}</p>
                                    <div className="flex items-center justify-between mt-3 text-[10px] text-zinc-600"><span className="flex items-center gap-1 font-medium">{item.author.name}</span><ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
