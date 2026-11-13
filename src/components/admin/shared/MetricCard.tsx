import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const accents = {
    blue: "text-blue-300", emerald: "text-emerald-300", orange: "text-orange-300",
    violet: "text-violet-300", pink: "text-pink-300", red: "text-red-300",
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
    const classes = "min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5";
    const content = <>
        <div className="flex items-start justify-between gap-2">
            <span className="flex items-start gap-2 text-sm font-medium text-zinc-200">
                <Icon size={16} aria-hidden="true" className={cn("mt-0.5 shrink-0", accents[accentColor])} />{title}
            </span>
            {href && <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />}
        </div>
        <p className="my-2 text-2xl font-semibold leading-tight tracking-tight text-zinc-50 tabular-nums [overflow-wrap:anywhere] lg:text-3xl">{value}</p>
        {detail && <p className="text-sm font-medium text-zinc-200">{detail}</p>}
        {subtext && <p className="text-xs leading-relaxed text-zinc-400">{subtext}</p>}
    </>;
    return href
        ? <Link href={href} className={cn(classes, "block hover:border-zinc-500 focus-visible:outline-2 focus-visible:outline-blue-400")}>{content}</Link>
        : <div className={classes}>{content}</div>;
}
