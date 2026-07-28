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

export function RepairFormSection({
    step,
    title,
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
                "overflow-hidden rounded-2xl border border-border/65 bg-card/90 shadow-sm",
                "transition-colors duration-200 hover:border-primary/25",
                className,
            )}
        >
            <div className={cn(
                "flex min-h-14 justify-between gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/10 via-primary/[0.03] to-transparent px-4 py-3 sm:px-5",
                action ? "flex-col items-stretch sm:flex-row sm:items-center" : "items-center",
            )}>
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/15">
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
            <div className="bg-background/35 p-4 sm:p-5">{children}</div>
        </section>
    );
}
