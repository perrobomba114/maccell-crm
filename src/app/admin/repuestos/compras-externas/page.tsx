import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/actions/auth-actions";
import { db } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DollarSign, Store, Package, Receipt } from "lucide-react";
import { externalPurchaseFilters, externalPurchasePageUrl } from "@/lib/repairs/external-purchase-filters";

import { ExternalPurchaseMetricCard } from "@/components/admin/spare-parts/external-purchase-metric-card";

export const dynamic = "force-dynamic";
const money = (value: Prisma.Decimal | null) => `$${Number(value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function ExternalPurchasesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const actor = await getCurrentUser();
    if (!actor || actor.role !== "ADMIN") redirect("/");
    const { q, from, to, page, error, where, query } = externalPurchaseFilters(await searchParams);
    const supplierTotals = db.repairExternalPurchase.groupBy({
        by: ["supplier"], where,
        _sum: { totalCost: true, quantity: true }, _count: true,
        orderBy: [{ _sum: { totalCost: "desc" } }, { supplier: "asc" }],
    });
    const [purchases, summary, suppliers] = await db.$transaction([
        db.repairExternalPurchase.findMany({ where, orderBy: [{ purchasedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 30, take: 30,
            include: { user: { select: { name: true } }, repair: { select: { ticketNumber: true, branch: { select: { name: true } } } } },
        }),
        db.repairExternalPurchase.aggregate({ where, _sum: { totalCost: true, quantity: true }, _count: true }),
        supplierTotals,
    ]);
    const pageUrl = (p: number) => externalPurchasePageUrl(query, p);
    return <div className="space-y-6 min-w-0 [contain:inline-size]">
        <Link href="/admin/repuestos" className="text-sm text-primary">← Volver a repuestos</Link>
        <div><h1 className="text-2xl font-bold">Compras externas para reparaciones</h1><p className="text-muted-foreground">Repuestos comprados a otros proveedores, vinculados a cada ticket.</p></div>
        <form key={query.toString()} className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
            <div className="space-y-1 flex-1 min-w-48">
                <Label htmlFor="purchase-search">Buscar proveedor, repuesto, ticket o sucursal</Label>
                <Input id="purchase-search" name="q" defaultValue={q} />
            </div>
            <div className="space-y-1 w-full sm:w-auto">
                <Label htmlFor="purchase-from">Desde</Label>
                <Input id="purchase-from" name="from" type="date" defaultValue={from} />
            </div>
            <div className="space-y-1 w-full sm:w-auto">
                <Label htmlFor="purchase-to">Hasta</Label>
                <Input id="purchase-to" name="to" type="date" defaultValue={to} />
            </div>
            <Button type="submit">Filtrar</Button>
            <Button variant="outline" asChild><Link href="/admin/repuestos/compras-externas">Limpiar</Link></Button>
            <p className="w-full text-xs text-muted-foreground">Se filtra por fecha de compra, incluyendo ambos días. Sin fechas, se muestra todo el historial.</p>
        </form>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {!error && <>
            <section aria-labelledby="purchase-summary" className="space-y-4">
                <div className="flex items-center gap-4"><h2 id="purchase-summary" className="text-lg font-bold">Resumen de compras</h2><div className="h-px flex-1 bg-border" /></div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <ExternalPurchaseMetricCard title="Monto total comprado" value={money(summary._sum.totalCost)} color="blue" icon={DollarSign} badge="ARS" footer="Según período y búsqueda" />
                    <ExternalPurchaseMetricCard title="Compras registradas" value={summary._count} color="emerald" icon={Receipt} footer="Registros de compra externa" />
                    <ExternalPurchaseMetricCard title="Proveedores" value={suppliers.length} color="violet" icon={Store} footer="Con compras en la selección" />
                    <ExternalPurchaseMetricCard title="Repuestos comprados" value={summary._sum.quantity ?? 0} color="orange" icon={Package} footer="Unidades en la selección" />
                </div>
            </section>
            <section aria-labelledby="supplier-totals" className="space-y-4">
                <div className="flex items-center gap-4"><h2 id="supplier-totals" className="text-lg font-bold">Montos por proveedor</h2><div className="h-px flex-1 bg-border" /></div>
                <p className="text-xs text-muted-foreground">Totales de todas las compras que coinciden con los filtros, ordenados por monto.</p>
                {suppliers.length === 0 ? <p className="rounded-xl border p-4 text-sm text-muted-foreground">No hay proveedores con compras en este período.</p> : <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {suppliers.map((supplier, index) => <ExternalPurchaseMetricCard
                        key={supplier.supplier}
                        title={supplier.supplier}
                        value={money(supplier._sum.totalCost)}
                        color={(["blue", "emerald", "violet", "orange"] as const)[index % 4]}
                        icon={Store}
                        badge="ARS"
                        footer={`${supplier._count} ${supplier._count === 1 ? "compra" : "compras"} · ${supplier._sum.quantity ?? 0} unidades`}
                    />)}
                </div>}
            </section>
            <p className="text-xs text-muted-foreground">Los montos respetan el período y la búsqueda seleccionados. No representan movimientos ni pagos de caja.</p>
        </>}
        <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted"><tr>{["Fecha / ticket", "Repuesto / proveedor", "Cantidad", "Costo unitario", "Total ARS", "Registró / comprobante"].map(title => <th key={title} className="p-3 text-left whitespace-nowrap">{title}</th>)}</tr></thead><tbody>
            {purchases.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No hay compras externas para esta búsqueda.</td></tr> : purchases.map(p => <tr key={p.id} className="border-t align-top">
                <td className="p-3 whitespace-nowrap">{p.purchasedAt.toLocaleDateString("es-AR", { timeZone: "UTC" })}<p className="font-medium">#{p.repair.ticketNumber}</p><p className="text-xs text-muted-foreground">{p.repair.branch.name}</p></td>
                <td className="p-3"><p className="font-medium break-words">{p.description}</p><p className="text-muted-foreground break-words">{p.supplier}</p></td>
                <td className="p-3">{p.quantity}</td><td className="p-3 whitespace-nowrap">{money(p.unitCost)}</td><td className="p-3 whitespace-nowrap font-semibold">{money(p.totalCost)}</td>
                <td className="p-3">{p.user.name}<p className="text-xs text-muted-foreground">{p.receipt || "Sin comprobante informado"}</p></td>
            </tr>)}
        </tbody></table></div>
        <div className="flex items-center justify-between text-sm">{page > 1 ? <Link href={pageUrl(page - 1)}>← Anterior</Link> : <span />}<span>Página {page} de {Math.max(1, Math.ceil(summary._count / 30))}</span>{page * 30 < summary._count ? <Link href={pageUrl(page + 1)}>Siguiente →</Link> : <span />}</div>
    </div>;
}
