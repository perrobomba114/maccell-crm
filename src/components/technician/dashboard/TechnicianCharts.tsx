"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface TechnicianChartsProps {
    data: {
        weeklyOutput: { name: string; count: number }[];
        statusDistribution: { name: string; value: number; color: string }[];
    }
}

export function WeeklyOutputChart({ data }: { data: { name: string; count: number }[] }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 150);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted || !isReady) return <Card className="col-span-4 lg:col-span-2 border-none shadow-md h-[340px] animate-pulse" />;
    return (
        <Card className="col-span-4 lg:col-span-2 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-xl">
            <CardHeader>
                <CardTitle className="text-xl text-white">Rendimiento Semanal</CardTitle>
                <CardDescription className="text-zinc-400">Reparaciones completadas últimos 7 días</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.5} />
                            <XAxis
                                dataKey="name"
                                stroke="#a1a1aa"
                                tick={{ fill: '#d4d4d8', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#a1a1aa"
                                tick={{ fill: '#d4d4d8', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: '#18181b',
                                    borderRadius: '12px',
                                    border: '1px solid #3f3f46',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                            />
                            <Bar
                                dataKey="count"
                                fill="url(#barGradient)"
                                radius={[6, 6, 0, 0]}
                                name="Completados"
                                label={{ position: 'top', fill: '#fff', fontSize: 12, fontWeight: 'bold' }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function MyStatusPieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 150);
        return () => clearTimeout(timer);
    }, []);

    if (!isMounted || !isReady) return <Card className="col-span-4 lg:col-span-2 border-none shadow-md h-[340px] animate-pulse" />;

    const COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6'];

    return (
        <Card className="col-span-4 lg:col-span-2 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-xl">
            <CardHeader>
                <CardTitle className="text-xl text-white">Distribución de Mi Trabajo</CardTitle>
                <CardDescription className="text-zinc-400">Estado actual de mis tickets asignados</CardDescription>
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
                                wrapperStyle={{ color: '#d4d4d8' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
