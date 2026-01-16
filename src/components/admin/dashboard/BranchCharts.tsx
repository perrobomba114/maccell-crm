"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

// --- Branch Profit Chart ---
interface BranchProfitProps {
    data: {
        name: string;
        profit: number;
        revenue: number;
    }[];
}

export function BranchProfitChart({ data }: BranchProfitProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 200);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted || !isReady) return <Card className="bg-[#18181b] border-zinc-800 shadow-none h-[450px] animate-pulse" />;

    return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-white">Ganancias por Sucursal</CardTitle>
                <CardDescription className="text-zinc-500">Comparativa de Ingresos vs Ganancia Real</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={300} debounce={50}>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-800" />
                        <XAxis
                            dataKey="name"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tick={{ fill: "#71717a", fontSize: 12 }}
                        />
                        <YAxis
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value / 1000}k`}
                            tick={{ fill: "#71717a", fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="profit" name="Ganancia" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// --- Growth Chart ---
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
        const timer = setTimeout(() => setIsReady(true), 200);
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
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={300} debounce={50}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-800" />
                        <XAxis
                            dataKey="name"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tick={{ fill: "#71717a", fontSize: 12 }}
                        />
                        <YAxis
                            fontSize={12}
                            tick={{ fill: "#71717a", fontSize: 12 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="percent" name="Crecimiento %" radius={[4, 4, 0, 0]} maxBarSize={50}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.percent >= 0 ? "#10b981" : "#ef4444"}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
