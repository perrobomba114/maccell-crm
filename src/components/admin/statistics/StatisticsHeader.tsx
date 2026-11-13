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
            <ReportFilters dashboard={dashboard} key={query.toString()} month={period.getUTCMonth()} year={period.getUTCFullYear()}
                branch={currentBranchId ?? ""} branches={branches} currentYear={Number(formatArgentinaDate(new Date(), "yyyy"))} />
    );
}
