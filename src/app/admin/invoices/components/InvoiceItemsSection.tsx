import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import type { InvoiceItemField, InvoiceItemForm, InvoiceItemValue } from "@/types/invoice-form";

interface InvoiceItemsSectionProps {
    items: InvoiceItemForm[];
    handleAddItem: () => void;
    handleUpdateItem: (id: string, field: InvoiceItemField, value: InvoiceItemValue) => void;
    handleRemoveItem: (id: string) => void;
}

export function InvoiceItemsSection({
    items, handleAddItem, handleUpdateItem, handleRemoveItem
}: InvoiceItemsSectionProps) {
    return (
        <div className="space-y-6 pt-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider">
                    <ShoppingCart className="w-4 h-4" /> Detalle de Ítems
                </div>
                <Button variant="outline" size="sm" onClick={handleAddItem} className="h-9 border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900 text-zinc-300 px-4">
                    <Plus className="w-4 h-4 mr-2" /> Agregar Nueva Línea
                </Button>
            </div>

            <div className="space-y-3">
                <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    <div className="col-span-5">Descripción</div>
                    <div className="col-span-2 text-center">Cant.</div>
                    <div className="col-span-3">P. Unitario</div>
                    <div className="col-span-1">IVA</div>
                    <div className="col-span-1"></div>
                </div>

                {items.map((item) => (
                    <div key={item.id} className="group grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3 rounded-lg border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/50 transition-all duration-200">
                        <div className="col-span-1 md:col-span-5">
                            <Input
                                placeholder="Descripción del producto o servicio"
                                value={item.description}
                                onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                                className="bg-transparent border-0 border-b border-zinc-800 rounded-none focus-visible:ring-0 focus-visible:border-blue-500 h-9 px-0"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <div className="relative">
                                <Input type="number" placeholder="1" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value))} className="bg-zinc-950 border-zinc-700 h-10 text-center font-mono" />
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-3">
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">$</span>
                                <Input type="number" placeholder="0.00" value={item.unitPrice} onChange={e => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value))} className="bg-zinc-950 border-zinc-700 h-10 pl-7 font-mono" />
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex h-10 items-center justify-center rounded-md border border-emerald-900/60 bg-emerald-950/30 px-2 text-xs font-black text-emerald-300">
                                21%
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-1 flex justify-end md:justify-center">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-full">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
