import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const accents = {
    blue: "border-blue-400 bg-blue-700", emerald: "border-emerald-400 bg-emerald-700", orange: "border-orange-400 bg-orange-700",
    violet: "border-violet-400 bg-violet-700", pink: "border-pink-400 bg-pink-700", red: "border-red-400 bg-red-700",
};

interface Props {
    title: string;
    value: string | number;
    subtext?: string;
    detail?: string;
    icon: LucideIcon;
    accentColor: keyof typeof accents;
    href?: string;
}

export function MetricCard({ title, value, subtext, detail, icon: Icon, accentColor, href }: Props) {
    const classes = cn("min-w-0 rounded-2xl border p-3 text-white sm:p-4", accents[accentColor]);
    const content = <>
        <div className="flex items-start justify-between gap-2">
            <span className="flex items-start gap-2 text-sm font-medium text-white">
                <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />{title}
            </span>
            {href && <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-white/90" />}
        </div>
        <p className="my-2 text-lg font-bold leading-tight tracking-tight text-zinc-50 tabular-nums [overflow-wrap:anywhere] sm:text-2xl">{value}</p>
        {detail && <p className="text-sm font-medium text-white">{detail}</p>}
        {subtext && <p className="text-xs leading-relaxed text-white/90">{subtext}</p>}
    </>;
    return href
        ? <Link href={href} className={cn(classes, "block hover:brightness-110 focus-visible:outline-2 focus-visible:outline-blue-400")}>{content}</Link>
        : <div className={classes}>{content}</div>;
}
