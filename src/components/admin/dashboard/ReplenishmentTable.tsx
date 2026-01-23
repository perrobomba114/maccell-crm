import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertTriangle, ShoppingCart, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReplenishmentProps {
    data: {
        product: string;
        branch: string;
        quantity: number;
    }[];
}

export function ReplenishmentTable({ data }: ReplenishmentProps) {
    return (
        <Card className="border border-zinc-800/50 bg-[#18181b] shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-zinc-800/50 pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <ShoppingCart size={20} className="text-orange-500" />
                            Solicitudes de Reposición
                        </CardTitle>
                        <CardDescription className="text-zinc-500">Items sugeridos para compra inmediata</CardDescription>
                    </div>
                    <div className="bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 text-orange-500 text-xs font-bold">
                        {data.length} Pendientes
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 pr-2">
                    {data.length === 0 ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-500">
                            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                                <CheckCircle2 size={32} className="text-emerald-500/50" />
                            </div>
                            <p>No se requiere reposición por el momento.</p>
                        </div>
                    ) : (
                        data.map((item, i) => (
                            <div key={i} className="group relative bg-zinc-900/30 border border-zinc-800 hover:border-orange-500/30 rounded-xl p-4 transition-all duration-300 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)] flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="bg-zinc-800 text-[10px] uppercase font-bold text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700">
                                            {item.branch}
                                        </div>
                                        {item.quantity === 0 && (
                                            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-zinc-200 text-sm mb-1 line-clamp-2 group-hover:text-white transition-colors">
                                        {item.product}
                                    </h4>
                                </div>

                                <div className="mt-4">
                                    <div className="flex items-end justify-between mb-2">
                                        <span className="text-xs text-zinc-500">Stock Actual</span>
                                        <span className={cn(
                                            "text-lg font-bold",
                                            item.quantity === 0 ? "text-red-500" : "text-orange-400"
                                        )}>
                                            {item.quantity}
                                        </span>
                                    </div>
                                    {/* Copy to Clipboard Button (Functional) */}
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${item.product} (x${Math.max(3 - item.quantity, 1)})`);
                                            // You might want to add a toast here ideally
                                        }}
                                        className="w-full py-2 flex items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 group-hover:text-white text-xs font-bold cursor-pointer transition-all mt-2 border border-zinc-700 hover:border-zinc-600"
                                        title="Copiar Item"
                                    >
                                        <Copy size={12} />
                                        Copiar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Helper for empty state
import { CheckCircle2, Copy } from "lucide-react";
