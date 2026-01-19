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
    ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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
        const timer = setTimeout(() => setIsReady(true), 150);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted || !isReady) return <Card className="col-span-1 shadow-sm h-[450px] animate-pulse" />;

    return (
        <Card className="col-span-1 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg font-bold">Ganancias por Sucursal</CardTitle>
                <CardDescription>Comparativa de Ingresos vs Ganancia Real</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                        <XAxis
                            dataKey="name"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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

// --- Top Products Chart ---
interface TopProductsProps {
    data: {
        name: string;
        quantity: number;
    }[];
}

export function TopProductsChart({ data }: TopProductsProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 150);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted || !isReady) return <Card className="col-span-1 shadow-sm h-[450px] animate-pulse" />;

    return (
        <Card className="col-span-1 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg font-bold">Productos Más Vendidos</CardTitle>
                <CardDescription>Top 10 por cantidad vendida</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
                        <XAxis type="number" fontSize={12} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={150}
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="quantity" name="Cantidad" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
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
        const timer = setTimeout(() => setIsReady(true), 150);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted || !isReady) return <Card className="col-span-1 shadow-sm h-[450px] animate-pulse" />;

    return (
        <Card className="col-span-1 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg font-bold">Crecimiento Mensual</CardTitle>
                <CardDescription>% vs Mes Anterior</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
                        <XAxis
                            dataKey="name"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            fontSize={11}
                            tickFormatter={(value) => `${value}%`}
                            axisLine={false}
                            tickLine={false}
                            domain={[(min: number) => Math.min(min, 0), (max: number) => Math.max(max, 0)]}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)', // Adapt for light mode default here?
                                backdropFilter: 'blur(8px)'
                            }}
                            formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "Crecimiento"]}
                        />
                        <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
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
