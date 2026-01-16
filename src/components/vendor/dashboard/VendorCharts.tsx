"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface VendorChartsProps {
    data: {
        salesLast7Days: { name: string; total: number }[];
    }
}

export function SalesWeekChart({ data }: { data: { name: string; total: number }[] }) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    if (!isMounted) return <Card className="col-span-4 lg:col-span-2 border-none shadow-md h-[435px]" />;
    return (
        <Card className="col-span-4 lg:col-span-2 border-none shadow-md">
            <CardHeader>
                <CardTitle className="text-xl">Ventas de la Semana</CardTitle>
                <CardDescription>Rendimiento últimos 7 días</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} stroke="currentColor" />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={5}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `$${val}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(100,100,100,0.1)' }}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--popover))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    color: 'hsl(var(--popover-foreground))',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                                itemStyle={{ color: 'inherit' }}
                                labelStyle={{ color: 'inherit', fontWeight: 'bold', marginBottom: '4px' }}
                                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Venta']}
                            />
                            <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} name="Total" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
