"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

interface DashboardChartsProps {
    stats: any;
}

export function DashboardCharts({ stats }: DashboardChartsProps) {
    // Data preparation
    const salesData = stats.charts.salesByMonth || [];
    const statusData = stats.charts.repairsByStatus || [];
    const categoryDataProp = stats.categoryShare?.segments || [];

    // Ensure we have some colors
    const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Revenue Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Ingresos Mensuales</CardTitle>
                    <CardDescription>Tendencia de ventas últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                        <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                stroke="#888888"
                            />
                            <YAxis
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                stroke="#888888"
                                tickFormatter={(value) => `$${value}`}
                            />
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                itemStyle={{ color: '#0f172a' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#0ea5e9"
                                fillOpacity={1}
                                fill="url(#colorSales)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Category Profit Share (Donut) */}
            <Card>
                <CardHeader>
                    <CardTitle>Rentabilidad por Categoría</CardTitle>
                    <CardDescription>Distribución de ganancias estimadas</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                        <PieChart>
                            <Pie
                                data={categoryDataProp}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {categoryDataProp.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                formatter={(value: number) => `$${value.toLocaleString()}`}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

        </div>
    );
}
