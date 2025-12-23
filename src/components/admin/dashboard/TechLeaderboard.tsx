"use client";

import React from "react";
import { Trophy, Medal, Timer, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Technician {
    name: string;
    repairs: number;
    time: number; // in minutes
}

interface TechLeaderboardProps {
    technicians: Technician[];
}

export function TechLeaderboard({ technicians }: TechLeaderboardProps) {
    // Sort by repairs (desc)
    const sortedTechs = [...technicians].sort((a, b) => b.repairs - a.repairs);
    const maxRepairs = sortedTechs[0]?.repairs || 1;

    return (
        <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 h-full flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start z-10 relative">
                <div>
                    <h3 className="font-bold text-lg text-white mb-1 flex items-center gap-2">
                        <Trophy className="text-yellow-500" size={20} />
                        Podio Técnico
                    </h3>
                    <p className="text-sm text-zinc-500">Rendimiento y Eficiencia</p>
                </div>
            </div>

            <div className="flex-1 space-y-4 flex flex-col justify-center z-10 relative">
                {sortedTechs.length === 0 ? (
                    <div className="text-zinc-500 text-center text-sm py-8">
                        Sin datos de reparaciones esta semana
                    </div>
                ) : (
                    sortedTechs.slice(0, 5).map((tech, index) => {
                        const isTop3 = index < 3;
                        const efficiencyScore = tech.repairs > 0 && tech.time > 0
                            ? Math.round(tech.time / tech.repairs) // minutes per repair (lower is better, but maybe we want a score?)
                            : 0;

                        // Let's display "Avg Time: X min" for efficiency
                        const avgTime = tech.repairs > 0 ? Math.round(tech.time / tech.repairs) : 0;

                        return (
                            <motion.div
                                key={tech.name}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "relative p-3 rounded-xl border transition-all duration-300",
                                    isTop3 ? "bg-zinc-900/40 border-zinc-800" : "border-transparent hover:bg-zinc-900/20"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Rank Badge */}
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg",
                                        index === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white ring-2 ring-yellow-500/20" :
                                            index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white ring-2 ring-gray-400/20" :
                                                index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white ring-2 ring-orange-500/20" :
                                                    "bg-zinc-800 text-zinc-500"
                                    )}>
                                        {index === 0 ? <Medal size={16} /> : index + 1}
                                    </div>

                                    {/* Tech Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={cn(
                                                "font-semibold truncate",
                                                index === 0 ? "text-yellow-500" :
                                                    index === 1 ? "text-gray-300" :
                                                        index === 2 ? "text-orange-400" : "text-zinc-300"
                                            )}>
                                                {tech.name}
                                            </span>
                                            <span className="text-white font-bold">{tech.repairs} <span className="text-zinc-500 text-xs font-normal">rep</span></span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(tech.repairs / maxRepairs) * 100}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className={cn(
                                                    "h-full rounded-full",
                                                    index === 0 ? "bg-yellow-500" :
                                                        index === 1 ? "bg-gray-400" :
                                                            index === 2 ? "bg-orange-500" : "bg-violet-600"
                                                )}
                                            />
                                        </div>

                                        {/* Efficiency Stat */}
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Timer size={12} />
                                            <span>{avgTime > 0 ? `~${avgTime}m / rep` : "N/A"}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-[60px] pointer-events-none" />
        </div>
    );
}
