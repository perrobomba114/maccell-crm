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
        <div className="mt-2 rounded-lg border bg-muted/35 p-2 text-xs">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">{display.productName}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">SKU: {display.sku}</p>
                </div>
                <Badge variant="outline" className="max-w-[120px] shrink-0 truncate bg-background text-[10px]">
                    {display.branchName}
                </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-background px-2 py-1.5">
                <span className="font-mono font-bold">{display.currentQuantity}</span>
                <span className="text-muted-foreground">→</span>
                <span className={cn("font-mono font-black", display.adjustment > 0 ? "text-green-600" : "text-red-600")}>
                    {display.proposedQuantity}
                    <span className="ml-1 text-[10px] opacity-70">
                        ({display.adjustment > 0 ? "+" : ""}{display.adjustment})
                    </span>
                </span>
            </div>
        </div>
    );
}
