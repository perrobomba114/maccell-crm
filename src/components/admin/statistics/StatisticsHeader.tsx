"use client";

import Link from "next/link";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MonthNavigator } from "./MonthNavigator";

interface StatisticsHeaderProps {
    branches: any[];
    currentBranchId?: string;
}

export function StatisticsHeader({ branches, currentBranchId }: StatisticsHeaderProps) {
    // Get current branch label
    const currentBranchName = currentBranchId
        ? branches.find(b => b.id === currentBranchId)?.name
        : "Todas las Sucursales";

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-zinc-900/80 pb-8 px-1">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Centro de Estadísticas</h1>
                <div className="mt-4">
                    <MonthNavigator />
                </div>
            </div>

            {/* Unified Filter */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider hidden md:block">Filtrar por:</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="bg-[#18181b] border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 min-w-[180px] justify-between">
                            <span className="flex items-center gap-2">
                                <Filter size={14} className="text-violet-500" />
                                {currentBranchName}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#18181b] border-zinc-800 text-zinc-300 w-[200px]">
                        <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                            <Link href="/admin/statistics">Todas las Sucursales</Link>
                        </DropdownMenuItem>
                        {branches.map((branch) => (
                            <DropdownMenuItem key={branch.id} asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                                <Link href={`/admin/statistics?branchId=${branch.id}`}>
                                    {branch.name}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
