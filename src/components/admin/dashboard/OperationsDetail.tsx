"use client";

import { RepairsByStatusChart, BranchUndeliveredChart } from "@/components/admin/dashboard/BranchCharts";

interface OperationsDetailProps {
    stats: any;
    branchStats?: any;
}

export function OperationsDetail({ stats, branchStats }: OperationsDetailProps) {
    if (!stats) return null;
    const { repairs } = stats;

    return (
        <div className="space-y-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-white">Detalle Operativo</h2>
                <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Status Distribution Chart */}
                <div className="h-[450px]">
                    <RepairsByStatusChart data={repairs.monthlyStatusDistribution} />
                </div>

                {/* Pending by Branch (If available) */}
                {branchStats && (
                    <div className="min-h-[450px]">
                        <BranchUndeliveredChart
                            data={branchStats.undeliveredChartData}
                            keys={branchStats.statusKeys}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
