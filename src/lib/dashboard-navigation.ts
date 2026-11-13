export function dashboardOrigin(period: Date, branchId?: string | null) {
    const params = new URLSearchParams({ fromMonth: period.toISOString().slice(0, 7) });
    if (branchId) params.set("fromBranch", branchId);
    return params;
}

export function dashboardReturnHref(period?: string | null, branch?: string | null) {
    if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return null;
    const params = new URLSearchParams({ month: String(Number(period.slice(5)) - 1), year: period.slice(0, 4) });
    if (branch) params.set("branchId", branch);
    return `/admin/dashboard?${params}`;
}
