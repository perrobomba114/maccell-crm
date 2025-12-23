"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STATUS_COLORS: Record<number, string> = {
    1: "#94a3b8", // Ingresado - Slate
    2: "#60a5fa", // Tomado - Blue
    3: "#fbbf24", // En Proceso - Amber
    4: "#f87171", // Pausado - Red
    5: "#22c55e", // Finalizado OK - Green
    6: "#ef4444", // No Reparado - Red
    7: "#a855f7", // Diagnosticado - Purple
    8: "#eab308", // Esperando Repuesto - Yellow
    9: "#f97316", // Presupuestado - Orange
    10: "#10b981", // Entregado - Emerald
};

const STATUS_NAMES: Record<number, string> = {
    1: "Ingresado",
    2: "Tomado",
    3: "En Proceso",
    4: "Pausado",
    5: "Finalizado OK",
    6: "No Reparado",
    7: "Diagnosticado",
    8: "Espera Repuesto",
    9: "Presupuestado",
    10: "Entregado",
};

interface RepairDistributionChartProps {
    data: {
        statusId: number;
        count: number;
    }[];
}

export function RepairDistributionChart({ data }: RepairDistributionChartProps) {
    const chartData = data.map(item => ({
        name: STATUS_NAMES[item.statusId] || `Estado ${item.statusId}`,
        value: item.count,
        color: STATUS_COLORS[item.statusId] || "#cccccc"
    }));

    return (
        <Card className="col-span-full lg:col-span-3">
            <CardHeader>
                <CardTitle>Reparaciones Mensuales por Estado</CardTitle>
                <CardDescription>Distribución de tu trabajo este mes</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="middle" align="right" layout="vertical" />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
