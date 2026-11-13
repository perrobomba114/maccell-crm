"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardOrigin } from "@/lib/dashboard-navigation";
import { reportMonth } from "@/lib/date-utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Technician {
    id: string;
    name: string;
    repairs: number;
    time: number; // in minutes
}

interface TechLeaderboardProps {
    technicians: Technician[];
}

export function TechLeaderboard({ technicians }: TechLeaderboardProps) {
    const router = useRouter();
    const params = useSearchParams();
    const pathname = usePathname();
    // Sort by repairs (desc)
    const sortedTechs = [...technicians].sort((a, b) => b.repairs - a.repairs);

    const handleTechClick = (tech: Technician) => {
        const date = reportMonth(params.get("month"), params.get("year")).toISOString().slice(0, 7);
        const filters = new URLSearchParams({ techId: tech.id, tech: tech.name, date });
        if (params.get("branchId")) filters.set("branch", params.get("branchId")!);
        if (pathname === "/admin/dashboard") {
            dashboardOrigin(new Date(date + "-01T12:00:00Z"), params.get("branchId")).forEach((value, key) => filters.set(key, value));
        }
        router.push(`/admin/repairs?${filters}`);
    };

    return <section className="h-full rounded-2xl border border-violet-900/70 bg-zinc-950 p-5">
        <h3 className="flex items-center gap-2 text-xl font-black italic"><Trophy className="size-5 text-violet-400" />Podio Técnico</h3>
        <p className="mb-3 text-sm text-zinc-400">Tickets con actividad de cierre en el período.</p>
        <ol className="divide-y divide-zinc-800">{sortedTechs.slice(0, 5).map((tech, i) => <li key={tech.id}>
            <button type="button" onClick={() => handleTechClick(tech)} className="grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-md py-3 text-left hover:bg-violet-950/50">
                <span className={cn("grid size-8 place-items-center rounded-lg font-black", ["bg-amber-400 text-zinc-950","bg-slate-300 text-zinc-950","bg-orange-500 text-zinc-950"][i] ?? "bg-zinc-800")}>{i + 1}</span>
                <span className="min-w-0 break-words font-semibold">{tech.name}<span className="block text-xs font-normal text-zinc-400">{tech.time} min de carga actual</span></span>
                <span className="text-right font-bold tabular-nums">{tech.repairs}<span className="block text-xs font-normal text-zinc-400">tickets</span></span>
            </button>
        </li>)}</ol>{!sortedTechs.length && <p>Sin técnicos en la selección.</p>}
    </section>;
}
