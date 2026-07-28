import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface RepairFormSectionProps {
    step: number;
    title: string;
    description: string;
    icon: LucideIcon;
    children: ReactNode;
    action?: ReactNode;
    className?: string;
}

export function RepairFormSection({
    step,
    title,
    description,
    icon: Icon,
    children,
    action,
    className,
}: RepairFormSectionProps) {
    const titleId = `repair-form-section-${step}`;

    return (
        <section
            aria-labelledby={titleId}
            className={cn(
                "overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm",
                "supports-[backdrop-filter]:bg-card/70 supports-[backdrop-filter]:backdrop-blur-sm",
                className,
            )}
        >
            <div className="flex min-h-11 items-center justify-between gap-4 border-b border-border/60 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                Paso {step}
                            </span>
                            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-border" />
                            <h2 id={titleId} className="truncate text-base font-semibold tracking-tight text-foreground">
                                {title}
                            </h2>
                        </div>
                        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
                    </div>
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </section>
    );
}
