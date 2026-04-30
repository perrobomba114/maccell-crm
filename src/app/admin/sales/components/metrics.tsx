import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, type LucideIcon } from "lucide-react";
import type { BranchRankingItem } from "@/types/sales";

type SalesMetricCardProps = {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: "emerald" | "blue" | "violet";
};

export function SalesMetricCard({ title, value, icon: Icon, color }: SalesMetricCardProps) {
    const colorStyles: Record<SalesMetricCardProps["color"], string> = {
        emerald: "bg-emerald-600 border-emerald-500 text-white",
        blue: "bg-blue-600 border-blue-500 text-white",
        violet: "bg-violet-600 border-violet-500 text-white",
    };

    const containerStyle = colorStyles[color] || colorStyles.blue;
    const iconStyle = color === "emerald" ? "bg-emerald-500/30 text-emerald-100" :
        color === "blue" ? "bg-blue-500/30 text-blue-100" :
            "bg-violet-500/30 text-violet-100";

    return (
        <Card className={cn("border-l-4 shadow-md transition-all", containerStyle)}>
            <CardContent className="p-4 flex flex-col justify-between flex-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Icon size={80} className="text-white" />
                </div>

                <div className="flex justify-between items-start z-10">
                    <div>
                        <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">{title}</p>
                        <h3 className="text-2xl font-black text-white tracking-tight">{value}</h3>
                    </div>
                    <div className={cn("p-2.5 rounded-xl backdrop-blur-md", iconStyle)}>
                        <Icon size={20} strokeWidth={2.5} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function SalesRankingCard({ rankingData }: { rankingData: BranchRankingItem[] }) {
    return (
        <Card className="border-zinc-800 bg-[#18181b] h-full flex flex-col transition-all hover:bg-zinc-900/50">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={14} /> Ranking de Ventas
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-center">
                <div className="space-y-2 md:space-y-4 max-w-md mx-auto w-full">
                    {(() => {
                        const ranking = rankingData.slice(0, 4);
                        if (ranking.length === 0) return <p className="text-xs text-zinc-500 italic">No hay datos suficientes.</p>;
                        const maxTotal = ranking[0].total;
                        return ranking.map((item, index) => (
                            <div key={item.branchName} className="relative group">
                                <div className="flex justify-between items-center mb-1.5 z-10 relative">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className={cn(
                                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm",
                                            index === 0 ? "bg-amber-500 text-black shadow-amber-500/20" :
                                                index === 1 ? "bg-zinc-700 text-white" :
                                                    "bg-zinc-800 text-zinc-500"
                                        )}>
                                            {index + 1}
                                        </div>
                                        <span className="text-xs font-bold text-zinc-300 truncate">{item.branchName}</span>
                                    </div>
                                    <span className="text-xs font-mono font-medium text-emerald-500 shrink-0 ml-2">
                                        {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(item.total)}
                                    </span>
                                </div>
                                <div className="h-1 md:h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-500", index === 0 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-zinc-600")}
                                        style={{ width: `${(item.total / maxTotal) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            </CardContent>
        </Card>
    );
}
