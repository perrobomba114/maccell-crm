import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface RepairFormSectionProps {
    step: number;
    title: string;
    icon: LucideIcon;
    children: ReactNode;
    action?: ReactNode;
    className?: string;
}

const STEP_TONES: Record<number, {
    border: string;
    header: string;
    icon: string;
    surface: string;
}> = {
    1: {
        border: "border-sky-500/35",
        header: "from-sky-500/25 via-sky-500/[0.08] to-transparent",
        icon: "bg-sky-500 shadow-sky-500/25",
        surface: "bg-sky-500/[0.06]",
    },
    2: {
        border: "border-violet-500/35",
        header: "from-violet-500/25 via-violet-500/[0.08] to-transparent",
        icon: "bg-violet-500 shadow-violet-500/25",
        surface: "bg-violet-500/[0.06]",
    },
    3: {
        border: "border-amber-500/35",
        header: "from-amber-500/25 via-amber-500/[0.08] to-transparent",
        icon: "bg-amber-500 text-slate-950 shadow-amber-500/25",
        surface: "bg-amber-500/[0.06]",
    },
    4: {
        border: "border-cyan-500/35",
        header: "from-cyan-500/25 via-cyan-500/[0.08] to-transparent",
        icon: "bg-cyan-500 text-slate-950 shadow-cyan-500/25",
        surface: "bg-cyan-500/[0.06]",
    },
    5: {
        border: "border-emerald-500/35",
        header: "from-emerald-500/25 via-emerald-500/[0.08] to-transparent",
        icon: "bg-emerald-500 text-slate-950 shadow-emerald-500/25",
        surface: "bg-emerald-500/[0.06]",
    },
};

export function RepairFormSection({
    step,
    title,
    icon: Icon,
    children,
    action,
    className,
}: RepairFormSectionProps) {
    const titleId = `repair-form-section-${step}`;
    const tone = STEP_TONES[step] ?? STEP_TONES[1];

    return (
        <section
            aria-labelledby={titleId}
            className={cn(
                "overflow-hidden rounded-2xl border bg-card/90 shadow-sm transition-colors duration-200",
                tone.border,
                className,
            )}
        >
            <div className={cn(
                "flex min-h-14 justify-between gap-3 border-b border-white/5 bg-gradient-to-r px-4 py-3 sm:px-5",
                tone.header,
                action ? "flex-col items-stretch sm:flex-row sm:items-center" : "items-center",
            )}>
                <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md", tone.icon)}>
                        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                    </span>
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            Paso {step}
                        </span>
                        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-border" />
                        <h2 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
                            {title}
                        </h2>
                    </div>
                </div>
                {action ? <div className="shrink-0 self-start sm:self-auto">{action}</div> : null}
            </div>
            <div className={cn("p-4 sm:p-5", tone.surface)}>{children}</div>
        </section>
    );
}
