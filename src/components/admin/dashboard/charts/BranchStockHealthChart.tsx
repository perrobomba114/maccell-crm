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
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface BranchStockHealthProps {
    data: {
        name: string;
        health: number;
    }[];
}

export function BranchStockHealthChart({ data }: BranchStockHealthProps) {
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
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    Control de Stock por Sucursal
                </CardTitle>
                <CardDescription className="text-zinc-500 text-xs">
                    % de stock auditado en los últimos 30 días
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer key={isReady ? "ready" : "not-ready"} width="100%" height="100%" minWidth={200} minHeight={300} debounce={50}>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
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
                        />
                        <YAxis
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}%`}
                            tick={{ fill: "#71717a" }}
                            domain={[0, 100]}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 8 }}
                            contentStyle={{
                                backgroundColor: '#09090b',
                                borderColor: '#27272a',
                                borderRadius: '12px',
                                color: '#fff',
                                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: unknown) => [`${value}%`, "Auditado"]}
                        />
                        <Bar
                            dataKey="health"
                            name="Auditado"
                            fill="url(#healthGradient)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={60}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
