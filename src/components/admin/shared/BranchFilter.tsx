"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Branch {
    id: string;
    name: string;
    color?: string | null;
}

interface FilterProps {
    branches: Branch[];
    currentBranchId?: string;
    className?: string; // Allow external styling
}

export function BranchFilter({ branches, currentBranchId, className }: FilterProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleSelect = (id?: string) => {
        startTransition(() => {
            // Check if we already have query params to preserve (e.g., month/year in statistics)
            // But usually, changing branch resets view context or maintains it?
            // Existing logic was: router.push(`?branchId=${id}`, { scroll: false });
            // This REPLACES other params if we aren't careful.
            // Let's improve it to preserve other params if possible, or stick to existing logic if safe.
            // Dashboard page code: router.push(`?branchId=${id}`) implies overlapping params?
            // Actually, `useSearchParams` is safer but for now let's reproduce existing behavior + preservation improvement.

            const currentUrl = new URL(window.location.href);
            if (id) {
                currentUrl.searchParams.set("branchId", id);
            } else {
                currentUrl.searchParams.delete("branchId");
            }
            router.push(currentUrl.pathname + currentUrl.search, { scroll: false });
        });
    };

    const allBranchItem = { id: "all", name: "Todas las Sucursales" }; // Use "all" as string for Select compatibility
    // For Select, value must be string. We map "undefined" or "" to "all".

    // Desktop Items
    const items = [{ id: undefined, name: "Todas las Sucursales" }, ...branches];

    // Colors
    const DOT_COLORS = [
        "bg-zinc-400",
        "bg-blue-500",
        "bg-red-500",
        "bg-emerald-500",
        "bg-orange-500",
        "bg-violet-500"
    ];

    return (
        <div className={cn("flex items-center gap-3", className)}>
            {isPending && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                </div>
            )}

            {/* MOBILE: Select Dropdown (< md) */}
            <div className="block md:hidden w-full min-w-[200px]">
                <Select
                    disabled={isPending}
                    value={currentBranchId || "all"}
                    onValueChange={(val) => handleSelect(val === "all" ? undefined : val)}
                >
                    <SelectTrigger className="w-full bg-[#18181b] border-zinc-700 text-zinc-100">
                        <SelectValue placeholder="Filtrar por Sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Sucursales</SelectItem>
                        {branches.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                                {b.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* DESKTOP: Pill Buttons (>= md) */}
            <div className="hidden md:flex flex-wrap gap-2">
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
                                "relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200 border",
                                isActive
                                    ? "bg-white text-black border-white shadow-lg shadow-white/10"
                                    : "bg-[#18181b] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white", // Hover only available on desktop effectively
                                isPending && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                colorClass
                            )} />
                            <span>{item.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
