"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Branch {
    id: string;
    name: string;
    color?: string | null;
}

interface FilterProps {
    branches: Branch[];
    currentBranchId?: string;
}

export function BranchFilter({ branches, currentBranchId }: FilterProps) {
    const router = useRouter();

    const handleSelect = (id?: string) => {
        if (id) {
            router.push(`?branchId=${id}`);
        } else {
            router.push(`?`);
        }
    };

    const allBranchItem = { id: undefined, name: "Todas las Sucursales" };
    const items = [allBranchItem, ...branches];

    // Colors mapping based on index or hash equivalent (simple cyclical)
    const DOT_COLORS = [
        "bg-zinc-400", // All
        "bg-blue-500",
        "bg-red-500",
        "bg-emerald-500",
        "bg-orange-500",
        "bg-violet-500"
    ];

    return (
        <div className="flex flex-wrap gap-3 items-center">
            {items.map((item, index) => {
                const isAll = item.id === undefined;
                const isActive = isAll ? !currentBranchId : currentBranchId === item.id;
                const colorClass = DOT_COLORS[index % DOT_COLORS.length];

                return (
                    <button
                        key={item.id || "all"}
                        onClick={() => handleSelect(item.id)}
                        className={cn(
                            "relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200 border",
                            isActive
                                ? "bg-white text-black border-white shadow-lg shadow-white/10"
                                : "bg-[#18181b] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
                        )}
                    >
                        {/* Dot */}
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            isActive ? colorClass : colorClass // Keep color dot always visible? Or specific color when active? Mockup shows Active = White Button with colored text or just plain. 
                            // Wait, Mockup shows: "Todas las Sucursales" (White Pill, Black Text). 
                            // "8 BIT ACCESORIOS" (Dark pill, blue dot).
                            // So: Active = White Background. Inactive = Dark Background + Colored Dot.
                        )} />

                        <span>{item.name}</span>
                    </button>
                );
            })}
        </div>
    );
}
