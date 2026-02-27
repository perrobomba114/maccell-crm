"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Activity, Users, Clock } from "lucide-react";

interface WorkloadItem {
    id: string;
    name: string;
    isOnline: boolean;
    workload: number; // in minutes
}

export function CapacityAnalysis({ workloads }: { workloads: WorkloadItem[] }) {
    if (!workloads || workloads.length === 0) {
        return (
            <Card className="bg-[#09090b] border-zinc-900 rounded-3xl h-full flex flex-col items-center justify-center p-12">
                <Activity className="w-12 h-12 text-zinc-800 mb-4 animate-pulse" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Sin datos de capacidad</p>
            </Card>
        );
    }

    // Sort by workload
    const sortedData = [...workloads].sort((a, b) => b.workload - a.workload);

    return (
        <Card className="bg-[#09090b] border-zinc-900 shadow-2xl rounded-3xl overflow-hidden h-full flex flex-col relative group">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/10 transition-all duration-1000" />

            <CardHeader className="border-b border-zinc-900 pb-6 relative z-10">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                                <Users className="text-blue-400" size={18} />
                            </div>
                            <h3 className="font-black text-xl text-white tracking-tight uppercase italic">
                                Análisis de Capacidad
                            </h3>
                        </div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-10">Carga Horaria en Taller</p>
                    </div>
                    <div className="bg-zinc-900/50 px-3 py-1.5 rounded-xl border border-zinc-800 text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        TIEMPO REAL
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-6 relative z-10">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={sortedData}
                            layout="vertical"
                            margin={{ left: 20, right: 30, top: 0, bottom: 0 }}
                            barSize={32}
                        >
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#a1a1aa", fontSize: 12, fontWeight: 700 }}
                                width={100}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-2xl">
                                                <p className="text-xs font-black text-white uppercase mb-1">{data.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <Clock size={12} className="text-blue-400" />
                                                    <p className="text-sm font-bold text-blue-400">{data.workload} minutos restantes</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar
                                dataKey="workload"
                                radius={[0, 8, 8, 0]}
                                background={{ fill: '#18181b', radius: 8 }}
                            >
                                {sortedData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.workload > 120 ? '#ef4444' : entry.workload > 60 ? '#f59e0b' : '#3b82f6'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/50">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Minutos Pendientes</p>
                        <p className="text-lg font-black text-white tabular-nums">
                            {workloads.reduce((acc, curr) => acc + curr.workload, 0)} min
                        </p>
                    </div>
                    <div className="bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/50">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Técnicos Online</p>
                        <p className="text-lg font-black text-white tabular-nums">
                            {workloads.filter(w => w.isOnline).length} / {workloads.length}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
