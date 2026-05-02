import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type GradientKey = "emerald" | "blue" | "amber" | "purple";

const GRADIENTS: Record<GradientKey, { card: string; subtitle: string }> = {
    emerald: { card: "from-emerald-500 to-emerald-700", subtitle: "text-emerald-100" },
    blue: { card: "from-blue-500 to-indigo-600", subtitle: "text-blue-100" },
    amber: { card: "from-amber-400 to-orange-600", subtitle: "text-amber-100" },
    purple: { card: "from-purple-500 to-pink-600", subtitle: "text-purple-100" },
};

type SalesMetricCardProps = {
    title: string;
    value: string;
    metadata?: string;
    icon: LucideIcon;
    color: GradientKey;
};

export function SalesMetricCard({ title, value, metadata, icon: Icon, color }: SalesMetricCardProps) {
    const { card, subtitle } = GRADIENTS[color];

    return (
        <Card className={cn("relative overflow-hidden border-none bg-gradient-to-br text-white shadow-lg", card)}>
            <CardContent className="flex min-h-[180px] flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                    <p className={cn("line-clamp-2 min-h-[2.5rem] text-sm font-medium", subtitle)}>{title}</p>
                    <div className="shrink-0 rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                        <Icon className="h-6 w-6 text-white" />
                    </div>
                </div>
                <h3 className="mt-3 truncate text-3xl font-bold leading-none tracking-tight tabular-nums">
                    {value}
                </h3>
                <div className={cn("mt-auto truncate pt-4 text-sm", subtitle)}>
                    {metadata ?? " "}
                </div>
            </CardContent>
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </Card>
    );
}
