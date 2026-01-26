"use client";

import { useState } from "react";
import { OperationalHighlights } from "@/components/admin/dashboard/OperationalHighlights";
import { RecentTransactions } from "@/components/admin/dashboard/RecentTransactions";

export function InteractiveDashboardSection({ stats }: { stats: any }) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    return (
        <>
            <OperationalHighlights
                stats={stats}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
            />

            <RecentTransactions
                stats={stats}
                selectedCategory={selectedCategory}
            />
        </>
    );
}
