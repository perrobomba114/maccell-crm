"use client";

import {
    Cell,
    ResponsiveContainer,
    Tooltip,
    PieChart,
    Pie
} from "recharts";
import { LayoutList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

type RepairStatusDatum = {
    name: string;
    value: number;
    color: string;
};

export function RepairsByStatusChart({ data }: { data: RepairStatusDatum[] }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!data || data.length === 0) return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none h-full flex items-center justify-center min-h-[400px]">
            <span className="text-zinc-500 text-sm">Sin datos registrados</span>
        </Card>
    );

    if (!isMounted || !isReady) return <Card className="bg-[#18181b] border-zinc-800 shadow-none h-[450px] animate-pulse" />;

    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Card className="bg-[#18181b] border-zinc-800 shadow-none h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <LayoutList className="w-5 h-5 text-blue-500" />
                    Estado Mensual
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                    Distribución de reparaciones (Mes Actual)
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center gap-12 px-6 pb-6">
                <div className="h-[280px] w-[280px] shrink-0 relative">
                    <ResponsiveContainer key={isReady ? "ready" : "not-ready"} width="100%" height="100%" minWidth={200} minHeight={300}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={85}
                                outerRadius={115}
                                paddingAngle={5}
                                dataKey="value"
                                animationDuration={1000}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-white leading-none">{total}</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-medium">Total</span>
                    </div>
                </div>

                <div className="flex-1 w-full space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                    {data.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs group py-0.5">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                                <span className="text-zinc-300 group-hover:text-white transition-colors truncate">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-100">{item.value}</span>
                                <span className="text-[10px] text-zinc-500">{Math.round((item.value / total) * 100)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
