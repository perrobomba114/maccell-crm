"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStockDiscrepancyDisplay } from "@/lib/notification-display";

type StockDiscrepancyNotificationDetailsProps = {
    actionData: unknown;
};

export function StockDiscrepancyNotificationDetails({ actionData }: StockDiscrepancyNotificationDetailsProps) {
    const display = getStockDiscrepancyDisplay(actionData);
    if (!display) return null;

    return (
        <div className="mt-2 max-w-full overflow-x-hidden rounded-lg border bg-muted/35 p-2 text-xs">
            <div className="flex min-w-0 max-w-full flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="font-bold leading-snug text-foreground [overflow-wrap:anywhere]">{display.productName}</p>
                    <p className="font-mono text-[10px] text-muted-foreground [overflow-wrap:anywhere]">SKU: {display.sku}</p>
                </div>
                <Badge variant="outline" className="!w-auto max-w-[45%] min-w-0 shrink whitespace-normal bg-background text-[10px] leading-tight [overflow-wrap:anywhere]">
                    {display.branchName}
                </Badge>
            </div>
            <div className="mt-2 flex min-w-0 max-w-full items-center justify-between gap-2 overflow-x-hidden rounded-md bg-background px-2 py-1.5">
                <span className="min-w-0 font-mono font-bold [overflow-wrap:anywhere]">{display.currentQuantity}</span>
                <span className="shrink-0 text-muted-foreground">→</span>
                <span className={cn("min-w-0 font-mono font-black [overflow-wrap:anywhere]", display.adjustment > 0 ? "text-green-600" : "text-red-600")}>
                    {display.proposedQuantity}
                    <span className="ml-1 text-[10px] opacity-70">
                        ({display.adjustment > 0 ? "+" : ""}{display.adjustment})
                    </span>
                </span>
            </div>
        </div>
    );
}
