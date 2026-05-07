export type VendorStats = {
    salesMonthCount?: number;
    salesMonthTotal?: number;
    salesMonthGrowth?: number;
    repairsIntakeMonth?: number;
    repairRevenueMonth?: number;
    repairCountMonth?: number;
    readyForPickup?: ReadyForPickup[];
    topSellingProducts?: BestSeller[];
    salesLast7Days?: SalesDay[];
    recentActivity?: RecentActivity[];
    okCount?: number;
    noRepairCount?: number;
    deliveredCount?: number;
};

export type VendorUser = {
    name: string;
    branch?: {
        name?: string | null;
    } | null;
};

export type ReadyForPickup = {
    id: string;
    ticket: string;
    customer: string;
    phone: string;
    device: string | null;
    amount: number;
};

export type BestSeller = {
    name: string;
    value: number;
};

export type SalesDay = {
    name: string;
    total: number;
};

export type RecentActivity = {
    id: string;
    action: string;
    details: string;
    date: string;
    time: string;
};

export type MetricTone = "emerald" | "cyan" | "amber" | "rose";
