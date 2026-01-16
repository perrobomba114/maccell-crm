"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface BestSellersChartProps {
    data: {
        name: string;
        value: number;
        fill: string;
    }[];
}

const COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#d946ef', '#64748b'
];

export function BestSellersChart({ data }: BestSellersChartProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    // Inject colors if not present or just override for consistency
    const chartData = data.map((item, index) => ({
        ...item,
        name: item.name || "Producto Desconocido", // Fallback for name
        fill: COLORS[index % COLORS.length]
    }));

    const totalSold = chartData.reduce((acc, curr) => acc + curr.value, 0);

    if (!isMounted) return <Card className="col-span-4 lg:col-span-2 border-none shadow-md h-full min-h-[400px] flex items-center justify-center animate-pulse" />;

    if (data.length === 0) {
        return (
            <Card className="col-span-4 lg:col-span-2 border-none shadow-md h-full min-h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">Sin datos de ventas este mes</p>
            </Card>
        )
    }

    return (
        <Card className="col-span-4 lg:col-span-2 border-none shadow-md h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-xl">Productos Más Vendidos</CardTitle>
                <CardDescription>Top 10 productos del mes actual</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[350px]">
                <div className="h-full w-full relative">
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <PieChart>
                            <defs>
                                <filter id="shadow" height="200%">
                                    <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
                                </filter>
                            </defs>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}  // Increased for bigger chart
                                outerRadius={140} // Increased significantly to fill space
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                                filter="url(#shadow)"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                                ))}
                            </Pie>
                            <Tooltip
                                // Custom formatter to show Name and Value
                                formatter={(value: any, name: any, props: any) => {
                                    // Recharts tooltip formatter signature: (value, name, props)
                                    // But dataKey="value" implies the 'name' arg here refers to the dataKey unless configured.
                                    // Actually, for PieChart, the second arg is the Name from data if configured.
                                    // Let's rely on the payload to be safe or standard behavior.
                                    return [`${value} Unidades`, props.payload.name];
                                }}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--popover))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    color: 'hsl(var(--popover-foreground))',
                                    zIndex: 100
                                }}
                                itemStyle={{ color: 'inherit' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Central Total - Centered perfectly now */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
                        <span className="text-4xl font-extrabold text-foreground">{totalSold}</span>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">Total</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
