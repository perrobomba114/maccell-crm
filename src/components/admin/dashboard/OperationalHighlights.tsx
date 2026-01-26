"use client";

import { ProfitDonut } from "@/components/admin/dashboard/ProfitDonut";
import { TechLeaderboard } from "@/components/admin/dashboard/TechLeaderboard";

interface OperationalHighlightsProps {
    stats: any;
    selectedCategory: string | null;
    onCategorySelect: (category: string | null) => void;
}

export function OperationalHighlights({ stats, selectedCategory, onCategorySelect }: OperationalHighlightsProps) {
    if (!stats) return null;

    const { repairs, categoryShare } = stats;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="xl:col-span-2 min-h-[400px]">
                {/* Using the Donut Chart for profit Segments (Categories) */}
                <ProfitDonut
                    data={categoryShare.segments}
                    total={categoryShare.total}
                    onCategorySelect={onCategorySelect}
                    selectedCategory={selectedCategory}
                />
            </div>
            <div className="xl:col-span-1 min-h-[400px]">
                <TechLeaderboard technicians={repairs.technicians} />
            </div>
        </div>
    );
}
