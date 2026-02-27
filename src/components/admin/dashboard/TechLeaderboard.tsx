"use client";

import React from "react";
import { Trophy, Medal, Timer } from "lucide-react";
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
        <div className="bg-[#09090b] rounded-3xl p-7 border border-zinc-900 shadow-2xl h-full flex flex-col overflow-hidden relative group">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-violet-600/20 transition-all duration-1000" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-emerald-600/20 transition-all duration-1000" />

            {/* Header */}
            <div className="mb-8 flex justify-between items-center z-10 relative">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/20">
                            <Trophy className="text-violet-400" size={18} />
                        </div>
                        <h3 className="font-black text-xl text-white tracking-tight uppercase italic">
                            Podio Técnico
                        </h3>
                    </div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-10">Productividad del Taller</p>
                </div>
            </div>

            <div className="flex-1 space-y-3 z-10 relative">
                {sortedTechs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-12">
                        <Timer className="mb-2 opacity-20" size={48} />
                        <p className="text-sm font-medium">Sin actividad registrada</p>
                    </div>
                ) : (
                    sortedTechs.slice(0, 5).map((tech, index) => {
                        const isFirst = index === 0;
                        const avgTime = tech.repairs > 0 ? Math.round(tech.time / tech.repairs) : 0;

                        return (
                            <motion.div
                                key={tech.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                className={cn(
                                    "group/item relative p-4 rounded-2xl border-2 transition-all duration-500",
                                    isFirst
                                        ? "bg-gradient-to-br from-violet-600/10 to-transparent border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.05)]"
                                        : "bg-zinc-900/20 border-transparent hover:border-zinc-800 hover:bg-zinc-900/40"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Rank Badge with Gradient */}
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-xl transition-transform duration-500 group-hover/item:scale-110",
                                        index === 0 ? "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 text-white border border-yellow-400/50 shadow-yellow-500/20" :
                                            index === 1 ? "bg-gradient-to-br from-zinc-300 via-zinc-400 to-zinc-600 text-white border border-zinc-200/30" :
                                                index === 2 ? "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 text-white border border-orange-400/30" :
                                                    "bg-zinc-800 text-zinc-500 border border-zinc-700/50"
                                    )}>
                                        {index === 0 ? <Medal size={22} className="drop-shadow-md" /> : index + 1}
                                    </div>

                                    {/* Tech Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "font-bold text-sm tracking-tight",
                                                    isFirst ? "text-white" : "text-zinc-300 group-hover/item:text-white transition-colors"
                                                )}>
                                                    {tech.name}
                                                </span>
                                                <div className="flex items-center gap-1.5 opacity-60">
                                                    <Timer size={10} className="text-violet-400" />
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                                        {avgTime > 0 ? `${avgTime} min prom.` : "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-lg font-black text-white leading-none tracking-tighter tabular-nums">
                                                    {tech.repairs}
                                                </span>
                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Equipos</span>
                                            </div>
                                        </div>

                                        {/* Stylized Progress Bar */}
                                        <div className="h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(tech.repairs / maxRepairs) * 100}%` }}
                                                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                                                className={cn(
                                                    "h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                                    index === 0 ? "bg-gradient-to-r from-yellow-400 to-yellow-600" :
                                                        index === 1 ? "bg-gradient-to-r from-zinc-300 to-zinc-500" :
                                                            index === 2 ? "bg-gradient-to-r from-orange-400 to-orange-600" :
                                                                "bg-gradient-to-r from-violet-600 to-violet-800"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
