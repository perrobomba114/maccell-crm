"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { externalPurchaseSchema, type ExternalPurchaseInput } from "@/lib/repairs/external-purchases";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/date-utils";
import { toast } from "sonner";

export function ExternalPurchaseEditor({ purchases, onChange, onEditingChange, disabled = false }: {
    purchases: ExternalPurchaseInput[];
    onChange: (purchases: ExternalPurchaseInput[]) => void;
    disabled?: boolean;
    onEditingChange: (editing: boolean) => void;
}) {
    const id = useId();
    const [open, setOpen] = useState(false);
    const [description, setDescription] = useState("");
    const [supplier, setSupplier] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [unitCost, setUnitCost] = useState("");
    const [receipt, setReceipt] = useState("");
    const [purchasedAt, setPurchasedAt] = useState(() => formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd"));

    function addPurchase() {
        const parsed = externalPurchaseSchema.safeParse({ requestId: crypto.randomUUID(), description, supplier, quantity: Number(quantity), unitCost, purchasedAt, receipt });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        onChange([...purchases, parsed.data]);
        setDescription(""); setUnitCost(""); setQuantity("1"); setReceipt(""); setOpen(false); onEditingChange(false);
    }

    return <fieldset disabled={disabled} className="space-y-3 border-t pt-3">
        <div>
            <p className="text-sm font-semibold">Compras a otro proveedor</p>
            <p className="text-xs text-muted-foreground">Registrá repuestos que ya compraste para este ticket. Importes en pesos (ARS).</p>
        </div>
        {purchases.map(p => <div key={p.requestId} className="flex items-start justify-between gap-2 rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="min-w-0 break-words"><p className="font-medium">{p.description}</p><p className="text-xs text-muted-foreground">{p.supplier} · {p.quantity} × ${Number(p.unitCost).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p></div>
            <Button type="button" size="icon" variant="ghost" aria-label={`Quitar compra de ${p.description}`} onClick={() => onChange(purchases.filter(item => item.requestId !== p.requestId))}><Trash2 className="h-4 w-4" /></Button>
        </div>)}
        {open ? <div className="space-y-3 rounded-lg border p-3">
            <div className="space-y-1"><Label htmlFor={`${id}-part`}>Repuesto comprado</Label><Input id={`${id}-part`} value={description} onChange={e => setDescription(e.target.value)} maxLength={200} placeholder="Ej. Módulo Motorola G9 Play" /></div>
            <div className="space-y-1"><Label htmlFor={`${id}-supplier`}>Proveedor</Label><Input id={`${id}-supplier`} value={supplier} onChange={e => setSupplier(e.target.value)} maxLength={160} placeholder="Nombre del proveedor" /></div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label htmlFor={`${id}-qty`}>Cantidad</Label><Input id={`${id}-qty`} type="number" min="1" max="1000" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor={`${id}-cost`}>Costo unitario (ARS)</Label><Input id={`${id}-cost`} inputMode="decimal" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="Ej. 25000,50" /></div>
            </div>
            <div className="space-y-1"><Label htmlFor={`${id}-date`}>Fecha de compra</Label><Input id={`${id}-date`} type="date" value={purchasedAt} onChange={e => setPurchasedAt(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor={`${id}-receipt`}>Comprobante / referencia (opcional)</Label><Input id={`${id}-receipt`} value={receipt} maxLength={160} onChange={e => setReceipt(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Agregá la compra a la lista y confirmá el diálogo para guardarla.</p>
            <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { setOpen(false); onEditingChange(false); }}>Cancelar carga</Button><Button type="button" onClick={addPurchase}>Agregar a la lista</Button></div>
        </div> : <Button type="button" variant="outline" className="w-full border-dashed" disabled={purchases.length >= 20} onClick={() => { setOpen(true); onEditingChange(true); }}><Plus className="mr-2 h-4 w-4" />Agregar compra externa</Button>}
    </fieldset>;
}
