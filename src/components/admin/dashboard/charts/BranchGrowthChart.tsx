"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    ReferenceLine
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface BranchGrowthProps {
    data: {
        name: string;
        percent: number;
    }[];
}

export function BranchGrowthChart({ data }: BranchGrowthProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted || !isReady) return <Card className="bg-[#18181b] border-zinc-800 shadow-none h-[450px] animate-pulse" />;

    return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-white">Crecimiento Mensual</CardTitle>
                <CardDescription className="text-zinc-500">% vs Mes Anterior</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer key={isReady ? "ready" : "not-ready"} width="100%" height="100%" minWidth={200} minHeight={300} debounce={50}>
                    <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="growthPositive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id="growthNegative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-800/50" />
                        <XAxis
                            dataKey="name"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tick={{ fill: "#71717a" }}
                            dy={10}
                        />
                        <YAxis
                            fontSize={11}
                            tick={{ fill: "#71717a" }}
                            tickFormatter={(value) => `${value}%`}
                            axisLine={false}
                            tickLine={false}
                            domain={[(min: number) => Math.min(min, 0), (max: number) => Math.max(max, 0)]}
                        />
                        <Tooltip
                            cursor={{ fill: '#ffffff05' }}
                            contentStyle={{
                                backgroundColor: 'rgba(9, 9, 11, 0.8)',
                                borderColor: 'rgba(39, 39, 42, 0.5)',
                                borderRadius: '12px',
                                color: '#fff',
                                backdropFilter: 'blur(8px)',
                                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}
                            formatter={(value: unknown) => [`${Number(value).toFixed(2)}%`, "Crecimiento"]}
                        />
                        <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                        <Bar dataKey="percent" name="Crecimiento %" radius={[6, 6, 6, 6]} maxBarSize={60} animationDuration={1500}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.percent >= 0 ? "url(#growthPositive)" : "url(#growthNegative)"}
                                    stroke={entry.percent >= 0 ? "#059669" : "#b91c1c"}
                                    strokeWidth={1}
                                    strokeOpacity={0.5}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
