import { Suspense } from "react";
import { FinancialStats } from "@/components/admin/dashboard/FinancialStats";
import { SmartInsights } from "@/components/admin/dashboard/SmartInsights";
import { OperationalHighlights } from "@/components/admin/dashboard/OperationalHighlights";
import { RecentTransactions } from "@/components/admin/dashboard/RecentTransactions";
import { OperationsDetail } from "@/components/admin/dashboard/OperationsDetail";
import { InventorySection } from "@/components/admin/dashboard/InventorySection";

// We need a Client Component to manage the state for the Interactive Section
import { InteractiveDashboardSection } from "@/components/admin/dashboard/InteractiveDashboardSection";

// --- Types ---
// Assuming the shape based on dashboard-actions.ts return types
// We use 'any' for simplicity as the project leans that way, but ideally strictly typed.

export async function SmartInsightsWidget({ salesPromise }: { salesPromise: Promise<any> }) {
    const sales = await salesPromise;
    // Construct a partial 'stats' object that SmartInsights expects
    const stats = {
        financials: sales.financials,
        stock: sales.stock
    };
    return <SmartInsights stats={stats} />;
}

export async function FinancialsWidget({ salesPromise, repairsPromise }: { salesPromise: Promise<any>, repairsPromise: Promise<any> }) {
    const [sales, repairs] = await Promise.all([salesPromise, repairsPromise]);

    // Construct the 'stats' object required by FinancialStats
    const stats = {
        financials: sales.financials, // from getSalesAnalytics
        repairs: repairs.repairs,     // from getRepairAnalytics
        stock: sales.stock            // from getSalesAnalytics
    };

    return <FinancialStats stats={stats} />;
}

export async function OperationsDetailWidget({ repairsPromise, branchStatsPromise }: { repairsPromise: Promise<any>, branchStatsPromise: Promise<any> }) {
    const [repairs, branchStats] = await Promise.all([repairsPromise, branchStatsPromise]);

    // Construct stats
    const stats = {
        repairs: repairs.repairs
    };

    return <OperationsDetail stats={stats} branchStats={branchStats} />;
}

export async function InventoryWidget({ salesPromise, repairsPromise, branchStatsPromise, productStatsPromise }: {
    salesPromise: Promise<any>,
    repairsPromise: Promise<any>,
    branchStatsPromise: Promise<any>,
    productStatsPromise: Promise<any>
}) {
    const [sales, repairs, branchStats, productStats] = await Promise.all([salesPromise, repairsPromise, branchStatsPromise, productStatsPromise]);

    const stats = {
        stock: sales.stock,
        repairs: repairs.repairs // for frequent parts
    };

    return <InventorySection stats={stats} branchStats={branchStats} productStats={productStats} />;
}


export async function InteractiveWidget({ salesPromise, repairsPromise, transactionsPromise }: {
    salesPromise: Promise<any>,
    repairsPromise: Promise<any>,
    transactionsPromise: Promise<any>
}) {
    const [sales, repairs, transactions] = await Promise.all([salesPromise, repairsPromise, transactionsPromise]);

    const stats = {
        categoryShare: sales.categoryShare,
        repairs: repairs.repairs,
        tables: transactions.tables
    };

    // Use the Client Component interacting wrapper
    return <InteractiveDashboardSection stats={stats} />;
}
