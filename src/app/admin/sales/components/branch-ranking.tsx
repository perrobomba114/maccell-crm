import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BranchRankingItem } from "@/types/sales";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
});

interface BranchRankingProps {
    rankingData: BranchRankingItem[];
    selectedBranchId: string;
    onSelectBranch: (branchId: string) => void;
}

export function BranchRanking({ rankingData, selectedBranchId, onSelectBranch }: BranchRankingProps) {
    const total = rankingData.reduce((sum, item) => sum + item.total, 0);
    const maxTotal = rankingData[0]?.total ?? 0;

    return (
        <Card className="border bg-card shadow-sm">
            <CardHeader className="gap-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                    Ranking por sucursal
                </CardTitle>
                <CardDescription>
                    Distribución del período seleccionado. Hacé click para filtrar la tabla.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {rankingData.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                        No hay ventas para discriminar por sucursal.
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {rankingData.map((item, index) => {
                            const percent = total > 0 ? Math.round((item.total / total) * 100) : 0;
                            const widthPercent = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                            const isActive = item.branchId === selectedBranchId;
                            const isLeader = index === 0;

                            return (
                                <button
                                    key={item.branchId ?? item.branchName}
                                    type="button"
                                    onClick={() => onSelectBranch(item.branchId ?? "ALL")}
                                    className={cn(
                                        "group rounded-lg border bg-background/60 p-4 text-left transition-colors hover:bg-muted/40",
                                        isActive && "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                                        isLeader
                                                            ? "bg-amber-500 text-black"
                                                            : "bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    {isLeader ? <Trophy className="h-3 w-3" /> : index + 1}
                                                </span>
                                                <span className="truncate text-sm font-bold">{item.branchName}</span>
                                                {isActive && (
                                                    <Badge variant="secondary" className="rounded-md">
                                                        Activa
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {percent}% del total del período
                                            </p>
                                        </div>
                                        <span className="text-sm font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                                            {currencyFormatter.format(item.total)}
                                        </span>
                                    </div>
                                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                isLeader
                                                    ? "bg-amber-500 group-hover:bg-amber-400"
                                                    : "bg-emerald-500 group-hover:bg-emerald-400"
                                            )}
                                            style={{ width: `${widthPercent}%` }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
