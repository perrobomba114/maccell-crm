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
            const currentUrl = new URL(window.location.href);
            if (id) {
                currentUrl.searchParams.set("branchId", id);
            } else {
                currentUrl.searchParams.delete("branchId");
            }
            router.push(currentUrl.pathname + currentUrl.search, { scroll: false });
        });
    };

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
        <div className={cn("flex min-w-0 items-center gap-2", className)}>
            {isPending && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                </div>
            )}

            {/* MOBILE: Select Dropdown (< md) */}
            <div className="block min-w-36 flex-1 xl:hidden">
                <Select
                    disabled={isPending}
                    value={currentBranchId || "all"}
                    onValueChange={(val) => handleSelect(val === "all" ? undefined : val)}
                >
                    <SelectTrigger aria-label="Sucursal" className="min-h-11 w-full bg-[#18181b] border-zinc-700 text-zinc-100">
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
            <div className="hidden xl:flex items-center gap-2 flex-wrap py-0.5">
                {items.map((item, index) => {
                    const isAll = item.id === undefined;
                    const isActive = isAll ? !currentBranchId : currentBranchId === item.id;
                    const colorClass = DOT_COLORS[index % DOT_COLORS.length];

                    return (
                        <button
                            key={item.id || "all"}
                            aria-pressed={isActive}
                            onClick={() => handleSelect(item.id)}
                            disabled={isPending}
                            className={cn(
                                "relative flex min-h-11 items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 border shrink-0",
                                isActive
                                    ? "bg-white text-slate-950 border-white shadow-md shadow-white/10 font-black"
                                    : "bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white hover:bg-slate-850",
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
