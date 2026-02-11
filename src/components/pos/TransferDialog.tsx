"use client";

import { ArrowRightLeft, Search, Truck, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TransferDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    transferTab: "NEW" | "INCOMING";
    setTransferTab: (v: "NEW" | "INCOMING") => void;
    pendingTransfers: any[];
    selectedTransferProduct: any | null;
    setSelectedTransferProduct: (v: any | null) => void;
    transferSearchQuery: string;
    setTransferSearchQuery: (v: string) => void;
    transferProducts: any[];
    targetBranchId: string;
    setTargetBranchId: (v: string) => void;
    branches: any[];
    transferQty: string;
    setTransferQty: (v: string) => void;
    transferNotes: string;
    setTransferNotes: (v: string) => void;
    onCreateTransfer: () => void;
    onRespondTransfer: (id: string, action: "ACCEPT" | "REJECT") => void;
}

export function TransferDialog({
    isOpen,
    onOpenChange,
    transferTab,
    setTransferTab,
    pendingTransfers,
    selectedTransferProduct,
    setSelectedTransferProduct,
    transferSearchQuery,
    setTransferSearchQuery,
    transferProducts,
    targetBranchId,
    setTargetBranchId,
    branches,
    transferQty,
    setTransferQty,
    transferNotes,
    setTransferNotes,
    onCreateTransfer,
    onRespondTransfer
}: TransferDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl text-white shadow-2xl p-0 gap-0 overflow-hidden rounded-3xl">
                <div className="p-6 pb-2 border-b border-white/10 bg-zinc-900/50">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                            <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                            Transferencias
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 font-medium">
                            Gestione el envío y recepción de mercadería entre sucursales.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 mt-4 bg-zinc-950/50 p-1 rounded-xl border border-white/5">
                        <Button
                            variant={transferTab === "NEW" ? "default" : "ghost"}
                            onClick={() => setTransferTab("NEW")}
                            className={cn("flex-1 font-bold rounded-lg h-10", transferTab === "NEW" ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10" : "text-zinc-400 hover:text-white")}
                        >
                            Nueva
                        </Button>
                        <Button
                            variant={transferTab === "INCOMING" ? "default" : "ghost"}
                            onClick={() => setTransferTab("INCOMING")}
                            className={cn("flex-1 relative font-bold rounded-lg h-10", transferTab === "INCOMING" ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10" : "text-zinc-400 hover:text-white")}
                        >
                            Recibidas
                            {pendingTransfers.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-zinc-950 shadow-lg">
                                    {pendingTransfers.length}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="p-6 min-h-[400px]">
                    {transferTab === "NEW" ? (
                        <div className="space-y-4">
                            {!selectedTransferProduct ? (
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-blue-500/20 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-500"></div>
                                        <div className="relative">
                                            <Label htmlFor="transfer-search-input" className="sr-only">Buscar producto para transferir</Label>
                                            <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                                            <Input
                                                name="transfer-search"
                                                id="transfer-search-input"
                                                aria-label="Buscar producto para transferir"
                                                placeholder="Buscar producto a transferir..."
                                                value={transferSearchQuery}
                                                onChange={(e) => setTransferSearchQuery(e.target.value)}
                                                className="pl-9 h-11 bg-zinc-900 border-zinc-800 text-white font-medium focus:border-blue-500/50 transition-all placeholder:text-zinc-600 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {transferProducts.map(product => (
                                            <div
                                                key={product.id}
                                                className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800 hover:border-blue-500/30 cursor-pointer flex justify-between items-center transition-all group"
                                                onClick={() => setSelectedTransferProduct(product)}
                                            >
                                                <div>
                                                    <div className="font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">{product.name}</div>
                                                    <div className="text-[10px] font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">SKU: {product.sku}</div>
                                                </div>
                                                <Badge variant="outline" className={cn(
                                                    "font-bold",
                                                    product.stock > 0 ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-red-500 border-red-500/20 bg-red-500/5"
                                                )}>
                                                    Stock: {product.stock}
                                                </Badge>
                                            </div>
                                        ))}
                                        {transferSearchQuery && transferProducts.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-20 italic">
                                                <Search className="w-10 h-10 mb-2 opacity-20" />
                                                <p>No se encontraron productos</p>
                                            </div>
                                        )}
                                        {!transferSearchQuery && (
                                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-20 italic">
                                                <PackageSearch className="w-10 h-10 mb-2 opacity-20" />
                                                <p>Escriba para buscar en el catálogo...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-5">
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex justify-between items-center shadow-inner">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <div className="text-[10px] text-blue-400 font-black uppercase mb-1 tracking-widest opacity-80">Producto Seleccionado</div>
                                            <div className="font-bold text-lg text-white truncate">{selectedTransferProduct.name}</div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedTransferProduct(null)}
                                            className="text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg h-8 font-bold"
                                        >
                                            Cambiar
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="target-branch-select" className="text-xs uppercase text-zinc-500 font-bold tracking-wider ml-1">Sucursal Destino</Label>
                                            <select
                                                id="target-branch-select"
                                                name="target-branch"
                                                className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                                                value={targetBranchId}
                                                onChange={(e) => setTargetBranchId(e.target.value)}
                                            >
                                                <option value="" disabled>Seleccionar...</option>
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center ml-1">
                                                <Label htmlFor="transfer-qty-input" className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Cantidad</Label>
                                                <span className="text-[10px] text-zinc-600 font-bold">DISP: {selectedTransferProduct.stock}</span>
                                            </div>
                                            <Input
                                                name="transfer-qty"
                                                id="transfer-qty-input"
                                                type="number"
                                                min="1"
                                                max={selectedTransferProduct.stock}
                                                value={transferQty}
                                                onChange={(e) => setTransferQty(e.target.value)}
                                                className="h-12 bg-zinc-900 border-zinc-800 text-white font-black text-xl rounded-xl focus:border-blue-500/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="transfer-notes-textarea" className="text-xs uppercase text-zinc-500 font-bold tracking-wider ml-1">Motivo / Notas</Label>
                                        <textarea
                                            id="transfer-notes-textarea"
                                            name="transfer-notes"
                                            className="w-full min-h-[100px] rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder:text-zinc-600 resize-none transition-all font-medium"
                                            placeholder="Describa la razón de la transferencia..."
                                            value={transferNotes}
                                            onChange={(e) => setTransferNotes(e.target.value)}
                                        />
                                    </div>

                                    <Button
                                        className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black h-14 mt-4 rounded-2xl shadow-xl shadow-blue-900/20 active:scale-98 transition-all"
                                        onClick={onCreateTransfer}
                                        disabled={!targetBranchId || !transferQty}
                                    >
                                        <Truck className="w-5 h-5 mr-3" /> ENVIAR TRANSFERENCIA
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3 h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                            {pendingTransfers.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-20 italic">
                                    <PackageSearch className="w-16 h-16 mb-4 opacity-10" />
                                    <p className="text-lg font-bold opacity-40">No hay solicitudes pendientes</p>
                                </div>
                            ) : (
                                pendingTransfers.map(t => (
                                    <div key={t.id} className="p-5 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl space-y-4 hover:bg-zinc-900/60 transition-colors shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 mr-4">
                                                <div className="font-black text-xl text-white tracking-tight">{t.product.name}</div>
                                                <div className="text-xs text-zinc-500 mt-1 font-medium">
                                                    Origen: <span className="text-blue-400 font-bold uppercase tracking-wide">{t.sourceBranch?.name}</span> •
                                                    Solicitó: <span className="text-zinc-300">{t.createdBy?.name}</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10 px-4 py-1.5 text-base font-black rounded-lg">
                                                {t.quantity} Un.
                                            </Badge>
                                        </div>

                                        {t.notes && (
                                            <div className="relative p-3 bg-zinc-950/40 rounded-xl text-sm text-zinc-400 italic border border-white/5 pl-8">
                                                <span className="absolute left-3 top-3 text-zinc-600 text-2xl leading-none">"</span>
                                                {t.notes}
                                            </div>
                                        )}

                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                className="flex-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 font-bold rounded-xl h-12"
                                                size="sm"
                                                onClick={() => onRespondTransfer(t.id, "ACCEPT")}
                                            >
                                                Aceptar
                                            </Button>
                                            <Button
                                                className="flex-1 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-600/30 font-bold rounded-xl h-12"
                                                size="sm"
                                                onClick={() => onRespondTransfer(t.id, "REJECT")}
                                            >
                                                Rechazar
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
