interface InvoiceTotalsSummaryProps {
    totals: { net: number, vat: number, total: number };
}

export function InvoiceTotalsSummary({ totals }: InvoiceTotalsSummaryProps) {
    return (
        <div className="mt-auto p-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border border-zinc-800 space-y-4 shadow-xl">
            <div className="flex justify-between items-center text-sm text-zinc-400">
                <span>Subtotal Neto</span>
                <span className="font-mono text-zinc-200">${totals.net.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-zinc-400">
                <span>IVA</span>
                <span className="font-mono text-zinc-200">${totals.vat.toLocaleString()}</span>
            </div>
            <div className="h-px bg-zinc-800/50 my-2" />
            <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-zinc-200 uppercase tracking-widest pb-1">Total Final</span>
                <span className="text-3xl font-bold text-green-400 tracking-tight leading-none">
                    ${totals.total.toLocaleString()}
                </span>
            </div>
        </div>
    );
}
