"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

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
    const [isPending, startTransition] = useTransition();

    const handleSelect = (id?: string) => {
        startTransition(() => {
            if (id) {
                router.push(`?branchId=${id}`, { scroll: false });
            } else {
                router.push(`?`, { scroll: false });
            }
        });
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
            {isPending && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando...</span>
                </div>
            )}
            {items.map((item, index) => {
                const isAll = item.id === undefined;
                const isActive = isAll ? !currentBranchId : currentBranchId === item.id;
                const colorClass = DOT_COLORS[index % DOT_COLORS.length];

                return (
                    <button
                        key={item.id || "all"}
                        onClick={() => handleSelect(item.id)}
                        disabled={isPending}
                        className={cn(
                            "relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200 border",
                            isActive
                                ? "bg-white text-black border-white shadow-lg shadow-white/10"
                                : "bg-[#18181b] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white",
                            isPending && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {/* Dot */}
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            isActive ? colorClass : colorClass
                        )} />

                        <span>{item.name}</span>
                    </button>
                );
            })}
        </div>
    );
}
