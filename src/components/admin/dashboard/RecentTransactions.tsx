"use client";

import { DollarSign } from "lucide-react";
import { formatArgentinaDate } from "@/lib/date-utils";
import { getSalePaymentMethodLabel } from "@/lib/sale-payment-details";
import type { PaymentMethodLike } from "@/types/sales";

const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

interface RecentSale {
    id: string;
    saleNumber: string;
    category: string;
    branchName: string;
    createdAt: Date | string;
    total: number;
    paymentMethod?: PaymentMethodLike;
}

function SalesFeedTimeline({ sales }: { sales: RecentSale[] }) {
    if (!sales || sales.length === 0) {
        return <div className="text-zinc-500 text-sm text-center py-10 bg-zinc-900/30 rounded-xl">Sin actividad reciente</div>;
    }

    return (
        <ul className="divide-y divide-zinc-800">
            {sales.map(sale => <li key={sale.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div className="min-w-0"><strong className="break-words text-sm">Venta #{sale.saleNumber}</strong>
                    <p className="text-sm text-zinc-400">{sale.branchName} · {formatArgentinaDate(new Date(sale.createdAt), "dd/MM/yyyy · HH:mm")}</p>
                </div>
                <div className="text-right"><strong className="tabular-nums">{fmtMoney(sale.total)}</strong>
                    <p className="text-sm text-emerald-300">{sale.paymentMethod && getSalePaymentMethodLabel(sale.paymentMethod)}</p></div>
            </li>)}
        </ul>
    );
}

export function RecentTransactions({ stats, selectedCategory }: { stats: { tables?: { recentSales?: RecentSale[] } }, selectedCategory: string | null }) {
    if (!stats) return null;

    // Filter "Recent Sales" based on selected category
    const recentSales = stats.tables?.recentSales || [];
    const filteredRecentSales = selectedCategory
        ? recentSales.filter(s => s.category === selectedCategory)
        : recentSales;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-white">Últimas Transacciones</h2>
                <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
            </div>

            <div className="grid grid-cols-1">
                {/* Recent Transactions Feed - Full Width for clarity */}
                <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 flex flex-col h-full min-h-[300px]">
                    <div className="mb-6 flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg text-white mb-1">
                                {selectedCategory ? `Ventas: ${selectedCategory}` : "Ventas del período"}
                            </h3>
                            <p className="text-sm text-zinc-500">Hasta 10 ventas del período y la sucursal seleccionados</p>
                        </div>
                        <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                            <DollarSign size={18} />
                        </div>
                    </div>

                    <div className="flex-1">
                        <SalesFeedTimeline sales={filteredRecentSales} />
                    </div>
                </div>
            </div>
        </div>
    );
}
