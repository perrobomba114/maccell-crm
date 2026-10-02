import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const cardColors = {
    blue: { background: "bg-blue-600", border: "border-blue-400", icon: "bg-blue-500" },
    emerald: { background: "bg-emerald-600", border: "border-emerald-400", icon: "bg-emerald-500" },
    violet: { background: "bg-violet-600", border: "border-violet-400", icon: "bg-violet-500" },
    orange: { background: "bg-orange-600", border: "border-orange-400", icon: "bg-orange-500" },
} as const;

interface ExternalPurchaseMetricCardProps {
    title: string;
    value: string | number;
    footer: string;
    color: keyof typeof cardColors;
    icon: LucideIcon;
    badge?: string;
}

// Misma composición y paleta que las métricas de FinancialStats del dashboard.
export function ExternalPurchaseMetricCard({ title, value, footer, color, icon: Icon, badge }: ExternalPurchaseMetricCardProps) {
    const style = cardColors[color];
    return <article className={cn(
        "relative flex h-full min-h-52 min-w-0 flex-col justify-between overflow-hidden rounded-2xl border-2 p-6 text-white shadow-lg",
        style.background, style.border,
    )}>
        <Icon aria-hidden="true" size={120} className="pointer-events-none absolute -right-4 -top-4 opacity-10" />
        <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className={cn("rounded-full border border-white/20 p-2 text-white shadow-inner", style.icon)}>
                        <Icon aria-hidden="true" size={20} />
                    </div>
                    {badge && <span className="rounded-full border border-white/20 bg-white/20 px-2 py-1 text-[10px] font-bold text-white">{badge}</span>}
                </div>
                <p className="mb-1 break-words text-[clamp(1.875rem,2.1vw,2.25rem)] font-black leading-none tracking-tighter text-white tabular-nums">{value}</p>
                <h3 className="break-words text-[10px] font-black uppercase tracking-[0.2em] text-white/90">{title}</h3>
            </div>
            <div className="mt-5 border-t border-white/15 pt-3">
                <p className="flex items-start gap-2 text-[10px] font-bold uppercase tracking-wider text-white">
                    <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                    <span>{footer}</span>
                </p>
            </div>
        </div>
    </article>;
}
