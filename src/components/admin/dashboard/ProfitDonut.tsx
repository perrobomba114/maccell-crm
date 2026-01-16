"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { PieChart as PieChartIcon } from "lucide-react";

interface ProfitDonutProps {
    data: any[];
    total: number;
    onCategorySelect?: (category: string | null) => void;
    selectedCategory?: string | null;
}

const COLORS = [
    { hex: '#8b5cf6', gradient: 'url(#colorVoyager)' }, // Violet
    { hex: '#06b6d4', gradient: 'url(#colorCyan)' },    // Cyan
    { hex: '#10b981', gradient: 'url(#colorEmerald)' }, // Emerald
    { hex: '#f59e0b', gradient: 'url(#colorAmber)' },   // Amber
    { hex: '#ef4444', gradient: 'url(#colorRed)' }      // Red
];

const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const fmtCompact = (n: number) => new Intl.NumberFormat("es-AR", { notation: "compact", compactDisplay: "short" }).format(n);

export function ProfitDonut({ data = [], total = 0, onCategorySelect, selectedCategory }: ProfitDonutProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    React.useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsReady(true), 150);
        return () => clearTimeout(timer);
    }, []);

    // ... existing sortedData logic ...
    const sortedData = [...(data || [])]
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);

    const safeTotal = total > 0 ? total : sortedData.reduce((acc, curr) => acc + curr.value, 0);

    if (!isMounted || !isReady) {
        return (
            <div className="bg-[#18181b] rounded-2xl border border-zinc-800/50 h-[435px] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (sortedData.length === 0) {
        return (
            <div className="bg-[#18181b] rounded-2xl p-6 border border-zinc-800/50 h-full flex flex-col items-center justify-center text-center">
                <div className="bg-zinc-900/50 p-4 rounded-full mb-4">
                    <PieChartIcon className="text-zinc-700" size={32} />
                </div>
                <h3 className="font-bold text-white mb-1">Sin Datos de Ganancia</h3>
                <p className="text-sm text-zinc-500 max-w-[200px]">No se registraron ventas con margen positivo en este periodo.</p>
            </div>
        );
    }

    return (
        <div className="bg-[#18181b] rounded-2xl p-0 border border-zinc-800/50 h-full flex flex-col overflow-hidden relative group">
            {/* Background Glow Effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="p-6 pb-2 relative z-10">
                <h3 className="font-bold text-lg text-white mb-1">Participación de Ganancias</h3>
                <p className="text-sm text-zinc-500">Distribución de rentabilidad por categoría</p>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row items-center justify-between p-6 gap-8 relative z-10 transition-all">
                {/* 1. Chart Section */}
                <div className="relative w-full lg:w-1/2 min-h-[300px]" style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300} debounce={50}>
                        <PieChart>
                            <defs>
                                <linearGradient id="colorVoyager" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#6d28d9" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#0891b2" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="colorAmber" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <Pie
                                data={sortedData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={6}
                                onClick={(data, index) => {
                                    if (onCategorySelect) {
                                        // Toggle selection
                                        if (selectedCategory === data.name) {
                                            onCategorySelect(null);
                                        } else {
                                            onCategorySelect(data.name);
                                        }
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                {sortedData.map((entry: any, index: number) => {
                                    const colorSet = COLORS[index % COLORS.length];
                                    const isSelected = selectedCategory === entry.name;
                                    const isDimmed = selectedCategory && !isSelected;

                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={colorSet.gradient}
                                            className={cn(
                                                "outline-none stroke-[#18181b] stroke-[2px] transition-all duration-300",
                                                isSelected ? "opacity-100 scale-105 stroke-white" : isDimmed ? "opacity-30" : "opacity-100 hover:opacity-80"
                                            )}
                                        />
                                    );
                                })}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(val: number | undefined) => fmtMoney(val || 0)}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Centered Total */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">
                            {selectedCategory ?
                                fmtCompact(sortedData.find(d => d.name === selectedCategory)?.value || 0) :
                                fmtCompact(safeTotal)
                            }
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">
                            {selectedCategory || "Ganancia Total"}
                        </span>
                    </div>
                </div>

                {/* 2. Legend / Details List (Right Side) */}
                <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-3">
                    {sortedData.slice(0, 5).map((entry: any, i: number) => {
                        const percent = safeTotal > 0 ? (entry.value / safeTotal) * 100 : 0;
                        const colorSet = COLORS[i % COLORS.length];
                        const isSelected = selectedCategory === entry.name;
                        const isDimmed = selectedCategory && !isSelected;

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex flex-col gap-1 w-full cursor-pointer transition-all duration-300",
                                    isDimmed ? "opacity-30 blur-[1px]" : "opacity-100"
                                )}
                                onClick={() => onCategorySelect && onCategorySelect(isSelected ? null : entry.name)}
                            >
                                <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={cn(
                                                "w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-transform",
                                                isSelected ? "scale-125 ring-2 ring-white" : ""
                                            )}
                                            style={{ backgroundColor: colorSet.hex }}
                                        />
                                        <span className={cn(
                                            "text-sm font-medium truncate max-w-[140px] transition-colors",
                                            isSelected ? "text-white scale-105 origin-left" : "text-zinc-400"
                                        )} title={entry.name}>
                                            {entry.name}
                                        </span>
                                    </div>
                                    <div className="text-right flex items-baseline gap-2">
                                        <span className="text-sm font-bold text-white tracking-tight">
                                            {fmtMoney(entry.value || 0)}
                                        </span>
                                        <span className="text-[10px] font-bold text-zinc-500 w-[36px] text-right">
                                            {safeTotal > 0 ? Math.round(percent) : 0}%
                                        </span>
                                    </div>
                                </div>
                                {/* Progress Bar Background */}
                                <div className="w-full bg-zinc-800/50 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: `${percent}%`,
                                            backgroundColor: colorSet.hex,
                                            boxShadow: `0 0 10px ${colorSet.hex}40`
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {sortedData.length > 5 && (
                        <div className="text-center pt-1">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 hover:text-zinc-500 cursor-pointer transition-colors">
                                +{sortedData.length - 5} categorías adicionales
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

