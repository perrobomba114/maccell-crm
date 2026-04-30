"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

type RepairStackKey = { name: string; color: string };
type BranchUndeliveredDatum = {
    name: string;
    undelivered?: number;
    [key: string]: string | number | undefined;
};
type RepairTooltipPayload = {
    dataKey: string;
    color?: string;
    name?: string;
    payload: BranchUndeliveredDatum;
};

const RepairTooltip = ({ active, payload, label }: { active?: boolean; payload?: RepairTooltipPayload[]; label?: string }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const relevantKeys = payload.map((p) => p.dataKey);
        const total = relevantKeys.reduce((sum: number, key: string) => sum + (Number(data[key]) || 0), 0);

        return (
            <div className="bg-[#18181b] border border-zinc-800 p-3 rounded-lg shadow-xl min-w-[180px] z-[100]">
                <div className="flex items-center justify-between mb-2 border-b border-zinc-800 pb-1.5">
                    <span className="font-bold text-white text-sm tracking-tight">{label}</span>
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Activos</span>
                </div>
                <div className="space-y-1.5">
                    {payload.map((entry, index: number) => {
                        const val = data[entry.dataKey] || 0;
                        return (
                            <div key={index} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                                    <span className="text-zinc-400 text-xs">{entry.name}</span>
                                </div>
                                <span className="text-white font-bold text-sm">{val}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase">Total</span>
                    <span className="text-sm font-bold text-white">{total} Equipos</span>
                </div>
            </div>
        );
    }
    return null;
};

export function BranchUndeliveredChart({ data, keys }: { data: BranchUndeliveredDatum[], keys?: RepairStackKey[] }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!data || data.length === 0) return null;
    if (!isMounted || !isReady) return <Card className="bg-[#18181b] border-zinc-800 shadow-none h-[450px] animate-pulse" />;

    return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none h-full flex flex-col overflow-visible">
            <CardHeader className="pb-4 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                            Stock de Reparaciones
                        </CardTitle>
                        <CardDescription className="text-zinc-500 text-xs">
                            Equipos actualmente en proceso por sucursal
                        </CardDescription>
                    </div>
                </div>

                {keys && keys.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 px-2 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                        {keys.map((k) => (
                            <div key={k.name} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full ring-1 ring-white/10" style={{ backgroundColor: k.color }} />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{k.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardHeader>

            <CardContent className="flex-1 pb-6 relative min-h-0 pl-0">
                <div className="w-full" style={{ height: Math.max(400, data.length * 100) }}>
                    <ResponsiveContainer key={isReady ? "ready" : "not-ready"} width="100%" height="100%" minWidth={200} minHeight={300}>
                        <BarChart
                            data={data}
                            layout="vertical"
                            stackOffset="expand"
                            barCategoryGap={20}
                            margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
                        >
                            <CartesianGrid strokeDasharray="12 12" horizontal={false} stroke="#27272a" opacity={0.3} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={<RepairTooltip />}
                                cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
                                wrapperStyle={{ zIndex: 100 }}
                            />

                            {keys && keys.length > 0 ? (
                                keys.map((k) => {
                                    return (
                                        <Bar
                                            key={k.name}
                                            dataKey={k.name}
                                            stackId="repairs"
                                            fill={k.color}
                                            radius={[0, 0, 0, 0]}
                                            barSize={20}
                                            stroke="#18181b"
                                            strokeWidth={1}
                                            className="transition-all duration-300 hover:opacity-90"
                                            animationDuration={1500}
                                        />
                                    );
                                })
                            ) : (
                                <Bar
                                    dataKey="undelivered"
                                    fill="#f97316"
                                    radius={[4, 4, 4, 4]}
                                    barSize={20}
                                    name="Equipos"
                                />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
