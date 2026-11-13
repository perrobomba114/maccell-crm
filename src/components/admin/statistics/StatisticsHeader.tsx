import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ReportFilters } from "@/components/admin/shared/ReportFilters";
import { formatArgentinaDate } from "@/lib/date-utils";

interface StatisticsHeaderProps {
    branches: { id: string; name: string }[];
    currentBranchId?: string;
    period: Date;
    dashboard?: boolean;
}

export function StatisticsHeader({ branches, currentBranchId, period, dashboard }: StatisticsHeaderProps) {
    const query = new URLSearchParams({ month: String(period.getUTCMonth()), year: String(period.getUTCFullYear()) });
    if (currentBranchId) query.set("branchId", currentBranchId);

    return (
        <header className="mb-6 space-y-4 border-b border-zinc-800 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-x-4">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{dashboard ? "Dashboard" : "Estadísticas"}</h1>
                <Link className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-blue-300 underline-offset-4 hover:underline"
                    href={`/admin/${dashboard ? "statistics" : "dashboard"}?${query}`}>
                    {dashboard ? "Ver estadísticas" : "Ver dashboard"} <ArrowRight size={16} aria-hidden="true" />
                </Link>
            </div>
            <ReportFilters key={query.toString()} month={period.getUTCMonth()} year={period.getUTCFullYear()}
                branch={currentBranchId ?? ""} branches={branches} currentYear={Number(formatArgentinaDate(new Date(), "yyyy"))} />
        </header>
    );
}
