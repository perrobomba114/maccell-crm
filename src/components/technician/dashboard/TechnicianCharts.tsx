"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Tooltip,
    Legend
} from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export function WeeklyOutputChart({ data }: { data: { name: string; count: number }[] }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return (
        <Card className="col-span-4 lg:col-span-2 border border-zinc-900 h-[380px] bg-zinc-950/50 animate-pulse rounded-[2.5rem]" />
    );

    // Safe default if data is missing, filter out Sunday
    const chartData = (data || []).filter(item => !item.name.toLowerCase().includes('dom'));
    const totalRepairs = chartData.reduce((acc, curr) => acc + curr.count, 0);

    return (
        <Card className="col-span-4 lg:col-span-2 bg-[#09090b] border-2 border-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Análisis de Productividad</CardTitle>
                <CardDescription className="text-2xl font-black text-white tracking-tighter">
                    Reparaciones <span className="text-blue-500">Completadas</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{
                                top: 0,
                                right: 0,
                                left: 0,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid horizontal={false} stroke="#27272a" strokeDasharray="3 3" />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                tickMargin={0}
                                axisLine={false}
                                hide
                                width={10}
                            />
                            <XAxis dataKey="count" type="number" hide />
                            <Tooltip
                                cursor={false}
                                contentStyle={{
                                    backgroundColor: '#18181b',
                                    borderRadius: '12px',
                                    border: '1px solid #3f3f46',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar
                                dataKey="count"
                                fill="#2563eb"
                                radius={8}
                                barSize={32}
                                isAnimationActive={false}
                            >
                                <LabelList
                                    dataKey="name"
                                    position="insideLeft"
                                    offset={15}
                                    className="fill-white font-black text-[11px] uppercase tracking-wider"
                                    fontSize={11}
                                    style={{ fontWeight: 900 }}
                                />
                                <LabelList
                                    dataKey="count"
                                    position="right"
                                    offset={10}
                                    className="fill-white font-black text-[14px] tabular-nums"
                                    fontSize={14}
                                    style={{ fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm pt-0 pb-6 opacity-60 mt-auto">
                <div className="flex gap-2 leading-none font-bold text-zinc-400">
                    Tendencia de productividad <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-zinc-600 font-bold uppercase tracking-wider text-[10px]">
                    Total de {totalRepairs} reparaciones en los últimos 7 días
                </div>
            </CardFooter>
        </Card>
    );
}

export function MyStatusPieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <Card className="col-span-4 lg:col-span-2 border-none shadow-md h-[340px] animate-pulse rounded-[2.5rem] bg-zinc-900/20" />;

    const COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

    return (
        <Card className="col-span-4 lg:col-span-2 border-2 border-zinc-900 bg-zinc-900/50 backdrop-blur-sm shadow-xl rounded-[2.5rem]">
            <CardHeader>
                <CardTitle className="text-xl text-white font-black tracking-tight">Distribución de Mi Trabajo</CardTitle>
                <CardDescription className="text-zinc-400 font-medium">Estado actual de mis tickets asignados</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#18181b',
                                    borderRadius: '12px',
                                    border: '1px solid #3f3f46',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                                itemStyle={{ color: 'white' }}
                            />
                            <Legend
                                verticalAlign="middle"
                                align="right"
                                layout="vertical"
                                iconType="circle"
                                wrapperStyle={{ color: '#d4d4d8', fontWeight: 700 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
